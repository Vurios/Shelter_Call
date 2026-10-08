"""Archived NASA sanity case plus synthetic edge cases (not science records)."""

from collections import Counter
import json
from pathlib import Path

import pytest

from joins import build_forecasts, build_windows, dt, transform


def flare(identity="2024-05-11T01:10:00-FLR-001", begin="2024-05-11T01:10Z", kind="X1.0"):
    return {"flrID": identity, "beginTime": begin, "peakTime": begin, "classType": kind}


def sep(identity, time, instrument, flare_ids):
    return {"sepID": identity, "eventTime": time, "instruments": [{"displayName": instrument}], "linkedEvents": [{"activityID": value} for value in flare_ids]}


def test_archived_may11_source_case():
    raw = json.loads((Path(__file__).parent / "fixtures/may-2024.json").read_text(encoding="utf-8"))
    result, _, _, _ = transform(raw, "2024-05-31")
    event = next(row for row in result["sepEvents"] if row["id"] == "2024-05-11T02:10:00-SEP-001")
    assert event["countdownMin"] == 60
    assert event["alertLagMin"] == 20
    assert event["tier"] == 3
    assert event["onset"] == "2024-05-11T02:10Z"
    assert event["flareId"] == "2024-05-11T01:10:00-FLR-001"
    assert not any("STEREO" in name or "MODEL:" in name for name in event["instruments"])


def test_models_channels_reverse_links_and_recent_flare():
    flares = [flare("old", "2024-05-10T00:00Z", "C1.0"), flare("recent", "2024-05-11T01:10Z", "X1.0"), flare("future", "2024-05-11T03:00Z", "M1.0")]
    rows = [
        sep("model", "2024-05-11T01:30Z", "MODEL: REleASE:ACE", ["recent"]),
        sep("stereo", "2024-05-11T01:40Z", "STEREO A: IMPACT", ["recent"]),
        sep("first", "2024-05-11T02:10Z", "SOHO: COSTEP", ["old", "recent", "future"]),
        sep("channel", "2024-05-11T02:20Z", "GOES-P: >100 MeV", ["old", "recent"]),
    ]
    rows[3]["sentNotifications"] = [{"messageIssueTime": "2024-05-11T02:30Z"}]
    full, rates, audit, detail = transform({"FLR": flares, "SEP": rows}, "2024-05-31")
    assert len(full["sepEvents"]) == 1
    event = full["sepEvents"][0]
    assert event["flareId"] == "recent"
    assert event["countdownMin"] == 60
    assert event["alertLagMin"] == 20
    assert event["modelLeadMin"] == 40
    assert rates == {"C": 1.0, "M": 0.0, "X": 1.0}
    assert audit["sep_grouped_channel_rows"] == 1
    assert detail["models"][0]["id"] == "model"


def test_no_link_keeps_null_countdown_and_no_window():
    raw = {"SEP": [sep("orphan", "2024-05-11T02:10Z", "GOES-P: >10 MeV", [])]}
    full, rates, _, _ = transform(raw, "2024-05-31")
    assert full["sepEvents"][0]["countdownMin"] is None
    assert full["windows"] == []
    assert rates == {"C": None, "M": None, "X": None}


def test_legacy_goes13_names_are_near_earth_detections():
    raw = {"FLR": [flare()], "SEP": [sep("legacy-goes", "2024-05-11T02:10Z", "GOES13: SEM/EPS >100 MeV", ["2024-05-11T01:10:00-FLR-001"])]}
    full, _, _, _ = transform(raw, "2024-05-31")
    assert full["sepEvents"][0]["countdownMin"] == 60
    assert full["sepEvents"][0]["tier"] == 3


def forecast_inputs(actual="2024-05-04T06:00Z", predicted="2024-05-04T00:00Z"):
    cme_id = "2024-05-01T00:00:00-CME-001"
    shock = {"activityID": "shock", "location": "Earth", "eventTime": actual, "linkedEvents": [{"activityID": cme_id}]} if actual else None
    simulation = {"simulationID": "WSA-ENLIL/test/1", "modelCompletionTime": "2024-05-02T00:00Z", "estimatedShockArrivalTime": predicted, "impactList": [{"location": "Mars", "arrivalTime": "2024-05-03T00:00Z"}], "cmeInputs": [{"CMEID": cme_id, "ipsList": [shock] if shock else []}]}
    return [simulation], [{"activityID": cme_id}], [shock] if shock else []


