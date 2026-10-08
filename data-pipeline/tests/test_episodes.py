"""Validate the committed real-data artifact once prompt 2 has produced it."""

import json
from pathlib import Path

import pytest

from build_episodes import validate
from joins import dt

ROOT = Path(__file__).resolve().parents[2]


def test_committed_episodes_have_valid_references_and_source_math():
    path = ROOT / "public/data/episodes.json"
    if not path.exists():
        pytest.skip("Full NASA download is still running.")
    content = path.read_bytes()
    assert len(content) < 1_500_000
    data = json.loads(content)
    validate(data)
    flares = {row["id"]: row for row in data["flares"]}
    for sep in data["sepEvents"]:
        if sep["flareId"]:
            gap = (dt(sep["onset"]) - dt(flares[sep["flareId"]]["begin"])).total_seconds() / 60
            assert sep["countdownMin"] == pytest.approx(gap, abs=0.001)
        if sep["alertTime"]:
            lag = (dt(sep["alertTime"]) - dt(sep["onset"])).total_seconds() / 60
            assert sep["alertLagMin"] == pytest.approx(lag, abs=0.001)
    for forecast in data["cmeForecasts"]:
        if forecast["actual"]:
            error = (dt(forecast["actual"]) - dt(forecast["predicted"])).total_seconds() / 3600
            assert forecast["errorH"] == pytest.approx(error, abs=0.0001)
            assert forecast["outcome"] == ("hit" if abs(error) <= 30 else "miss")
        else:
            assert forecast["errorH"] is None
            assert forecast["outcome"] == "false_alarm"
    assert data["showcase"] == json.loads((ROOT / "public/data/showcase.json").read_text())
