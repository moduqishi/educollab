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
  rm -f "$pid_file"

  if [[ -z "$pid" ]]; then
    echo "[EduCollab] $service pid 文件为空，已清理。"
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    for _ in {1..20}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        echo "[EduCollab] 已停止 $service (pid=$pid)"
        return 0
      fi
      sleep 1
    done
    echo "[EduCollab][WARN] $service 未在超时时间内退出，强制结束 (pid=$pid)"
    kill -9 "$pid" >/dev/null 2>&1 || true
  else
    echo "[EduCollab] $service 进程不存在，已清理残留 pid (pid=$pid)"
  fi
}

for service in frontend backend collab-server; do
  stop_managed_service "$service"
done

echo "[EduCollab] 应用服务已停止（MySQL 保持运行）。"
