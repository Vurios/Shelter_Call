"""Cache coverage/integrity and transport behavior; no live requests in tests."""

from datetime import date
import hashlib
import json

import pytest

import fetch_donki
from build_episodes import load_raw


def test_chunks_cover_dates_without_overlap():
    ranges = list(fetch_donki.chunks(date(2024, 1, 1), date(2024, 3, 1)))
    assert ranges == [("2024-01-01", "2024-01-30"), ("2024-01-31", "2024-02-29"), ("2024-03-01", "2024-03-01")]


class Response:
    status_code = 200
    is_redirect = False
    def raise_for_status(self):
        pass
    def json(self):
        return []


class Session:
    headers = {}
    def __init__(self):
        self.calls = []
    def get(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return Response()


def test_fetch_cache_hashes_and_resume(tmp_path, monkeypatch):
    session = Session()
    monkeypatch.setattr(fetch_donki.requests, "Session", lambda: session)
    monkeypatch.setattr(fetch_donki.time, "sleep", lambda _: None)
    manifest = fetch_donki.fetch("2024-05-11", "2024-05-11", tmp_path)
    assert manifest["complete"]
    assert len(session.calls) == 6
    raw, _ = load_raw(tmp_path)
    assert all(rows == [] for rows in raw.values())
    fetch_donki.fetch("2024-05-11", "2024-05-11", tmp_path)
    assert len(session.calls) == 6
    file = tmp_path / "SEP/2024-05-11_2024-05-11.json"
    file.write_text("[{}]")
    with pytest.raises(ValueError, match="checksum"):
        load_raw(tmp_path)


def test_partial_manifest_cannot_claim_complete(tmp_path):
    fetch_donki.atomic_json(tmp_path / "manifest.json", {"complete": False, "start": "2024-05-11", "end": "2024-05-11", "files": {}})
    with pytest.raises(ValueError, match="Incomplete"):
        load_raw(tmp_path)


def test_redirect_or_html_is_not_cached_as_data(tmp_path, monkeypatch):
    class Redirect(Response):
        is_redirect = True
    session = Session()
    monkeypatch.setattr(session, "get", lambda *args, **kwargs: Redirect())
    monkeypatch.setattr(fetch_donki.requests, "Session", lambda: session)
    monkeypatch.setattr(fetch_donki.time, "sleep", lambda _: None)
    monkeypatch.delenv("NASA_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="NASA fetch failed"):
        fetch_donki.fetch("2024-05-11", "2024-05-11", tmp_path)
    assert not (tmp_path / "FLR/2024-05-11_2024-05-11.json").exists()
