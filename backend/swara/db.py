from __future__ import annotations

import sqlite3
from pathlib import Path

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS raga (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    "group" TEXT NOT NULL CHECK ("group" IN ('melakarta', 'janya')),
    parent_mela INTEGER,
    arohana_json TEXT NOT NULL,
    avarohana_json TEXT NOT NULL,
    jati TEXT,
    sancharas TEXT NOT NULL DEFAULT '',
    gamaka_notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS piece (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sarali','janta','dhattu','alankaram','geetham','swarajathi','varnam','kriti')),
    raga_id TEXT REFERENCES raga(id),
    tala TEXT NOT NULL DEFAULT '',
    composer TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('class', 'practice')),
    sruti_hz REAL NOT NULL CHECK (sruti_hz > 0),
    source_file TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS take (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    piece_id TEXT REFERENCES piece(id),
    role TEXT NOT NULL CHECK (role IN ('reference', 'take')),
    path TEXT NOT NULL UNIQUE,
    start_ms INTEGER NOT NULL DEFAULT 0,
    end_ms INTEGER,
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS marker (
    id TEXT PRIMARY KEY,
    take_id TEXT NOT NULL REFERENCES take(id) ON DELETE CASCADE,
    at_ms INTEGER NOT NULL CHECK (at_ms >= 0),
    text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis (
    take_id TEXT PRIMARY KEY REFERENCES take(id) ON DELETE CASCADE,
    f0_path TEXT NOT NULL,
    cents_median REAL,
    swara_deviations_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_session_date ON session(date DESC);
CREATE INDEX IF NOT EXISTS idx_take_piece ON take(piece_id);
CREATE INDEX IF NOT EXISTS idx_piece_raga ON piece(raga_id);
"""


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize(path: Path) -> None:
    with connect(path) as connection:
        connection.executescript(SCHEMA)
