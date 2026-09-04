# Swara

A local-first Carnatic vocal practice archive and raga reference. Recordings remain ordinary 48 kHz mono WAV files under `~/Music/Swara`; SQLite is only an index and can be rebuilt from each folder's `session.json`.

## Development policy

Swara is agent agnostic by repository rule: its build, runtime, tests, and
documentation must work from an ordinary terminal without any coding agent or
agent-vendor service. The mandatory policy is in [`AGENTS.md`](AGENTS.md) and
can be checked with `npm run check:agnostic`.

## Privacy defaults

Swara has no accounts, telemetry, cloud storage, or upload service. Audio and
metadata stay in the library directory on the user's machine. Manifests store
the imported file name, not its original absolute path, so moving or sharing a
library does not reveal a home-directory name. Keep recordings and generated
`session.json` files out of this source repository unless they are deliberately
prepared as public examples.

## Run locally

Requires Node 22+, Python 3.11+, and `ffmpeg`.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
npm install
./scripts/dev.sh
```

The interface runs at `http://localhost:3000` and the local API at `http://127.0.0.1:8000`.

## Ingest a recording

```bash
swara add class.m4a --date 2026-09-12 --sruti 146.83
```

Practice recordings default to the student-take role:

```bash
swara add practice.m4a --date 2026-09-13 --sruti 146.83 --kind practice
```

Rebuild the database index from the filesystem at any time:

```bash
swara rebuild
```

`sruti_hz` is stored on every session. Pitch is always represented relative to sa, and swara labels remain explicit rather than inferred from frequency.

## License

Swara is available under the [MIT License](LICENSE). Individuals and projects
may use, modify, and redistribute the framework under its terms.
