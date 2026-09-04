from __future__ import annotations

import json
import shutil
import subprocess
import uuid
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

from .db import connect, initialize


@dataclass(frozen=True)
class IngestResult:
    session_id: str
    take_id: str
    session_dir: Path
    audio_path: Path


def default_root() -> Path:
    return Path.home() / "Music" / "Swara"


def _next_session_dir(root: Path, session_date: date, kind: str) -> Path:
    base = root / f"{session_date.isoformat()}_{kind}"
    candidate = base
    suffix = 2
    while candidate.exists():
        candidate = root / f"{base.name}-{suffix}"
        suffix += 1
    return candidate


def _convert_audio(source: Path, destination: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is required to ingest and normalise audio")
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-vn", "-ac", "1", "-ar", "48000", "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
        "-c:a", "pcm_s24le", str(destination),
    ]
    subprocess.run(command, check=True)


def ingest(
    source: Path,
    *,
    session_date: date,
    sruti_hz: float,
    kind: str,
    role: str | None = None,
    root: Path | None = None,
) -> IngestResult:
    source = source.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    if sruti_hz <= 0:
        raise ValueError("sruti must be a positive frequency in Hz")
    if kind not in {"class", "practice"}:
        raise ValueError("kind must be class or practice")
    resolved_role = role or ("reference" if kind == "class" else "take")
    if resolved_role not in {"reference", "take"}:
        raise ValueError("role must be reference or take")

    archive_root = (root or default_root()).expanduser().resolve()
    archive_root.mkdir(parents=True, exist_ok=True)
    db_path = archive_root / "swara.sqlite3"
    initialize(db_path)
    session_id = str(uuid.uuid4())
    take_id = str(uuid.uuid4())
    session_dir = _next_session_dir(archive_root, session_date, kind)
    session_dir.mkdir()
    audio_name = f"{resolved_role}-01.wav"
    audio_path = session_dir / audio_name

    try:
        _convert_audio(source, audio_path)
        manifest = {
            "version": 1,
            "session": {
                "id": session_id,
                "date": session_date.isoformat(),
                "kind": kind,
                "sruti_hz": float(sruti_hz),
                "source_file": source.name,
            },
            "takes": [{
                "id": take_id,
                "role": resolved_role,
                "path": audio_name,
                "start_ms": 0,
                "end_ms": None,
                "piece_id": None,
            }],
        }
        (session_dir / "session.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        with connect(db_path) as connection:
            connection.execute(
                "INSERT INTO session(id, date, kind, sruti_hz, source_file) VALUES (?, ?, ?, ?, ?)",
                (session_id, session_date.isoformat(), kind, sruti_hz, source.name),
            )
            connection.execute(
                "INSERT INTO take(id, session_id, role, path, start_ms) VALUES (?, ?, ?, ?, 0)",
                (take_id, session_id, resolved_role, str(audio_path)),
            )
    except Exception:
        shutil.rmtree(session_dir, ignore_errors=True)
        raise
    return IngestResult(session_id, take_id, session_dir, audio_path)


def rebuild_index(root: Path | None = None) -> int:
    archive_root = (root or default_root()).expanduser().resolve()
    db_path = archive_root / "swara.sqlite3"
    initialize(db_path)
    manifests = sorted(archive_root.glob("*/session.json"))
    with connect(db_path) as connection:
        for manifest_path in manifests:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            session = data["session"]
            connection.execute(
                "INSERT OR REPLACE INTO session(id,date,kind,sruti_hz,source_file) VALUES (?,?,?,?,?)",
                (session["id"], session["date"], session["kind"], session["sruti_hz"], session["source_file"]),
            )
            for take in data.get("takes", []):
                connection.execute(
                    "INSERT OR REPLACE INTO take(id,session_id,piece_id,role,path,start_ms,end_ms) VALUES (?,?,?,?,?,?,?)",
                    (take["id"], session["id"], take.get("piece_id"), take["role"], str(manifest_path.parent / take["path"]), take.get("start_ms", 0), take.get("end_ms")),
                )
    return len(manifests)
