"""One-command NASA pipeline, with verified GitHub-runner fallback."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def prepare_python():
    """Use the project's isolated environment; bootstrap if dependencies are absent."""
    venv = ROOT / ".venv"
    executable = venv / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if executable.exists() and Path(sys.executable).resolve() != executable.resolve():
        raise SystemExit(subprocess.call([str(executable), str(Path(__file__).resolve()), *sys.argv[1:]]))
    if all(importlib.util.find_spec(name) for name in ("requests", "pandas", "matplotlib", "pytest")):
        return
    if not executable.exists():
        subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
    subprocess.run([str(executable), "-m", "pip", "install", "-r", str(ROOT / "data-pipeline/requirements.txt")], check=True)
    raise SystemExit(subprocess.call([str(executable), str(Path(__file__).resolve()), *sys.argv[1:]]))


def gh(*args, json_output=False):
    result = subprocess.run(["gh", *args], cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout) if json_output else result.stdout


def cloud_cache(start, end, raw, attempt=0):
    if not shutil.which("gh"):
        raise RuntimeError("Local NASA route is unavailable. Install/authenticate GitHub CLI for the runner fallback, or supply a verified raw cache and use --offline.")
    repo = gh("repo", "view", "--json", "nameWithOwner", json_output=True)["nameWithOwner"]
    runs = gh("run", "list", "--repo", repo, "--workflow", "data.yml", "--limit", "10", "--json", "databaseId,status,conclusion,createdAt", json_output=True)
    active = next((run for run in runs if run["status"] in ("in_progress", "queued", "pending")), None)
    if not active:
        gh("workflow", "run", "data.yml", "--repo", repo, "-f", f"start={start}", "-f", f"end={end}")
        time.sleep(4)
        runs = gh("run", "list", "--repo", repo, "--workflow", "data.yml", "--limit", "10", "--json", "databaseId,status,conclusion,createdAt", json_output=True)
        active = runs[0]
    identity = str(active["databaseId"])
    print(f"CLOUD FETCH: https://github.com/{repo}/actions/runs/{identity}", flush=True)
    deadline = time.monotonic() + 90 * 60
    while time.monotonic() < deadline:
        run = gh("run", "view", identity, "--repo", repo, "--json", "status,conclusion", json_output=True)
        if run["status"] == "completed":
            break
        print(f"CLOUD FETCH {identity}: {run['status']}; downloading after checksum manifest is complete.", flush=True)
        time.sleep(30)
    else:
        raise RuntimeError("Cloud fetch exceeded 90 minutes; cached chunks remain available in the workflow.")
    destination = raw / ("github-" + identity)
    if not (destination / "manifest.json").exists():
        gh("run", "download", identity, "--repo", repo, "--name", "nasa-raw-cache", "--dir", str(destination))
    manifest = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
    if run["conclusion"] != "success" or not manifest.get("complete"):
        if attempt < 2:
            print("Cloud fetch incomplete; retrying with retained cache.", flush=True)
            return cloud_cache(start, end, raw, attempt + 1)
        raise RuntimeError("Cloud fetch was incomplete after three attempts. Partial raw cache was retained.")
    if manifest["start"] != start or manifest["end"] != end:
        if attempt < 2:
            return cloud_cache(start, end, raw, attempt + 1)
        raise RuntimeError("Cloud workflows returned a different date range after three attempts.")
    # Artifact transport is GitHub; source remains the official NASA URLs in manifest.
    for relative in manifest["files"]:
        source, target = destination / relative, raw / relative
        if not source.resolve().is_relative_to(destination.resolve()) or not target.resolve().is_relative_to(raw.resolve()):
            raise ValueError("Unsafe artifact cache path.")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    shutil.copyfile(destination / "manifest.json", raw / "manifest.json")


def main():
    prepare_python()
    import requests
    from fetch_donki import PRIMARY, RAW, fetch
    from build_episodes import build, load_raw

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2010-01-01")
    parser.add_argument("--end", default=datetime.now(timezone.utc).date().isoformat())
    parser.add_argument("--offline", action="store_true", help="Rebuild from verified raw cache, no NASA requests.")
    parser.add_argument("--cloud", action="store_true", help="Force GitHub-runner fetch.")
    parser.add_argument("--raw", type=Path, default=RAW)
    args = parser.parse_args()
    subprocess.run([sys.executable, "-m", "pytest", str(ROOT / "data-pipeline/tests"), "-q"], check=True)
    cached = False
    if (args.raw / "manifest.json").exists():
        try:
            _, manifest = load_raw(args.raw)
            cached = manifest["start"] == args.start and manifest["end"] == args.end
        except (ValueError, OSError):
            pass
    if args.offline and not cached:
        raise RuntimeError("Offline mode requires a complete verified cache matching --start and --end.")
    if not cached and not args.offline:
        reachable = False
        if not args.cloud:
            try:
                response = requests.get(PRIMARY + "SEP", params={"startDate": "2024-05-11", "endDate": "2024-05-11"}, timeout=(3, 10), allow_redirects=False)
                reachable = response.status_code == 200 and isinstance(response.json(), list)
            except (requests.RequestException, ValueError):
                pass
        if reachable:
            fetch(args.start, args.end, args.raw)
        else:
            print("Local NASA HTTPS route unavailable. Using official-source GitHub runner cache.", flush=True)
            cloud_cache(args.start, args.end, args.raw)
    _, summary = build(args.raw)
    print("NASA pipeline finished. Game engine remains the prompt 1 mock until prompt 3.", flush=True)
    raise SystemExit(0 if summary["go"] else 2)


if __name__ == "__main__":
    main()
