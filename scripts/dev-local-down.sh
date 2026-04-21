#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"

stop_managed_service() {
  local service="$1"
  local pid_file="$RUN_DIR/$service.pid"

  if [[ ! -f "$pid_file" ]]; then
    echo "[EduCollab] $service 未发现 pid 文件，跳过。"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" >/dev/null 2>&1; then
    if kill "$pid" >/dev/null 2>&1; then
      echo "[EduCollab] 已停止 $service (pid=$pid)"
    else
      echo "[EduCollab] 停止 $service 失败 (pid=$pid)"
    fi
  else
    echo "[EduCollab] $service 进程不存在，清理残留 pid (pid=$pid)"
  fi

  rm -f "$pid_file"
}

for service in frontend backend collab-server; do
  stop_managed_service "$service"
done

echo "[EduCollab] 本机服务已停止。"
