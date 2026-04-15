#!/usr/bin/env bash
set -euo pipefail

export LANG=C.UTF-8

: "${MYSQL_DATABASE:=educollab}"
: "${MYSQL_USER:=educollab}"
: "${MYSQL_PASSWORD:=educollab}"

DATADIR="/var/lib/mysql"
SOCKET="/run/mysqld/mysqld.sock"

mkdir -p /run/mysqld /app/data/uploads /app/data/repos /app/data/collab
chown -R mysql:mysql /run/mysqld "$DATADIR" || true

need_install=0
if [ ! -d "$DATADIR/mysql" ]; then
  need_install=1
  echo "[educollab] initializing mariadb data dir..."
  mariadb-install-db --user=mysql --datadir="$DATADIR" >/dev/null
fi

echo "[educollab] starting temporary mariadb for init..."
/usr/sbin/mariadbd --user=mysql --datadir="$DATADIR" --socket="$SOCKET" --skip-networking --bind-address=127.0.0.1 &
tmp_pid=$!

for i in {1..60}; do
  if mariadb-admin --socket="$SOCKET" ping --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! mariadb-admin --socket="$SOCKET" ping --silent >/dev/null 2>&1; then
  echo "[educollab] mariadb failed to start for init" >&2
  exit 1
fi

echo "[educollab] ensuring database/user exists..."
mariadb --socket="$SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "[educollab] checking schema..."
has_users_table="$(mariadb --socket="$SOCKET" -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='users';" 2>/dev/null || echo 0)"
if [ "${has_users_table}" = "0" ]; then
  echo "[educollab] importing schema.sql..."
  mariadb --socket="$SOCKET" -uroot "${MYSQL_DATABASE}" < /app/backend/schema.sql
fi

echo "[educollab] stopping temporary mariadb..."
mariadb-admin --socket="$SOCKET" -uroot shutdown >/dev/null 2>&1 || true
wait "$tmp_pid" >/dev/null 2>&1 || true

echo "[educollab] starting services via supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/educollab.conf
