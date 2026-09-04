from datetime import date
import json
import sqlite3

import pytest

from swara import archive
from swara.analysis import frequency_to_cents
from swara.db import initialize


def test_schema_stores_sruti_as_real(tmp_path):
    database = tmp_path / "swara.sqlite3"
    initialize(database)
    with sqlite3.connect(database) as connection:
        connection.execute("INSERT INTO session(id,date,kind,sruti_hz,source_file) VALUES ('s','2026-09-12','class',146.83,'class.m4a')")
        assert connection.execute("SELECT sruti_hz FROM session").fetchone()[0] == pytest.approx(146.83)


def test_ingest_writes_rebuildable_manifest(monkeypatch, tmp_path):
    source = tmp_path / "class.m4a"; source.write_bytes(b"input")
    monkeypatch.setattr(archive, "_convert_audio", lambda _source, dest: dest.write_bytes(b"RIFF"))
    result = archive.ingest(source, session_date=date(2026, 9, 12), sruti_hz=146.83, kind="class", root=tmp_path / "library")
    manifest = json.loads((result.session_dir / "session.json").read_text())
    assert manifest["session"]["sruti_hz"] == pytest.approx(146.83)
    assert manifest["session"]["source_file"] == "class.m4a"
    assert str(tmp_path) not in json.dumps(manifest)
    assert manifest["takes"][0]["path"] == "reference-01.wav"
    assert result.audio_path.read_bytes() == b"RIFF"


def test_invalid_sruti_is_rejected(tmp_path):
    source = tmp_path / "take.wav"; source.write_bytes(b"RIFF")
    with pytest.raises(ValueError, match="positive frequency"):
        archive.ingest(source, session_date=date.today(), sruti_hz=0, kind="practice", root=tmp_path / "library")


def test_pitch_is_relative_to_session_sruti_and_not_quantised():
    assert frequency_to_cents(146.83, 146.83) == pytest.approx(0)
    gamaka_frequency = 146.83 * 2 ** (316.7 / 1200)
    assert frequency_to_cents(gamaka_frequency, 146.83) == pytest.approx(316.7)
