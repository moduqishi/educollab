#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="educollab"
PRESET_MYSQL_HOST="${MYSQL_HOST-}"
PRESET_MYSQL_PORT="${MYSQL_PORT-}"
PRESET_MYSQL_ROOT_USER="${MYSQL_ROOT_USER-}"
PRESET_MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD-}"
PRESET_DB_USERNAME="${DB_USERNAME-}"
PRESET_DB_PASSWORD="${DB_PASSWORD-}"

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
SQL_DB_USERNAME="${DB_USERNAME//\'/\'\'}"
SQL_DB_PASSWORD="${DB_PASSWORD//\'/\'\'}"

MYSQL_SOCKET_ARGS=(-u"$MYSQL_ROOT_USER")
MYSQL_TCP_ARGS=(-h"$MYSQL_HOST" -P"$MYSQL_PORT" --protocol=TCP -u"$MYSQL_ROOT_USER")

if [[ -n "$MYSQL_ROOT_PASSWORD" ]]; then
  MYSQL_SOCKET_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
  MYSQL_TCP_ARGS+=("-p${MYSQL_ROOT_PASSWORD}")
fi

run_mysql_root_sql() {
  local sql="$1"

  if mysql "${MYSQL_SOCKET_ARGS[@]}" -e "SELECT 1" mysql >/dev/null 2>&1; then
    mysql "${MYSQL_SOCKET_ARGS[@]}" <<SQL
$sql
SQL
    return 0
  fi

  if mysql "${MYSQL_TCP_ARGS[@]}" -e "SELECT 1" mysql >/dev/null 2>&1; then
    mysql "${MYSQL_TCP_ARGS[@]}" <<SQL
$sql
SQL
    return 0
  fi

  echo "[EduCollab][ERROR] 无法使用 root 连接 MySQL 来初始化数据库。" >&2
  echo "[EduCollab][ERROR] 请确认 root 账户可通过 socket 或 ${MYSQL_HOST}:${MYSQL_PORT} 访问。" >&2
  exit 1
}

echo "[EduCollab] 初始化本机 MySQL 数据库..."

run_mysql_root_sql "
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${SQL_DB_USERNAME}'@'localhost' IDENTIFIED BY '${SQL_DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${SQL_DB_USERNAME}'@'127.0.0.1' IDENTIFIED BY '${SQL_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${SQL_DB_USERNAME}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${SQL_DB_USERNAME}'@'127.0.0.1';
FLUSH PRIVILEGES;
"

echo "[EduCollab] 数据库已准备完成。"
