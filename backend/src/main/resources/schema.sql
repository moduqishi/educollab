CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  avatar VARCHAR(255),
  preferences JSON,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  class_code VARCHAR(20) UNIQUE,
  teacher_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS class_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL,
  joined_via VARCHAR(20),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_class_member (course_id, user_id)
);
CREATE TABLE IF NOT EXISTS class_invitations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  invited_user_id BIGINT NOT NULL,
  invited_by_user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  course_id BIGINT,
  group_task_id BIGINT,
  leader_id BIGINT,
  source VARCHAR(20) NOT NULL DEFAULT 'STANDALONE',
  status VARCHAR(20) NOT NULL DEFAULT 'FORMING',
  group_order INT,
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
  group_task_id BIGINT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  due_date DATE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS project_milestones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  weight INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
  activated_at DATETIME,
  completed_at DATETIME,
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
CREATE TABLE IF NOT EXISTS project_activity_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  course_id BIGINT,
  team_id BIGINT,
  user_id BIGINT,
  event_type VARCHAR(40) NOT NULL,
  target_type VARCHAR(40),
  target_id BIGINT,
  target_title VARCHAR(255),
  event_count INT,
  lines_added INT,
  lines_deleted INT,
  detail_json TEXT,
  dedupe_key VARCHAR(255) UNIQUE,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_project_activity_project_time ON project_activity_events (project_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_project_activity_user_time ON project_activity_events (user_id, occurred_at);
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  milestone_id BIGINT,
  parent_task_id BIGINT,
  sort_order INT NOT NULL DEFAULT 0,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  assignee_id BIGINT,
  priority VARCHAR(20),
  due_date DATE,
  completed_at DATETIME,
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
  kind VARCHAR(20) NOT NULL DEFAULT 'MARKDOWN',
  office_ext VARCHAR(10),
  file_asset_id BIGINT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS document_versions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  document_id BIGINT NOT NULL,
  label VARCHAR(150),
  snapshot_content LONGTEXT,
  file_asset_id BIGINT,
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
  storage_node_id BIGINT,
  storage_key VARCHAR(255),
  relative_path VARCHAR(500),
  course_id BIGINT,
  team_id BIGINT,
  project_id BIGINT,
  space_type VARCHAR(30),
  visibility VARCHAR(20),
  system_managed BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_from_students BOOLEAN NOT NULL DEFAULT FALSE,
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
  source_type VARCHAR(20),
  source_id BIGINT,
  source_path VARCHAR(255),
  source_label VARCHAR(100),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT,
  course_id BIGINT,
  title VARCHAR(150) NOT NULL,
  summary TEXT,
  submission_url VARCHAR(255),
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  assignment_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  linked_project_id BIGINT,
  linked_document_id BIGINT,
  content TEXT,
  submission_url VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  score INT,
  teacher_feedback TEXT,
  submitted_at DATETIME,
  reviewed_at DATETIME,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_assignment_submission (assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions (student_id);
CREATE TABLE IF NOT EXISTS group_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  min_members INT,
  max_members INT,
  due_date DATE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS group_task_team_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  assignee_id BIGINT,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  due_date DATE,
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
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_code VARCHAR(20);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS group_task_id BIGINT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'FORMING';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS group_task_id BIGINT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id BIGINT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'OPEN';
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submission_url VARCHAR(255);
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS linked_project_id BIGINT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS linked_document_id BIGINT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS score INT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at DATETIME;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS reviewed_at DATETIME;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_id BIGINT;
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1;
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'LOCKED';
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS activated_at DATETIME;
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS completed_at DATETIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id BIGINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_path VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_label VARCHAR(100);

-- documents dual-mode (NOTE/OFFICE)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'NOTE';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS office_ext VARCHAR(10);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_asset_id BIGINT;
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS file_asset_id BIGINT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS storage_node_id BIGINT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255);
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS relative_path VARCHAR(500);
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS course_id BIGINT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS team_id BIGINT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS project_id BIGINT;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS space_type VARCHAR(30);
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS system_managed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE file_assets ADD COLUMN IF NOT EXISTS hidden_from_students BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS storage_nodes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT,
  node_type VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  scope_type VARCHAR(20) NOT NULL,
  scope_id BIGINT NOT NULL,
  space_type VARCHAR(30) NOT NULL,
  course_id BIGINT,
  team_id BIGINT,
  project_id BIGINT,
  relative_path VARCHAR(500) NOT NULL,
  system_managed BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_from_students BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT,
  created_by BIGINT,
  file_asset_id BIGINT,
  linked_document_id BIGINT,
  visibility VARCHAR(20) NOT NULL DEFAULT 'DEFAULT',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
