#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${SWARA_API_PID:-}" ]]; then
    kill "$SWARA_API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

python -m uvicorn swara.api:app --app-dir backend --host 127.0.0.1 --port 8000 &
SWARA_API_PID=$!
npm run dev
