#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.local-run"
DB_NAME="educollab"

mkdir -p "$RUN_DIR"

STARTED_SERVICES=()
BOOTSTRAP_FAILED=0
PRESET_MYSQL_HOST="${MYSQL_HOST-}"
PRESET_MYSQL_PORT="${MYSQL_PORT-}"
PRESET_MYSQL_ROOT_USER="${MYSQL_ROOT_USER-}"
PRESET_MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD-}"
PRESET_DB_USERNAME="${DB_USERNAME-}"
PRESET_DB_PASSWORD="${DB_PASSWORD-}"
PRESET_JWT_SECRET="${JWT_SECRET-}"
PRESET_VITE_API_BASE_URL="${VITE_API_BASE_URL-}"
PRESET_VITE_COLLAB_BASE_URL="${VITE_COLLAB_BASE_URL-}"
PRESET_FILE_STORAGE_ROOT="${FILE_STORAGE_ROOT-}"
PRESET_GIT_REPO_ROOT="${GIT_REPO_ROOT-}"
PRESET_DEMO_SEED_MODE="${DEMO_SEED_MODE-}"

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_file "$ROOT_DIR/.env.example"
load_env_file "$ROOT_DIR/.env"

MYSQL_HOST="${PRESET_MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${PRESET_MYSQL_PORT:-3306}"
MYSQL_ROOT_USER="${PRESET_MYSQL_ROOT_USER:-root}"
MYSQL_ROOT_PASSWORD="${PRESET_MYSQL_ROOT_PASSWORD:-}"
DB_USERNAME="${PRESET_DB_USERNAME:-${DB_USERNAME:-educollab}}"
DB_PASSWORD="${PRESET_DB_PASSWORD:-${DB_PASSWORD:-educollab}}"
JWT_SECRET="${PRESET_JWT_SECRET:-${JWT_SECRET:-educollab-demo-jwt-secret-change-me-32-bytes-minimum}}"
VITE_API_BASE_URL="${PRESET_VITE_API_BASE_URL:-${VITE_API_BASE_URL:-http://localhost:8080/api}}"
VITE_COLLAB_BASE_URL="${PRESET_VITE_COLLAB_BASE_URL:-${VITE_COLLAB_BASE_URL:-ws://localhost:1234}}"
FILE_STORAGE_ROOT="${PRESET_FILE_STORAGE_ROOT:-$ROOT_DIR/backend/data/uploads}"
GIT_REPO_ROOT="${PRESET_GIT_REPO_ROOT:-$ROOT_DIR/backend/data/repos}"
MYSQL_START_TIMEOUT="${MYSQL_START_TIMEOUT:-60}"
SERVICE_START_TIMEOUT="${SERVICE_START_TIMEOUT:-120}"
DEMO_SEED_MODE="${PRESET_DEMO_SEED_MODE:-${DEMO_SEED_MODE:-AUTO}}"
LOCAL_DB_URL="jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8"

MYSQL_SOCKET_ARGS=(-u"$MYSQL_ROOT_USER")
MYSQL_TCP_ARGS=(-h"$MYSQL_HOST" -P"$MYSQL_PORT" --protocol=TCP -u"$MYSQL_ROOT_USER")
MYSQLADMIN_SOCKET_ARGS=(-u"$MYSQL_ROOT_USER")
MYSQLADMIN_TCP_ARGS=(-h"$MYSQL_HOST" -P"$MYSQL_PORT" --protocol=TCP -u"$MYSQL_ROOT_USER")
MYSQL_APP_ARGS=(-h"$MYSQL_HOST" -P"$MYSQL_PORT" --protocol=TCP -u"$DB_USERNAME")

if [[ -n "$MYSQL_ROOT_PASSWORD" ]]; then
  MYSQL_SOCKET_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
  MYSQL_TCP_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
  MYSQLADMIN_SOCKET_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
  MYSQLADMIN_TCP_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
fi

if [[ -n "$DB_PASSWORD" ]]; then
  MYSQL_APP_ARGS+=("-p${DB_PASSWORD}")
fi

log() {
  echo "[EduCollab] $*"
}

warn() {
  echo "[EduCollab][WARN] $*" >&2
}

die() {
  echo "[EduCollab][ERROR] $*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_command() {
  local cmd="$1"
  local install_hint="$2"
  if ! command_exists "$cmd"; then
    die "缺少依赖命令: $cmd。请先安装后再重试。建议：$install_hint"
  fi
}

