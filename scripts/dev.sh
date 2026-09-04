#!/usr/bin/env bash
set -euo pipefail

if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
  . .venv/bin/activate
  python -m pip install -e '.[dev]'
else
  . .venv/bin/activate
fi

if [[ ! -d node_modules ]]; then
  npm install --no-audit --no-fund
fi

cleanup() {
  if [[ -n "${SWARA_API_PID:-}" ]]; then
    kill "$SWARA_API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

python -m uvicorn swara.api:app --app-dir backend --host 127.0.0.1 --port 8000 &
SWARA_API_PID=$!
npm run dev
