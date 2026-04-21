#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
mkdir -p "$RUN_DIR"

is_port_busy() {
  lsof -tiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

stop_managed_service() {
  local service="$1"
  local pid_file="$RUN_DIR/$service.pid"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[EduCollab] 检测到已管理的 $service 正在运行，先停止旧进程 (pid=$pid)..."
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
}

if ! mysqladmin ping -uroot >/dev/null 2>&1; then
  echo "[EduCollab] 本机 MySQL 未启动。请先执行: brew services start mysql"
  exit 1
fi

"$ROOT_DIR/scripts/init-local-db.sh"

stop_managed_service "collab-server"
if is_port_busy 1234; then
  echo "[EduCollab] 检测到 1234 端口被其他进程占用，跳过 collab-server 启动。"
else
  echo "[EduCollab] 启动 collab-server..."
  (
    cd "$ROOT_DIR/collab-server"
    nohup npm run dev >"$RUN_DIR/collab-server.log" 2>&1 &
    echo $! >"$RUN_DIR/collab-server.pid"
  )
fi

stop_managed_service "backend"
if is_port_busy 8080; then
  echo "[EduCollab] 检测到 8080 端口被其他进程占用，跳过 backend 启动。"
else
  echo "[EduCollab] 启动 backend..."
  (
    cd "$ROOT_DIR/backend"
    DB_URL="jdbc:mysql://localhost:3306/educollab?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8" \
    DB_USERNAME="educollab" \
    DB_PASSWORD="educollab" \
    JWT_SECRET="educollab-demo-jwt-secret-change-me-32-bytes-minimum" \
    FILE_STORAGE_ROOT="$ROOT_DIR/backend/data/uploads" \
    GIT_REPO_ROOT="$ROOT_DIR/backend/data/repos" \
    nohup mvn -Dmaven.repo.local=/tmp/educollab-m2 spring-boot:run >"$RUN_DIR/backend.log" 2>&1 &
    echo $! >"$RUN_DIR/backend.pid"
  )
fi

stop_managed_service "frontend"
if is_port_busy 3000; then
  echo "[EduCollab] 检测到 3000 端口被其他进程占用，跳过 frontend 启动。"
else
  echo "[EduCollab] 启动 frontend..."
  (
    cd "$ROOT_DIR/frontend"
    VITE_API_BASE_URL="http://localhost:8080/api" \
    VITE_COLLAB_BASE_URL="ws://localhost:1234" \
    nohup npm run dev >"$RUN_DIR/frontend.log" 2>&1 &
    echo $! >"$RUN_DIR/frontend.pid"
  )
fi

cat <<EOF
[EduCollab] 本机服务已尝试启动：
  前端:   http://localhost:3000
  后端:   http://localhost:8080
  协同:   ws://localhost:1234

日志目录:
  $RUN_DIR

建议查看:
  tail -f $RUN_DIR/backend.log
  tail -f $RUN_DIR/frontend.log
  tail -f $RUN_DIR/collab-server.log
EOF