def forecasts_for(sims, cmes, shocks, cutoff="2024-05-31T00:00Z"):
    detail = {"revisions": [], "forecastJoins": []}
    result, surprises = build_forecasts(sims, cmes, shocks, dt(cutoff), Counter(), detail)
    return result, surprises, detail


@pytest.mark.parametrize(("actual", "outcome", "error"), [
    ("2024-05-04T06:00Z", "hit", 6),
    ("2024-05-05T06:00Z", "hit", 30),
    ("2024-05-05T06:00:01Z", "miss", 30.0003),
    ("2024-05-02T18:00Z", "hit", -30),
    ("2024-05-02T17:59Z", "miss", -30.0167),
    (None, "false_alarm", None),
])
def test_forecast_outcomes_and_error_sign(actual, outcome, error):
    result, _, _ = forecasts_for(*forecast_inputs(actual))
    assert result[0]["outcome"] == outcome
    assert result[0]["errorH"] == error


def test_first_run_revisions_do_not_duplicate_or_leak_hindsight():
    sims, cmes, shocks = forecast_inputs()
    later = {**sims[0], "simulationID": "WSA-ENLIL/test/2", "modelCompletionTime": "2024-05-03T00:00Z", "estimatedShockArrivalTime": "2024-05-04T06:00Z"}
    result, _, detail = forecasts_for([later, *sims], cmes, shocks)
    assert len(result) == 1
    assert result[0]["errorH"] == 6
    assert detail["revisions"][0]["laterSimulationIds"] == ["WSA-ENLIL/test/2"]


def test_shared_simulation_is_one_prediction_and_one_pair():
    sims, cmes, shocks = forecast_inputs()
    sims[0]["cmeInputs"].append({"CMEID": "other-cme", "ipsList": shocks})
    result, _, detail = forecasts_for(sims, cmes, shocks)
    assert len(result) == 1
    assert len(detail["forecastJoins"][0]["cmeIds"]) == 2


def test_unforecasted_earth_shock_not_mars_is_surprise():
    shocks = [{"activityID": "earth", "location": "Earth", "eventTime": "2024-05-04T00:00Z"}, {"activityID": "mars", "location": "Mars", "eventTime": "2024-05-04T00:00Z"}]
    _, surprises, _ = forecasts_for([], [], shocks)
    assert surprises == [{"id": "earth", "time": "2024-05-04T00:00Z"}]


def test_right_censoring_and_retrospective_forecasts_are_excluded():
    assert forecasts_for(*forecast_inputs(None), cutoff="2024-05-04T10:00Z")[0] == []
    assert forecasts_for(*forecast_inputs("2024-05-01T06:00Z"))[0] == []


def test_ambiguous_linked_arrivals_are_not_guessed():
    sims, cmes, shocks = forecast_inputs()
    shocks.append({**shocks[0], "activityID": "second-shock", "eventTime": "2024-05-04T12:00Z"})
    assert forecasts_for(sims, cmes, shocks)[0] == []


def test_window_keeps_boundary_hazards_but_needs_inside_issue():
    seps = [{"id": "event-SEP-001", "onset": "2024-05-11T02:10Z", "flareId": "flare", "countdownMin": 60}]
    flares = [{"id": "flare", "begin": "2024-05-11T01:10Z"}]
    outside = {"id": "old", "issued": "2024-05-10T00:00Z", "predicted": "2024-05-12T00:00Z", "actual": None}
    inside = {"id": "new", "issued": "2024-05-12T00:00Z", "predicted": "2024-05-14T00:00Z", "actual": None}
    assert build_windows(seps, flares, [outside], [], dt("2024-05-31")) == []
    windows = build_windows(seps, flares, [outside, inside], [], dt("2024-05-31"))
    assert windows[0]["refs"]["cmeForecasts"] == ["old", "new"]
    assert windows[0]["refs"]["flares"] == ["flare"]
    assert build_windows(seps, flares, [inside], [], dt("2024-05-20")) == []
