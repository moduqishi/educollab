#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"

for service in frontend backend collab-server; do
  PID_FILE="$RUN_DIR/$service.pid"
  if [[ -f "$PID_FILE" ]]; then
    PID="$(cat "$PID_FILE")"
    if kill "$PID" >/dev/null 2>&1; then
      echo "[EduCollab] 已停止 $service (pid=$PID)"
    fi
    rm -f "$PID_FILE"
  fi
done

echo "[EduCollab] 本机服务已停止。"
