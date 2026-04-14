#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
mkdir -p "$RUN_DIR"

is_port_busy() {
  lsof -tiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if ! mysqladmin ping -uroot >/dev/null 2>&1; then
  echo "[EduCollab] 本机 MySQL 未启动。请先执行: brew services start mysql"
  exit 1
fi

"$ROOT_DIR/scripts/init-local-db.sh"

if is_port_busy 1234; then
  echo "[EduCollab] 检测到 1234 端口已被占用，跳过 collab-server 启动。"
else
  echo "[EduCollab] 启动 collab-server..."
  (
    cd "$ROOT_DIR/collab-server"
    nohup npm run dev >"$RUN_DIR/collab-server.log" 2>&1 &
    echo $! >"$RUN_DIR/collab-server.pid"
  )
fi

if is_port_busy 8080; then
  echo "[EduCollab] 检测到 8080 端口已被占用，跳过 backend 启动。"
else
  echo "[EduCollab] 启动 backend..."
  (
    cd "$ROOT_DIR/backend"
    export DB_URL="jdbc:mysql://localhost:3306/educollab?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8"
    export DB_USERNAME="educollab"
    export DB_PASSWORD="educollab"
    export JWT_SECRET="educollab-demo-jwt-secret-change-me-32-bytes-minimum"
    export FILE_STORAGE_ROOT="$ROOT_DIR/backend/data/uploads"
    export GIT_REPO_ROOT="$ROOT_DIR/backend/data/repos"
    nohup mvn -Dmaven.repo.local=/tmp/educollab-m2 spring-boot:run >"$RUN_DIR/backend.log" 2>&1 &
    echo $! >"$RUN_DIR/backend.pid"
  )
fi

if is_port_busy 3000; then
  echo "[EduCollab] 检测到 3000 端口已被占用，跳过 frontend 启动。"
else
  echo "[EduCollab] 启动 frontend..."
  (
    cd "$ROOT_DIR/frontend"
    export VITE_API_BASE_URL="http://localhost:8080"
    export VITE_COLLAB_BASE_URL="ws://localhost:1234"
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
