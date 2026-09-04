from __future__ import annotations

import os
import shutil
import tempfile
from datetime import date
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .archive import default_root, ingest
from .db import connect, initialize

ARCHIVE_ROOT = Path(os.environ.get("SWARA_LIBRARY", default_root())).expanduser().resolve()
DB_PATH = ARCHIVE_ROOT / "swara.sqlite3"
initialize(DB_PATH)

app = FastAPI(title="Swara local API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/sessions")
def sessions() -> list[dict]:
    with connect(DB_PATH) as connection:
        rows = connection.execute(
            "SELECT id, date, kind, sruti_hz, created_at "
            "FROM session ORDER BY date DESC, created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


@app.get("/api/pieces")
def pieces() -> list[dict]:
    query = """
        SELECT piece.*, raga.name AS raga_name, COUNT(take.id) AS take_count,
               MAX(session.date) AS last_practised
        FROM piece
        LEFT JOIN raga ON raga.id = piece.raga_id
        LEFT JOIN take ON take.piece_id = piece.id
        LEFT JOIN session ON session.id = take.session_id
        GROUP BY piece.id
        ORDER BY COALESCE(last_practised, '') DESC, piece.name
    """
    with connect(DB_PATH) as connection:
        rows = connection.execute(query).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/recordings", status_code=201)
def save_recording(
    audio: UploadFile = File(...),
    session_date: str = Form(...),
    sruti_hz: float = Form(...),
) -> dict[str, str]:
    try:
        parsed_date = date.fromisoformat(session_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="session_date must use YYYY-MM-DD") from exc
    suffix = Path(audio.filename or "browser-take.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
        shutil.copyfileobj(audio.file, temporary)
        temporary_path = Path(temporary.name)
    try:
        result = ingest(temporary_path, session_date=parsed_date, sruti_hz=sruti_hz, kind="practice", role="take", root=ARCHIVE_ROOT)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        temporary_path.unlink(missing_ok=True)
    return {
        "session_id": result.session_id,
        "take_id": result.take_id,
        "path": str(Path(result.session_dir.name) / result.audio_path.name),
    }
