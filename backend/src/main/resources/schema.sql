CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  avatar VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  teacher_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  course_id BIGINT,
  leader_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS team_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  UNIQUE KEY uk_team_member (team_id, user_id)
);
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT,
  course_id BIGINT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  due_date DATE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS project_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  owner_flag BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uk_project_member (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  assignee_id BIGINT,
  priority VARCHAR(20),
  due_date DATE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS task_comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id BIGINT NOT NULL,
  author_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS discussion_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  author_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS discussion_replies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  author_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS discussion_task_links (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  task_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_discussion_task (post_id, task_id)
);
CREATE TABLE IF NOT EXISTS documents (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  excerpt TEXT,
  collab_key VARCHAR(150) NOT NULL UNIQUE,
  current_content LONGTEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS document_versions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  label VARCHAR(150),
  snapshot_content LONGTEXT,
  created_by BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS file_assets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_type VARCHAR(30) NOT NULL,
  owner_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120),
  size_bytes BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  summary TEXT,
  submission_url VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  teacher_id BIGINT NOT NULL,
  score INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS git_repositories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL UNIQUE,
  slug VARCHAR(150) NOT NULL UNIQUE,
  bare_path VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS merge_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  source_branch VARCHAR(100) NOT NULL,
  target_branch VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS project_releases (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  version VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS git_access_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(150) NOT NULL,
  token_prefix VARCHAR(20) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at DATETIME,
  last_used_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  scenario VARCHAR(100) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  prompt_preview TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- ---- lightweight migrations for existing local DBs (H2) ----
-- Older databases might have `discussion_posts` without category/status columns.
ALTER TABLE discussion_posts ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'GENERAL';
ALTER TABLE discussion_posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'OPEN';
