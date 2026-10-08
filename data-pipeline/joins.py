"""Conservative joins for DONKI records. No simulated science enters this module."""

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import re


def dt(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError, AttributeError):
        return None


def iso(value):
    if not value:
        return None
    return value.isoformat(timespec="seconds" if value.second else "minutes").replace("+00:00", "Z")


def links(row):
    return {entry.get("activityID") for entry in row.get("linkedEvents") or [] if entry.get("activityID")}


def names(row):
    return [entry.get("displayName", "") for entry in row.get("instruments") or []]


def unique(rows, key, audit):
    """Retain newest record version on overlapping API responses."""
    result = {}
    for row in rows:
        identity = row.get(key)
        if not identity:
            audit["missing_record_id"] += 1
            continue
        if identity in result:
            audit["duplicate_records"] += 1
        rank = lambda record: (record.get("versionId") or 0, record.get("submissionTime") or "")
        if identity not in result or rank(row) > rank(result[identity]):
            result[identity] = row
    return result


def build_flares(rows, audit):
    raw = unique(rows, "flrID", audit)
    flares = []
    for identity, row in sorted(raw.items()):
        begin = dt(row.get("beginTime"))
        if not begin:
            audit["flare_missing_begin"] += 1
            continue
        flares.append({"id": identity, "begin": iso(begin), "peak": iso(dt(row.get("peakTime"))), "class": row.get("classType") or "unknown"})
    return flares, raw


def build_seps(rows, flares, raw_flares, audit, detail):
    by_id = {row["id"]: row for row in flares}
    raw = unique(rows, "sepID", audit)
    reverse = defaultdict(set)
    for identity, flare in raw_flares.items():
        for sep_id in links(flare):
            if "-SEP-" in sep_id:
                reverse[sep_id].add(identity)
    models, detections = [], []
    for row in raw.values():
        instrument_names = names(row)
        onset = dt(row.get("eventTime"))
        flare_ids = {identity for identity in links(row) | reverse[row["sepID"]] if identity in by_id}
        entry = {"row": row, "time": onset, "flares": flare_ids}
        model_names = [name for name in instrument_names if name.upper().startswith("MODEL:")]
        if model_names:
            models.append(entry)
            audit["sep_model_rows"] += 1
            detail["models"].append({"id": row["sepID"], "time": iso(onset), "instruments": model_names, "flareIds": sorted(flare_ids)})
        earth_names = [name for name in instrument_names if not name.upper().startswith("MODEL:") and re.match(r"^(GOES(?:\d+)?|SOHO|ACE)(?:\b|[-:])", name, re.I)]
        if not earth_names:
            if not model_names:
                audit["sep_non_near_earth_rows"] += 1
            continue
        if not onset:
            audit["sep_missing_onset"] += 1
            continue
        entry["instruments"] = earth_names
        earlier = [identity for identity in flare_ids if dt(by_id[identity]["begin"]) < onset]
        entry["anchor"] = max(earlier, key=lambda identity: dt(by_id[identity]["begin"])) if earlier else None
        detections.append(entry)
    groups = []
    for entry in sorted(detections, key=lambda value: (value["time"], value["row"]["sepID"])):
        # Heuristic: same latest linked flare, onsets within six hours of first.
        # Unlinked rows merge only at equal times; never infer a causal link.
        group = next((group for group in reversed(groups) if group[0]["anchor"] == entry["anchor"] and ((entry["anchor"] and entry["time"] - group[0]["time"] <= timedelta(hours=6)) or entry["time"] == group[0]["time"])), None)
        if group is None:
            groups.append([entry])
        else:
            group.append(entry)
    events, associated_flares = [], set()
    for group in groups:
        onset = group[0]["time"]
        flare_ids = set().union(*(entry["flares"] for entry in group))
        earlier = [identity for identity in flare_ids if dt(by_id[identity]["begin"]) < onset]
        flare_id = max(earlier, key=lambda identity: dt(by_id[identity]["begin"])) if earlier else None
        associated_flares.update(earlier)
        instruments = sorted({name for entry in group for name in entry["instruments"]})
        tier = 3 if any(re.search(r">\s*100\s*MeV", name, re.I) for name in instruments) else 2 if any(name.upper().startswith("GOES") and re.search(r">\s*10\s*MeV", name, re.I) for name in instruments) else 1
        alerts = [dt(notification.get("messageIssueTime")) for entry in group for notification in entry["row"].get("sentNotifications") or []]
        alerts = [alert for alert in alerts if alert]
        alert = min(alerts) if alerts else None
        predictions = [model for model in models if model["time"] and model["time"] <= onset and model["flares"] & flare_ids]
        model = max(predictions, key=lambda value: value["time"]) if predictions else None
        event = {"id": group[0]["row"]["sepID"], "onset": iso(onset), "tier": tier, "flareId": flare_id, "countdownMin": round((onset - dt(by_id[flare_id]["begin"])).total_seconds() / 60, 3) if flare_id else None, "alertTime": iso(alert), "alertLagMin": round((alert - onset).total_seconds() / 60, 3) if alert else None, "modelLeadMin": round((onset - model["time"]).total_seconds() / 60, 3) if model else None, "instruments": instruments}
        events.append(event)
        detail["sepGroups"].append({"id": event["id"], "members": [entry["row"]["sepID"] for entry in group], "flareIds": sorted(flare_ids), "modelId": model["row"]["sepID"] if model else None})
        if not flare_id:
            audit["sep_no_valid_countdown"] += 1
        if not alert:
            audit["sep_no_alert"] += 1
    audit["sep_grouped_channel_rows"] = len(detections) - len(events)
    return events, associated_flares


