"""Generate the prompt 2 evidence report and standalone research plots."""

from collections import Counter
from datetime import timedelta
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from joins import dt


def quantiles(values):
    if not values:
        return {"median": None, "p25": None, "p75": None}
    series = pd.Series(values, dtype=float)
    return {key: round(float(series.quantile(q)), 4) for key, q in (("median", 0.5), ("p25", 0.25), ("p75", 0.75))}


def frequencies(full, windows):
    times = {
        "flares": [dt(row["begin"]) for row in full["flares"]],
        "particles": [dt(row["onset"]) for row in full["sepEvents"]],
        "forecasts": [dt(row["issued"]) for row in full["cmeForecasts"]],
        "arrivals": [dt(row["actual"]) for row in full["cmeForecasts"] if row["actual"]] + [dt(row["time"]) for row in full["surpriseArrivals"]],
    }
    result = {key: [] for key in [*times, "total"]}
    # Count physical arrival times once even if several first forecasts link it.
    times["arrivals"] = sorted(set(times["arrivals"]))
    for start, end in windows:
        counts = {key: sum(start <= time < end for time in values) for key, values in times.items()}
        for key, value in counts.items():
            result[key].append(value)
        result["total"].append(sum(counts.values()))
    return {key: {"median": float(pd.Series(values).median()), "min": min(values), "max": max(values)} if values else {"median": None, "min": None, "max": None} for key, values in result.items()}


