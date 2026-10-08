"""Fetch official DONKI JSON in resumable, rate-limited 30-day chunks."""

from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import time

import requests

ENDPOINTS = ("FLR", "SEP", "CME", "IPS", "WSAEnlilSimulations", "notifications")
PRIMARY = "https://ccmc.gsfc.nasa.gov/DONKI-API/get/"
FALLBACK = "https://api.nasa.gov/DONKI/"
RAW = Path(__file__).resolve().parent / "raw"


def chunks(start: date, end: date):
    """Inclusive dates, no gaps or overlaps, at most 30 days per request."""
    while start <= end:
        stop = min(start + timedelta(days=29), end)
        yield start.isoformat(), stop.isoformat()
        start = stop + timedelta(days=1)


def atomic_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, separators=(",", ":"), ensure_ascii=False, allow_nan=False), encoding="utf-8")
    temporary.replace(path)


def fetch(start="2010-01-01", end=None, raw=RAW, delay=1.0, refresh=False):
    end = end or datetime.now(timezone.utc).date().isoformat()
    start_date, end_date = date.fromisoformat(start), date.fromisoformat(end)
    if start_date > end_date:
        raise ValueError("Start must precede end.")
    if delay < 1:
        raise ValueError("Keep at least one second between NASA requests.")
    raw = Path(raw)
    manifest_path = raw / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"files": {}}
    manifest.update({"start": start, "end": end, "source": PRIMARY, "complete": False})
    atomic_json(manifest_path, manifest)
    session = requests.Session()
    session.headers.update({"User-Agent": "ShelterCall-educational-data/0.2", "Accept": "application/json"})
    periods = list(chunks(start_date, end_date))
    total = len(periods) * len(ENDPOINTS)
    completed = 0
    last_request = 0.0
    key = os.environ.get("NASA_API_KEY")
    for first, last in periods:
        for endpoint in ENDPOINTS:
            relative = f"{endpoint}/{first}_{last}.json"
            path = raw / relative
            previous = manifest["files"].get(relative)
            if not refresh and path.exists() and previous:
                if hashlib.sha256(path.read_bytes()).hexdigest() == previous["sha256"]:
                    completed += 1
                    continue
            data, source, errors = None, None, []
            routes = [(PRIMARY, {})] + ([(FALLBACK, {"api_key": key})] if key else [])
            for base, credentials in routes:
                for attempt in range(4):
                    time.sleep(max(0, delay - (time.monotonic() - last_request)))
                    last_request = time.monotonic()
                    try:
                        response = session.get(base + endpoint, params={"startDate": first, "endDate": last, **credentials}, timeout=(12, 90), allow_redirects=False)
                        response.raise_for_status()
                        if response.is_redirect:
                            raise ValueError("API redirected instead of returning data")
                        data = response.json()
                        if data is None:
                            data = []
                        if not isinstance(data, list) or not all(isinstance(row, dict) for row in data):
                            raise ValueError("API did not return a record array")
                        source = base
                        break
                    except (requests.RequestException, ValueError) as error:
                        # Never log URLs or exceptions that could contain an API key.
                        status = getattr(getattr(error, "response", None), "status_code", None)
                        errors.append(f"{base} {type(error).__name__} HTTP {status}")
                        if attempt < 3:
                            time.sleep(2 ** attempt)
                if source:
                    break
            if source is None:
                raise RuntimeError(f"NASA fetch failed for {endpoint} {first}..{last}: {'; '.join(errors)}. Use the GitHub data workflow or verified offline raw cache.")
            atomic_json(path, data)
            manifest["files"][relative] = {"endpoint": endpoint, "start": first, "end": last, "source": source, "count": len(data), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "fetched": datetime.now(timezone.utc).isoformat()}
            completed += 1
            atomic_json(manifest_path, manifest)
            if completed % 6 == 0 or completed == total:
                print(f"FETCH {completed}/{total}: through {last}", flush=True)
    manifest.update({"complete": True, "completed": datetime.now(timezone.utc).isoformat()})
    atomic_json(manifest_path, manifest)
    print(f"FETCH COMPLETE: {completed} verified cache files, {start}..{end}", flush=True)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2010-01-01")
    parser.add_argument("--end")
    parser.add_argument("--raw", type=Path, default=RAW)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    fetch(args.start, args.end, args.raw, refresh=args.refresh)


if __name__ == "__main__":
    main()
