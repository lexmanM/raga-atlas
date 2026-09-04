from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from .archive import default_root, ingest, rebuild_index


def _date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("date must use YYYY-MM-DD") from exc


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(prog="swara", description="Local-first Carnatic practice archive")
    subcommands = command.add_subparsers(dest="command", required=True)
    add = subcommands.add_parser("add", help="Convert and add an audio recording")
    add.add_argument("source", type=Path)
    add.add_argument("--date", dest="session_date", type=_date, required=True)
    add.add_argument("--sruti", dest="sruti_hz", type=float, required=True, help="sa frequency in Hz")
    add.add_argument("--kind", choices=("class", "practice"), default="class")
    add.add_argument("--role", choices=("reference", "take"))
    add.add_argument("--root", type=Path, default=default_root())
    rebuild = subcommands.add_parser("rebuild", help="Rebuild SQLite from session.json files")
    rebuild.add_argument("--root", type=Path, default=default_root())
    return command


def main() -> None:
    args = parser().parse_args()
    if args.command == "add":
        result = ingest(args.source, session_date=args.session_date, sruti_hz=args.sruti_hz, kind=args.kind, role=args.role, root=args.root)
        print(f"Added {result.audio_path}")
        print(f"Session metadata: {result.session_dir / 'session.json'}")
    else:
        count = rebuild_index(args.root)
        print(f"Indexed {count} session(s) from {args.root}")


if __name__ == "__main__":
    main()