cleanup_started_services() {
  local idx
  for ((idx=${#STARTED_SERVICES[@]}-1; idx>=0; idx--)); do
    stop_managed_service "${STARTED_SERVICES[$idx]}" >/dev/null 2>&1 || true
  done
}

on_exit() {
  local code=$?
  if [[ $code -ne 0 || $BOOTSTRAP_FAILED -ne 0 ]]; then
    cleanup_started_services
  fi
}

trap on_exit EXIT

stop_managed_service() {
  local service="$1"
  local pid_file="$RUN_DIR/$service.pid"
  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  rm -f "$pid_file"

  if [[ -z "$pid" ]]; then
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    log "停止已管理的 $service (pid=$pid)..."
    kill "$pid" >/dev/null 2>&1 || true
    for _ in {1..20}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    if kill -0 "$pid" >/dev/null 2>&1; then
      warn "$service 未在超时时间内退出，强制结束 (pid=$pid)"
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi
}

assert_port_free() {
  local service="$1"
  local port="$2"
  local output
  output="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$output" ]]; then
    echo "$output" >&2
    die "$service 需要的端口 $port 已被其他进程占用，请先释放后再启动。"
  fi
}

ensure_directory_layout() {
  mkdir -p "$FILE_STORAGE_ROOT" "$GIT_REPO_ROOT"
}

ensure_node_dependencies() {
  local dir="$1"
  local label="$2"
  if [[ ! -d "$dir/node_modules" ]]; then
    log "$label 缺少 node_modules，开始自动安装依赖..."
    (
      cd "$dir"
      npm install
    )
  fi
}

mysql_ping_socket() {
  mysqladmin "${MYSQLADMIN_SOCKET_ARGS[@]}" ping --silent >/dev/null 2>&1
}

mysql_ping_tcp() {
  mysqladmin "${MYSQLADMIN_TCP_ARGS[@]}" ping --silent >/dev/null 2>&1
}

wait_for_mysql() {
  local timeout="$1"
  local waited=0
  while (( waited < timeout )); do
    if mysql_ping_socket || mysql_ping_tcp; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

start_mysql() {
  if mysql_ping_socket || mysql_ping_tcp; then
    log "MySQL 已在运行。"
    return 0
  fi

  log "检测到 MySQL 未运行，尝试自动启动..."

  if command_exists brew; then
    brew services start mysql >/dev/null 2>&1 || true
    if wait_for_mysql 10; then
      log "已通过 brew services 启动 MySQL。"
      return 0
    fi
  fi

  if command_exists mysql.server; then
    mysql.server start >/dev/null 2>&1 || true
  fi

  if wait_for_mysql "$MYSQL_START_TIMEOUT"; then
    log "MySQL 启动成功。"
    return 0
  fi

  die "无法自动启动 MySQL。请确认本机已安装 MySQL，并能使用 'brew services start mysql' 或 'mysql.server start' 启动。"
}

app_db_has_data() {
  local user_table_exists
  user_table_exists="$(
    mysql "${MYSQL_APP_ARGS[@]}" -N -s -e \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='users';" \
      2>/dev/null || echo "0"
  )"

  if [[ "$user_table_exists" == "0" ]]; then
    return 1
  fi

  local user_count
  user_count="$(
    mysql "${MYSQL_APP_ARGS[@]}" "$DB_NAME" -N -s -e "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0"
  )"
  [[ "${user_count:-0}" -gt 0 ]]
}

resolve_demo_seed_mode() {
  if [[ "$DEMO_SEED_MODE" != "AUTO" ]]; then
    case "$DEMO_SEED_MODE" in
      OFF|ENSURE_DEMO|RESET_DEMO)
        echo "$DEMO_SEED_MODE"
        return 0
        ;;
      *)
        die "不支持的 DEMO_SEED_MODE=$DEMO_SEED_MODE，仅支持 AUTO/OFF/ENSURE_DEMO/RESET_DEMO"
        ;;
    esac
  fi

  if app_db_has_data; then
    echo "OFF"
  else
    echo "ENSURE_DEMO"
  fi
}

start_service() {
  local service="$1"
  local log_file="$RUN_DIR/$service.log"
  local pid_file="$RUN_DIR/$service.pid"
  shift

  : >"$log_file"
  nohup "$@" >>"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"
  STARTED_SERVICES+=("$service")
}

wait_for_port() {
  local service="$1"
  local port="$2"
  local timeout="$3"
  for _ in $(seq 1 "$timeout"); do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  tail_service_log "$service" >&2 || true
  BOOTSTRAP_FAILED=1
  die "$service 在 ${timeout}s 内未成功监听端口 $port。"
}

