"""Build compact, auditable game episodes from verified NASA raw records."""

from __future__ import annotations

import argparse
from datetime import timedelta
import hashlib
import json
from pathlib import Path

from fetch_donki import ENDPOINTS, RAW, PRIMARY, atomic_json, chunks
from joins import dt, iso, transform
from report import write_report, quantiles

ROOT = Path(__file__).resolve().parents[1]


def load_raw(raw=RAW):
    raw = Path(raw)
    manifest_path = raw / "manifest.json"
    if not manifest_path.exists():
        raise ValueError("No verified cache manifest. Fetch first, or import manual raw files with provenance.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = {endpoint: [] for endpoint in ENDPOINTS}
    expected = {f"{endpoint}/{first}_{last}.json" for first, last in chunks(dt(manifest["start"]).date(), dt(manifest["end"]).date()) for endpoint in ENDPOINTS}
    if not manifest.get("complete") or not expected.issubset(manifest["files"]):
        raise ValueError("Incomplete NASA cache; cannot claim GO from partial coverage.")
    for relative in sorted(expected):
        meta = manifest["files"][relative]
        path = raw / relative
        if not path.resolve().is_relative_to(raw.resolve()):
            raise ValueError("Cache path leaves the raw directory.")
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != meta["sha256"]:
            raise ValueError(f"Cache checksum mismatch: {relative}")
        rows = json.loads(content)
        if not isinstance(rows, list) or len(rows) != meta["count"]:
            raise ValueError(f"Invalid record cache: {relative}")
        records[meta["endpoint"]].extend(rows)
    return records, manifest


def showcase(data):
    windows = data["windows"]
    seps = {row["id"]: row for row in data["sepEvents"]}
    forecasts = {row["id"]: row for row in data["cmeForecasts"]}
    picks = []

    def add(key, window, why, event=None):
        if window:
            picks.append({"key": key, "why": why, "windowId": window["id"], "eventId": event or window["sepId"]})

    if not windows:
        return picks
    pairs = [(window, forecasts[identity]) for window in windows for identity in window["refs"]["cmeForecasts"] if forecasts[identity]["errorH"] is not None]
    if pairs:
        window, forecast = max(pairs, key=lambda pair: abs(pair[1]["errorH"]))
        add("biggest_miss", window, f"Recorded arrival differs from the first forecast by {abs(forecast['errorH']):g} hours.", forecast["id"])
        window, forecast = min(pairs, key=lambda pair: abs(pair[1]["errorH"]))
        add("near_perfect", window, f"Recorded arrival is within {abs(forecast['errorH']):g} hours of the first forecast.", forecast["id"])
    false = next(((window, forecasts[identity]) for window in windows for identity in window["refs"]["cmeForecasts"] if forecasts[identity]["outcome"] == "false_alarm"), None)
    if false:
        add("false_alarm", false[0], "An Earth arrival was forecast, but no linked Earth shock is recorded.", false[1]["id"])
    short = min(windows, key=lambda window: seps[window["sepId"]]["countdownMin"])
    long = max(windows, key=lambda window: seps[window["sepId"]]["countdownMin"])
    add("shortest_countdown", short, f"The recorded flare-to-particle gap is {seps[short['sepId']]['countdownMin']:g} minutes.")
    add("longest_countdown", long, f"The recorded flare-to-particle gap is {seps[long['sepId']]['countdownMin']:g} minutes.")
    after = [window for window in windows if (seps[window["sepId"]]["alertLagMin"] or 0) > 0]
    if after:
        late = max(after, key=lambda window: seps[window["sepId"]]["alertLagMin"])
        add("alert_after_onset", late, f"The first attached alert was sent {seps[late['sepId']]['alertLagMin']:g} minutes after onset.")
    judge = next((window for window in windows if window["sepId"] == "2024-05-11T02:10:00-SEP-001"), None)
    judge = judge or (min(after, key=lambda window: abs(seps[window["sepId"]]["countdownMin"] - 60)) if after else windows[0])
    add("best_judge", judge, "Verified flare, particle onset, alert, and a playable forecast window for the judge path.")
    for prefix in ("2012-03", "2017-09", "2024-05"):
        historic = [window for window in windows if window["start"].startswith(prefix)]
        if historic:
            window = max(historic, key=lambda window: len(window["refs"]["cmeForecasts"]))
            add("historic_" + prefix, window, f"A real {prefix} window with {len(window['refs']['cmeForecasts'])} first-run Earth forecasts.")
    return picks


def compact(data, picks):
    """Ship only records needed by playable windows and their linked flares."""
    result = {key: list(rows) for key, rows in data.items()}
    refs = {key: set().union(*(set(window["refs"][key]) for window in data["windows"])) if data["windows"] else set() for key in ("flares", "sepEvents", "cmeForecasts", "surpriseArrivals")}
    sep_by_id = {row["id"]: row for row in data["sepEvents"]}
    refs["flares"].update(sep_by_id[identity]["flareId"] for identity in refs["sepEvents"] if sep_by_id[identity]["flareId"])
    for key in refs:
        result[key] = [row for row in data[key] if row["id"] in refs[key]]
    result["showcase"] = picks
    return result


def validate(data):
    """Referential integrity, chronological bounds, and no synthetic source IDs."""
    maps = {}
    for key in ("flares", "sepEvents", "cmeForecasts", "surpriseArrivals", "windows"):
        maps[key] = {row["id"]: row for row in data[key]}
        if len(maps[key]) != len(data[key]):
            raise ValueError(f"Duplicate public IDs in {key}.")
        if any(identity.startswith("mock-") for identity in maps[key]):
            raise ValueError("Mock records cannot enter NASA episodes.")
    for sep in data["sepEvents"]:
        if sep["flareId"] and sep["flareId"] not in maps["flares"]:
            raise ValueError("SEP references a missing flare.")
        if any(name.upper().startswith(("MODEL:", "STEREO")) for name in sep["instruments"]):
            raise ValueError("Model/STEREO row entered near-Earth detection.")
    for window in data["windows"]:
        if window["sepId"] not in maps["sepEvents"] or dt(window["end"]) - dt(window["start"]) != timedelta(days=14):
            raise ValueError("Invalid playable window.")
        if not window["refs"]["cmeForecasts"]:
            raise ValueError("Window has no issued Earth forecast.")
        for key, identities in window["refs"].items():
            if not set(identities).issubset(maps[key]):
                raise ValueError(f"Dangling window references: {key}.")
    for pick in data["showcase"]:
        if pick["windowId"] not in maps["windows"]:
            raise ValueError("Showcase references missing window.")


def build(raw=RAW, output=ROOT / "public/data", report_dir=ROOT / "data-pipeline"):
    records, manifest = load_raw(raw)
    full, rates, audit, detail = transform(records, manifest["end"], manifest["completed"])
    picks = showcase(full)
    data = compact(full, picks)
    errors = [row["errorH"] for row in full["cmeForecasts"] if row["errorH"] is not None]
    data = {
        "meta": {"generated": manifest["completed"], "source": "NASA/CCMC DONKI", "attribution": "NASA GSFC Moon to Mars Space Weather Analysis Office and CCMC; research-quality DONKI records, not operational warnings.", "range": [manifest["start"], manifest["end"]]},
        "stats": {"cmeErrorHours": quantiles(errors), "flareSepRate": rates},
        **data,
    }
    validate(data)
    content = json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    if len(content) >= 1_500_000:
        raise ValueError(f"episodes.json exceeds 1.5 MB: {len(content)} bytes. Do not silently discard records.")
    output = Path(output)
    atomic_json(output / "episodes.json", data)
    atomic_json(output / "showcase.json", picks)
    report_dir = Path(report_dir)
    report_dir.mkdir(parents=True, exist_ok=True)
    atomic_json(report_dir / "report/join-audit.json", {"counts": dict(audit), **detail})
    summary = write_report(full, data, records, manifest, audit, detail, report_dir, len(content))
    print(summary["line"], flush=True)
    print(f"Public payload: {len(content):,} bytes; {len(data['windows'])} playable windows.", flush=True)
    return data, summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=RAW)
    args = parser.parse_args()
    _, summary = build(args.raw)
    raise SystemExit(0 if summary["go"] else 2)


if __name__ == "__main__":
    main()