def plot_hist(values, title, xlabel, output):
    figure, axis = plt.subplots(figsize=(8, 4.5), layout="constrained")
    if values:
        axis.hist(values, bins=min(35, max(5, len(values) // 8)), color="#315a76", edgecolor="white")
    else:
        axis.text(0.5, 0.5, "No usable records", transform=axis.transAxes, ha="center")
    axis.set(title=title, xlabel=xlabel, ylabel="Joined record count")
    axis.grid(axis="y", alpha=0.15)
    figure.savefig(output, dpi=150)
    plt.close(figure)


def write_report(full, shipped, raw, manifest, audit, detail, directory, size):
    directory = Path(directory)
    plots = directory / "report"
    plots.mkdir(parents=True, exist_ok=True)
    public_forecasts = {row["id"] for row in shipped["cmeForecasts"]}
    clean_pairs = len({row["ipsId"] for row in detail["forecastJoins"] if row["ipsId"] and row["id"] in public_forecasts})
    all_pairs = len({row["ipsId"] for row in detail["forecastJoins"] if row["ipsId"]})
    countdowns = sum(row["countdownMin"] is not None and row["countdownMin"] > 0 for row in shipped["sepEvents"])
    go = clean_pairs >= 40 and countdowns >= 40 and len(shipped["windows"]) >= 30
    line = f"{'GO' if go else 'NO-GO'}: {clean_pairs} independent clean CME-arrival pairs (need 40); {countdowns} clean countdowns (need 40); {len(shipped['windows'])} playable windows (need 30)."
    countdown_values = [row["countdownMin"] for row in full["sepEvents"] if row["countdownMin"] is not None]
    alert_values = [row["alertLagMin"] for row in full["sepEvents"] if row["alertLagMin"] is not None]
    errors = [row["errorH"] for row in full["cmeForecasts"] if row["errorH"] is not None]
    plot_hist(countdown_values, "Recorded flare-to-particle countdowns", "Minutes from linked flare start to near-Earth onset", plots / "countdown-minutes.png")
    plot_hist(alert_values, "Attached DONKI alert lag", "Minutes from onset to earliest attached alert (positive = later)", plots / "alert-lag.png")
    plot_hist(errors, "First Earth forecast arrival error", "Actual minus predicted arrival, hours (positive = late)", plots / "forecast-error.png")
    yearly = {key: Counter() for key in ("flares", "particles", "forecasts", "surprises")}
    for key, rows, field in (("flares", full["flares"], "begin"), ("particles", full["sepEvents"], "onset"), ("forecasts", full["cmeForecasts"], "issued"), ("surprises", full["surpriseArrivals"], "time")):
        yearly[key].update(row[field][:4] for row in rows)
    start, cutoff = dt(manifest["start"]), dt(manifest["end"]) + timedelta(days=1)
    calendar = []
    cursor = start
    while cursor + timedelta(days=12) <= cutoff:
        calendar.append((cursor, cursor + timedelta(days=12)))
        cursor += timedelta(days=12)
    playable = [(dt(window["start"]), dt(window["start"]) + timedelta(days=12)) for window in full["windows"]]
    lines = [
        "# NASA DONKI pipeline report", "", line, "",
        f"Source: [{manifest['source']}]({manifest['source']})", "",
        f"UTC query range: {manifest['start']} through {manifest['end']} inclusive. Fetch completed: {manifest['completed']}.",
        f"All {len(manifest['files'])} cached chunks have SHA-256 provenance. Raw cache remains ignored by Git.", "",
        "## Counts", "",
        "| Joined category | Full archive | Shipped playable subset |", "| --- | ---: | ---: |",
    ]
    for key in ("flares", "sepEvents", "cmeForecasts", "surpriseArrivals", "windows"):
        lines.append(f"| {key} | {len(full[key])} | {len(shipped[key])} |")
    lines += [f"| Independent linked Earth arrivals | {all_pairs} | {clean_pairs} |", "",
              f"episodes.json: {size:,} bytes; limit <1,500,000 bytes. Flare association rates and forecast-error percentiles use the full archive, not the playable subset.", "",
              "## Counts per year", "", "| Year | Flares | Grouped near-Earth SEP events | First Earth forecasts | Surprise Earth shocks |", "| --- | ---: | ---: | ---: | ---: |"]
    for year in range(start.year, cutoff.year + 1):
        lines.append(f"| {year} | " + " | ".join(str(yearly[key][str(year)]) for key in yearly) + " |")
    lines += ["", "## Distributions", "",
              f"- Countdown minutes: {quantiles(countdown_values)}.",
              f"- Alert lag minutes: {quantiles(alert_values)}.",
              f"- Signed forecast error hours (actual minus predicted): {quantiles(errors)}.",
              f"- Absolute forecast error hours: {quantiles([abs(error) for error in errors])}.",
              f"- Forecast outcomes: {dict(Counter(row['outcome'] for row in full['cmeForecasts']))}.", "",
              "![Countdown histogram](report/countdown-minutes.png)", "",
              "![Alert lag histogram](report/alert-lag.png)", "",
              "![Forecast error histogram](report/forecast-error.png)", "",
              "## Events in a 12-day window", "",
              "Full-archive calendar windows are non-overlapping 12-day spans from 2010-01-01; incomplete tail omitted. Playable windows use their first 12 days. Counts include flare starts, grouped particle onsets, forecast issues, and unique shock arrival times.", "",
              "| Sample | Event type | Median | Min | Max |", "| --- | --- | ---: | ---: | ---: |"]
    for label, intervals in (("Calendar", calendar), ("Playable", playable)):
        for kind, stats in frequencies(full, intervals).items():
            lines.append(f"| {label} | {kind} | {stats['median']} | {stats['min']} | {stats['max']} |")
    lines += ["", "## Showcase", "", "| Key | Why | Window | Event |", "| --- | --- | --- | --- |"]
    for pick in shipped["showcase"]:
        lines.append(f"| {pick['key']} | {pick['why']} | {pick['windowId']} | {pick['eventId']} |")
    may11 = next((row for row in full["sepEvents"] if row["id"] == "2024-05-11T02:10:00-SEP-001"), None)
    lines += ["", "## May 11, 2024 source sanity check", "",
              f"Joined source record: {may11}." if may11 else "Required source record was not found. Tests separately enforce the archived must-pass case.", "",
              "## Assumptions and data problems", "",
                "- Forecast kpRange is the minimum and maximum non-null numeric kp_18/kp_90/kp_135/kp_180 estimates from the selected first simulation. It is an IMF-scenario forecast range, not measured Kp; missing estimates stay null.",
              "- NASA moved the public API September 30, 2026. Local HTTPS requests time out; the official API works from GitHub Actions. The old api.nasa.gov DONKI route redirects to an announcement rather than JSON. No network or firewall settings were changed.",
              "- Fetch six endpoints in inclusive 30-day chunks, with at least one second between request starts, four attempts and exponential backoff. Reject HTML and redirects; never log API credentials. An interrupted cache cannot pass the coverage gate.",
              "- Duplicate IDs retain the newest version/submission. Current archive records may be revised long after the event; these are not immutable contemporaneous snapshots.",
              "- MODEL: instrument rows are predictions, never detections. Keep their IDs/times separately in report/join-audit.json. Near-Earth onset uses GOES, SOHO, or ACE only; STEREO is excluded.",
              "- Physical-event grouping is a conservative heuristic: same most-recent linked flare and detections within six hours of the first onset. Unlinked detections merge only at identical times. Different recent flares stay separate, including May 10 and May 11, 2024.",
              "- Countdown uses the latest linked flare start before the grouped onset, considering links in both directions. Missing links yield null countdowns and no playable window; no time is fabricated.",
              "- Alert lag uses only the earliest sentNotifications attached to detection-group members. Unlinked notification bodies are not parsed or guessed. Positive lag means the alert came later; null means no attached alert.",
              "- Relative tier is a game classification based on channel presence (>100 MeV, GOES >10 MeV, otherwise tier 1), not NOAA S-scale or a physical dose. Do not present a tier as an official NASA severity rating.",
              "- Model lead uses the latest pre-onset MODEL prediction sharing a documented flare link. It is an association, not guaranteed lead-time performance. Predictions after onset are preserved in audit but cannot become early warnings.",
              "- Earth's top-level estimatedShockArrivalTime is used even when impactList contains only other destinations. Read explicit Earth impact entries only as a fallback; never use Mars or STEREO arrival times.",
              "- Keep the first Earth-predicting simulation per CME. Record all revisions. A shared multi-CME simulation is one display forecast with a representative cmeId; all input aliases remain in audit. Count independent observed IPS IDs for the 40-pair gate to avoid inflating evidence.",
              "- Link actual Earth shocks through CME links, IPS reverse links, and simulation cmeInputs.ipsList. Ambiguous multiple arrivals, retrospective predictions, invalid dates, and incomplete forecast observation tails are excluded from clean pairs.",
              "- Forecast error is actual minus predicted. HIT requires an actual linked arrival and absolute error <=30 hours. An actual arrival outside that band is a timing MISS, not a false alarm. Schema outcome includes miss to preserve this distinction.",
              "- FALSE ALARM means no linked Earth arrival is recorded after the forecast observation period. It is a record-based classification, not proof that no solar wind disturbance occurred. Recent predictions with less than 30 hours past predicted arrival are censored.",
              "- An Earth IPS without any documented pre-arrival Earth forecast is a surprise; a pre-arrival revision prevents calling it a surprise even if not used for first-run game scoring. Not every shock is a particle event, and Earth timings are an explicit game proxy for the lunar setting.",
              "- Flare-to-SEP rates describe associations in the curated DONKI archive, not probabilities for all solar flares. Numerators use all documented earlier flare links to near-Earth detections; denominators use valid recorded flares of each class. Missing denominators produce null, never invented percentages.",
              "- A playable window begins at an SEP onset with a positive countdown and has a full 14 days of coverage plus at least one forecast issued inside it. Earlier forecasts with a prediction or actual arrival inside the window are retained so boundary-crossing hazards are not lost.",
              "- Public data contains the union of playable-window records plus linked countdown flares. The complete raw archive, full-archive statistics, model predictions, grouping members, revisions and join provenance remain in the cache/audit. No seed, dose, decay, game resources or invented events enter the real-data file.",
              "", "### Exclusions and quirks counted", "",
              "| Issue | Count |", "| --- | ---: |"]
    lines += [f"| {key} | {value} |" for key, value in sorted(audit.items())]
    lines += ["", "## How we use NASA data", "",
              "Shelter Call uses NASA's public DONKI records to find recorded solar flares, near-Earth particle detections, and Earth storm forecasts. We calculate how much time passed between a linked flare and its particle onset. We also compare the first recorded Earth arrival forecast with a linked observed shock.",
              "The game hides the dates during play and reveals them afterward. It keeps official event IDs so the records can be checked. Warning timing can be late, forecasts can miss, and some records have gaps. DONKI is research-quality information, not an operational safety service.",
              "Moon exposure, dose units, particle decay, shielding strength, food, power and crew outcomes are game approximations. Earth observations do not measure radiation at our fictional Moon outpost. The pipeline does not invent those rules or label model predictions as detections.",
              "", "## Sources", "",
              "- [NASA CCMC DONKI overview and research-use policy](https://ccmc.gsfc.nasa.gov/tools/DONKI/)",
              "- [NASA API migration announcement](https://ccmc.gsfc.nasa.gov/news/major-updates/)",
              "- [DONKI API reference](https://ccmc.gsfc.nasa.gov/DONKI/api/)",
              "- [May 2024 SEP records](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31)",
              "- [WSA-Enlil forecast verification study](https://arxiv.org/abs/1801.07818)", ""]
    (directory / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
    return {"go": go, "line": line, "cleanPairs": clean_pairs, "countdowns": countdowns, "windows": len(shipped["windows"])}