wait_for_http_ok() {
  local service="$1"
  local url="$2"
  local timeout="$3"
  for _ in $(seq 1 "$timeout"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  tail_service_log "$service" >&2 || true
  BOOTSTRAP_FAILED=1
  die "$service 在 ${timeout}s 内未通过健康检查: $url"
}

wait_for_backend_health() {
  local url="http://127.0.0.1:8080/actuator/health"
  for _ in $(seq 1 "$SERVICE_START_TIMEOUT"); do
    local response
    response="$(curl -fsS "$url" 2>/dev/null || true)"
    if [[ "$response" == *"\"status\":\"UP\""* ]]; then
      return 0
    fi
    sleep 1
  done
  tail_service_log "backend" >&2 || true
  BOOTSTRAP_FAILED=1
  die "backend 在 ${SERVICE_START_TIMEOUT}s 内未通过健康检查: $url"
}

tail_service_log() {
  local service="$1"
  local log_file="$RUN_DIR/$service.log"
  if [[ -f "$log_file" ]]; then
    echo "----- $service 最近日志 -----"
    tail -n 60 "$log_file"
    echo "----------------------------"
  fi
}

log "检查系统依赖..."
require_command java "安装 Java 21（例如 brew install openjdk@21）"
require_command mvn "安装 Maven（例如 brew install maven）"
require_command node "安装 Node.js 20+（例如 brew install node）"
require_command npm "安装 Node.js 自带 npm"
require_command mysql "安装 MySQL 客户端（例如 brew install mysql）"
require_command mysqladmin "安装 MySQL 客户端工具（例如 brew install mysql）"
require_command curl "系统需提供 curl"
require_command lsof "系统需提供 lsof"

ensure_directory_layout
ensure_node_dependencies "$ROOT_DIR/frontend" "frontend"
ensure_node_dependencies "$ROOT_DIR/collab-server" "collab-server"

start_mysql

log "初始化本机数据库..."
(
  cd "$ROOT_DIR"
  MYSQL_HOST="$MYSQL_HOST" \
  MYSQL_PORT="$MYSQL_PORT" \
  MYSQL_ROOT_USER="$MYSQL_ROOT_USER" \
  MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  DB_USERNAME="$DB_USERNAME" \
  DB_PASSWORD="$DB_PASSWORD" \
  ./scripts/init-local-db.sh
)

EFFECTIVE_DEMO_SEED_MODE="$(resolve_demo_seed_mode)"
log "本次 backend 启动示例数据模式: $EFFECTIVE_DEMO_SEED_MODE"

for service in collab-server backend frontend; do
  stop_managed_service "$service"
done

assert_port_free "collab-server" 1234
assert_port_free "backend" 8080
assert_port_free "frontend" 3000

log "启动 collab-server..."
start_service "collab-server" bash -lc "
  cd '$ROOT_DIR/collab-server'
  exec env COLLAB_PORT=1234 npm run dev
"
wait_for_port "collab-server" 1234 30

log "启动 backend..."
start_service "backend" bash -lc "
  cd '$ROOT_DIR/backend'
  exec env \
    DB_URL='$LOCAL_DB_URL' \
    DB_USERNAME='$DB_USERNAME' \
    DB_PASSWORD='$DB_PASSWORD' \
    JWT_SECRET='$JWT_SECRET' \
    FILE_STORAGE_ROOT='$FILE_STORAGE_ROOT' \
    GIT_REPO_ROOT='$GIT_REPO_ROOT' \
    DEMO_SEED_MODE='$EFFECTIVE_DEMO_SEED_MODE' \
    mvn -Dmaven.repo.local=/tmp/educollab-m2 spring-boot:run
"
wait_for_backend_health

log "启动 frontend..."
start_service "frontend" bash -lc "
  cd '$ROOT_DIR/frontend'
  exec env \
    VITE_API_BASE_URL='$VITE_API_BASE_URL' \
    VITE_COLLAB_BASE_URL='$VITE_COLLAB_BASE_URL' \
    npm run dev
"
wait_for_http_ok "frontend" "http://127.0.0.1:3000" 60

cat <<EOF
[EduCollab] 本机服务已全部启动成功：
  前端:   http://localhost:3000
  后端:   http://localhost:8080
  协同:   ws://localhost:1234
  数据库: mysql://${MYSQL_HOST}:${MYSQL_PORT}/${DB_NAME}

日志目录:
  $RUN_DIR

建议查看:
  tail -f $RUN_DIR/backend.log
  tail -f $RUN_DIR/frontend.log
  tail -f $RUN_DIR/collab-server.log
EOF