def build_forecasts(sim_rows, cme_rows, ips_rows, cutoff, audit, detail):
    cmes = unique(cme_rows, "activityID", audit)
    simulations = unique(sim_rows, "simulationID", audit)
    ips = unique(ips_rows, "activityID", audit)
    earth = {identity: row for identity, row in ips.items() if str(row.get("location", "")).lower() == "earth" and dt(row.get("eventTime"))}
    arrivals = defaultdict(set)
    for identity, row in earth.items():
        for cme_id in links(row):
            if "-CME-" in cme_id:
                arrivals[cme_id].add(identity)
    for identity, row in cmes.items():
        arrivals[identity].update(links(row) & earth.keys())
    for simulation in simulations.values():
        for entry in simulation.get("cmeInputs") or []:
            for shock in entry.get("ipsList") or []:
                identity = shock.get("activityID")
                if identity and str(shock.get("location", "")).lower() == "earth" and dt(shock.get("eventTime")):
                    earth.setdefault(identity, shock)
                    if entry.get("CMEID"):
                        arrivals[entry["CMEID"]].add(identity)
    candidates = defaultdict(list)
    for identity, simulation in sorted(simulations.items()):
        issued = dt(simulation.get("modelCompletionTime"))
        # This top-level field is Earth's arrival. impactList often omits Earth.
        # Never substitute Mars/STEREO impact times.
        predicted = dt(simulation.get("estimatedShockArrivalTime"))
        if not predicted:
            earth_impacts = [impact for impact in simulation.get("impactList") or [] if str(impact.get("location", "")).lower() == "earth"]
            predicted = dt(earth_impacts[0].get("arrivalTime")) if earth_impacts else None
        if not issued or not predicted:
            audit["sim_no_earth_prediction_or_issue"] += 1
            continue
        if predicted <= issued:
            audit["sim_prediction_not_future"] += 1
            continue
        for entry in simulation.get("cmeInputs") or []:
            cme_id = entry.get("CMEID")
            if not cme_id:
                audit["sim_missing_cme_id"] += 1
                continue
            candidates[cme_id].append((issued, identity, predicted))
    selected = defaultdict(list)
    for cme_id, runs in sorted(candidates.items()):
        runs.sort()
        first = runs[0]
        selected[first[1]].append(cme_id)
        detail["revisions"].append({"cmeId": cme_id, "firstSimulationId": first[1], "laterSimulationIds": list(dict.fromkeys(run[1] for run in runs[1:]))})
    forecasts, covered_ips = [], set()
    for identity, input_ids in sorted(selected.items()):
        issued, _, predicted = next(run for run in candidates[input_ids[0]] if run[1] == identity)
        linked_ips = set().union(*(arrivals[cme_id] for cme_id in input_ids))
        valid_ips = [shock_id for shock_id in linked_ips if dt(earth[shock_id]["eventTime"]) > issued and dt(earth[shock_id]["eventTime"]) < cutoff]
        if linked_ips and not valid_ips:
            audit["forecast_retrospective_or_out_of_range"] += 1
            continue
        if len(valid_ips) > 1:
            audit["forecast_ambiguous_earth_arrivals"] += 1
            continue
        actual_id = valid_ips[0] if valid_ips else None
        actual = dt(earth[actual_id]["eventTime"]) if actual_id else None
        if not actual and predicted + timedelta(hours=30) >= cutoff:
            audit["forecast_right_censored"] += 1
            continue
        raw_error = (actual - predicted).total_seconds() / 3600 if actual else None
        error = round(raw_error, 4) if actual else None
        outcome = "hit" if actual and abs(raw_error) <= 30 else "miss" if actual else "false_alarm"
        # A shared multi-CME simulation is one prediction, not duplicate evidence.
        kp_values = [simulations[identity].get(key) for key in ("kp_18", "kp_90", "kp_135", "kp_180")]
        kp_values = [float(value) for value in kp_values if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 9]
        kp_range = [min(kp_values), max(kp_values)] if kp_values else None
        forecasts.append({"id": identity, "cmeId": sorted(input_ids)[0], "issued": iso(issued), "predicted": iso(predicted), "actual": iso(actual), "outcome": outcome, "errorH": error, "kpRange": kp_range})
        detail["forecastJoins"].append({"id": identity, "cmeIds": sorted(input_ids), "ipsId": actual_id})
        if actual_id:
            covered_ips.add(actual_id)
    # A revision issued before a shock prevents calling that shock a surprise,
    # even when the revision is not the first forecast used for game scoring.
    for cme_id, shock_ids in arrivals.items():
        for shock_id in shock_ids:
            if any(run[0] < dt(earth[shock_id]["eventTime"]) for run in candidates[cme_id]):
                covered_ips.add(shock_id)
    surprises = [{"id": identity, "time": iso(dt(row["eventTime"]))} for identity, row in sorted(earth.items()) if identity not in covered_ips and dt(row["eventTime"]) < cutoff]
    return sorted(forecasts, key=lambda row: (row["issued"], row["id"])), sorted(surprises, key=lambda row: row["time"])


