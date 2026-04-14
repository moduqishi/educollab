#!/usr/bin/env bash
set -euo pipefail

echo "[EduCollab] 初始化本机 MySQL 数据库..."

mysql -uroot <<'SQL'
CREATE DATABASE IF NOT EXISTS educollab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'educollab'@'localhost' IDENTIFIED BY 'educollab';
GRANT ALL PRIVILEGES ON educollab.* TO 'educollab'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "[EduCollab] 数据库已准备完成。"
