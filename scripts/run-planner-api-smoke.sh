#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_BASE_URL="${AIV_API_BASE_URL:-http://127.0.0.1:8787}"
API_LOG_PATH="${AIV_API_SMOKE_LOG_PATH:-/tmp/aiv-api-planner-smoke.log}"

cd "$REPO_DIR"

pnpm --filter @aiv/api exec tsx src/server.ts >"$API_LOG_PATH" 2>&1 &
api_pid=$!

cleanup() {
  kill "$api_pid" 2>/dev/null || true
}

trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -fsS "$API_BASE_URL/health" >/dev/null; then
    break
  fi
  sleep 1
done

curl -fsS "$API_BASE_URL/health" >/dev/null
pnpm --filter @aiv/api smoke:planner-api-refactor