def build_windows(seps, flares, forecasts, surprises, cutoff):
    windows = []
    for sep in seps:
        if sep["countdownMin"] is None or sep["countdownMin"] <= 0:
            continue
        start = dt(sep["onset"])
        end = start + timedelta(days=14)
        if end > cutoff:
            continue
        inside = lambda value: value is not None and start <= dt(value) < end
        refs = {
            "flares": [row["id"] for row in flares if inside(row["begin"]) or row["id"] == sep["flareId"]],
            "sepEvents": [row["id"] for row in seps if inside(row["onset"])],
            "cmeForecasts": [row["id"] for row in forecasts if inside(row["issued"]) or inside(row["actual"]) or inside(row["predicted"])],
            "surpriseArrivals": [row["id"] for row in surprises if inside(row["time"])],
        }
        if any(inside(row["issued"]) for row in forecasts):
            windows.append({"id": sep["id"].replace("-SEP-", "-WINDOW-"), "sepId": sep["id"], "start": iso(start), "end": iso(end), "refs": refs})
    return windows


def transform(raw, end, as_of=None):
    audit = Counter()
    detail = {"models": [], "sepGroups": [], "revisions": [], "forecastJoins": []}
    cutoff = dt(end + "T00:00Z") + timedelta(days=1)
    if as_of:
        cutoff = min(cutoff, dt(as_of))
    flares, raw_flares = build_flares(raw.get("FLR", []), audit)
    seps, associated = build_seps(raw.get("SEP", []), flares, raw_flares, audit, detail)
    forecasts, surprises = build_forecasts(raw.get("WSAEnlilSimulations", []), raw.get("CME", []), raw.get("IPS", []), cutoff, audit, detail)
    windows = build_windows(seps, flares, forecasts, surprises, cutoff)
    rates = {}
    for letter in ("C", "M", "X"):
        group = [row for row in flares if row["class"].startswith(letter)]
        rates[letter] = round(sum(row["id"] in associated for row in group) / len(group), 6) if group else None
    return {"flares": flares, "sepEvents": seps, "cmeForecasts": forecasts, "surpriseArrivals": surprises, "windows": windows}, rates, audit, detail
