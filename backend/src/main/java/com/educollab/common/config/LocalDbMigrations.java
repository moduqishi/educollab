package com.educollab.common.config;

import java.util.List;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Small, idempotent migrations for the local H2 database.
 *
 * <p>Why: Hibernate "ddl-auto=update" can fail to add NOT NULL columns when existing rows
 * exist, leaving the DB in a partially-updated state. This runner patches the local DB
 * so new features (discussion category/status, etc.) work without requiring developers
 * to delete their H2 files.</p>
 */
@Component
@Profile("local")
@Order(0)
public class LocalDbMigrations implements ApplicationRunner {
  private final JdbcTemplate jdbc;

  public LocalDbMigrations(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    ensureColumn("users", "preferences", "CLOB");
    ensureVarcharColumnIfEnum("users", "role", "VARCHAR(20)");
    ensureColumn("courses", "class_code", "VARCHAR(20)");
    backfillClassCodes();

    ensureColumn("teams", "group_task_id", "BIGINT");
    ensureColumn("teams", "source", "VARCHAR(20)");
    ensureColumn("teams", "status", "VARCHAR(20) NOT NULL DEFAULT 'FORMING'");
    ensureColumn("teams", "group_order", "INT");
    ensureVarcharColumnIfEnum("teams", "source", "VARCHAR(20)");
    ensureVarcharColumnIfEnum("teams", "status", "VARCHAR(20)");
    ensureColumn("teams", "invite_code", "VARCHAR(20)");
    ensureColumn("projects", "group_task_id", "BIGINT");
    ensureProjectMilestonesTable();
    ensureColumn("project_milestones", "weight", "INT NOT NULL DEFAULT 1");
    ensureColumn("project_milestones", "status", "VARCHAR(20) NOT NULL DEFAULT 'LOCKED'");
    ensureColumn("project_milestones", "activated_at", "TIMESTAMP");
    ensureColumn("project_milestones", "completed_at", "TIMESTAMP");
    ensureProjectActivityEventsTable();
    ensureColumn("project_activity_events", "course_id", "BIGINT");
    ensureColumn("project_activity_events", "team_id", "BIGINT");
    ensureColumn("project_activity_events", "user_id", "BIGINT");
    ensureColumn("project_activity_events", "event_type", "VARCHAR(40)");
    ensureColumn("project_activity_events", "target_type", "VARCHAR(40)");
    ensureColumn("project_activity_events", "target_id", "BIGINT");
    ensureColumn("project_activity_events", "target_title", "VARCHAR(255)");
    ensureColumn("project_activity_events", "event_count", "INT");
    ensureColumn("project_activity_events", "lines_added", "INT");
    ensureColumn("project_activity_events", "lines_deleted", "INT");
    ensureColumn("project_activity_events", "detail_json", "CLOB");
    ensureColumn("project_activity_events", "dedupe_key", "VARCHAR(255)");
    ensureColumn("project_activity_events", "occurred_at", "TIMESTAMP");
    ensureColumn("tasks", "milestone_id", "BIGINT");
    ensureColumn("tasks", "parent_task_id", "BIGINT");
    ensureColumn("tasks", "sort_order", "INT NOT NULL DEFAULT 0");
    ensureColumn("tasks", "completed_at", "TIMESTAMP");
    ensureColumn("assignments", "course_id", "BIGINT");
    ensureColumn("assignments", "due_date", "DATE");
    ensureColumn("assignments", "status", "VARCHAR(20) NOT NULL DEFAULT 'OPEN'");
    ensureVarcharColumnIfEnum("assignments", "status", "VARCHAR(20)");
    ensureAssignmentSubmissionsTable();
    ensureColumn("assignment_submissions", "linked_project_id", "BIGINT");
    ensureColumn("assignment_submissions", "linked_document_id", "BIGINT");
    ensureVarcharColumnIfEnum("assignment_submissions", "status", "VARCHAR(20)");

    ensureColumn("class_members", "id", "BIGINT AUTO_INCREMENT PRIMARY KEY");
    ensureColumn("class_members", "course_id", "BIGINT NOT NULL");
    ensureColumn("class_members", "user_id", "BIGINT NOT NULL");
    ensureColumn("class_members", "role", "VARCHAR(20) NOT NULL DEFAULT 'STUDENT'");
    ensureColumn("class_members", "joined_via", "VARCHAR(30)");
    ensureColumn("class_members", "created_at", "TIMESTAMP");
    ensureColumn("class_members", "updated_at", "TIMESTAMP");
    backfillClassMembers();

    if (hasTable("teams") && hasColumn("teams", "status")) {
      jdbc.execute("UPDATE teams SET status='FORMING' WHERE status IS NULL");
    }
    if (hasTable("teams") && hasColumn("teams", "source")) {
      // Fully normalize legacy source values (including old GROUP_TASK rows) into the new two-state model.
      jdbc.execute("UPDATE teams SET source='COURSE' WHERE course_id IS NOT NULL AND (source IS NULL OR TRIM(source)='' OR UPPER(source) <> 'COURSE')");
      jdbc.execute("UPDATE teams SET source='STANDALONE' WHERE course_id IS NULL AND (source IS NULL OR TRIM(source)='' OR UPPER(source) <> 'STANDALONE')");
    }
    backfillCourseTeamOrder();
    backfillProjectMilestoneWorkflow();
    backfillTaskMilestoneAssignments();
    if (hasTable("assignments") && hasColumn("assignments", "status")) {
      jdbc.execute("UPDATE assignments SET status='OPEN' WHERE status IS NULL");
    }
    if (hasTable("assignment_submissions") && hasColumn("assignment_submissions", "status")) {
      jdbc.execute("UPDATE assignment_submissions SET status='SUBMITTED' WHERE status IS NULL");
    }

    // discussion_posts: category/status
    ensureColumn("discussion_posts", "category", "VARCHAR(40) NOT NULL DEFAULT 'GENERAL'");
    ensureColumn("discussion_posts", "status", "VARCHAR(20) NOT NULL DEFAULT 'OPEN'");

    // Backfill existing rows (in case columns existed but had nulls)
    jdbc.execute("UPDATE discussion_posts SET category='GENERAL' WHERE category IS NULL");
    jdbc.execute("UPDATE discussion_posts SET status='OPEN' WHERE status IS NULL");

    // documents: kind/office_ext/file_asset_id (dual-mode NOTE/OFFICE)
    ensureColumn("documents", "kind", "VARCHAR(20) NOT NULL DEFAULT 'NOTE'");
    ensureColumn("documents", "office_ext", "VARCHAR(10)");
    ensureColumn("documents", "file_asset_id", "BIGINT");
    ensureColumn("document_versions", "file_asset_id", "BIGINT");
    jdbc.execute("UPDATE documents SET kind='NOTE' WHERE kind IS NULL");

    // file_assets.owner_type: older local DBs used H2 ENUM('DOCUMENT','PROJECT','TASK') which rejects new values.
    // Convert it to VARCHAR so new owner types (e.g. DISCUSSION_POST) work.
    ensureVarcharColumnIfEnum("file_assets", "owner_type", "VARCHAR(30)");

    backfillProjectProgress();
    ensureProjectActivityIndexes();
  }

  private void ensureProjectMilestonesTable() {
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS project_milestones (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          project_id BIGINT NOT NULL,
          title VARCHAR(120) NOT NULL,
          description CLOB,
          sort_order INT NOT NULL DEFAULT 0,
          weight INT NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
          activated_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        )
        """);
  }

  private void ensureAssignmentSubmissionsTable() {
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS assignment_submissions (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          assignment_id BIGINT NOT NULL,
          student_id BIGINT NOT NULL,
          linked_project_id BIGINT,
          linked_document_id BIGINT,
          content CLOB,
          submission_url VARCHAR(255),
          status VARCHAR(20) NOT NULL,
          score INT,
          teacher_feedback CLOB,
          submitted_at TIMESTAMP,
          reviewed_at TIMESTAMP,
          attempt_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          CONSTRAINT uk_assignment_submission UNIQUE (assignment_id, student_id)
        )
        """);
    try {
      jdbc.execute(
          "CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions (assignment_id)");
      jdbc.execute(
          "CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions (student_id)");
    } catch (Exception ignored) {
      // best-effort index creation for local dev only
    }
  }

  private void ensureProjectActivityEventsTable() {
    jdbc.execute("""
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
          detail_json CLOB,
          dedupe_key VARCHAR(255),
          occurred_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        )
        """);
  }

  private void ensureProjectActivityIndexes() {
    try {
      jdbc.execute("CREATE INDEX IF NOT EXISTS idx_project_activity_project_time ON project_activity_events (project_id, occurred_at)");
      jdbc.execute("CREATE INDEX IF NOT EXISTS idx_project_activity_user_time ON project_activity_events (user_id, occurred_at)");
      jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uk_project_activity_dedupe ON project_activity_events (dedupe_key)");
    } catch (Exception ignored) {
      // best-effort index creation for local dev only
    }
  }

  private void backfillClassCodes() {
    if (!hasTable("courses") || !hasColumn("courses", "class_code")) return;
    List<Long> courseIds = jdbc.query(
        "SELECT id FROM courses WHERE class_code IS NULL OR TRIM(class_code)=''",
        (rs, rowNum) -> rs.getLong("id")
    );
    for (Long courseId : courseIds) {
      jdbc.update("UPDATE courses SET class_code=? WHERE id=?", "CLASS" + courseId, courseId);
    }
  }

  private void backfillClassMembers() {
    if (!hasTable("courses") || !hasTable("class_members")) return;

    jdbc.execute("""
        INSERT INTO class_members (course_id, user_id, role, joined_via, created_at, updated_at)
        SELECT c.id, c.teacher_id, 'TEACHER', 'MIGRATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM courses c
        WHERE c.teacher_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.course_id = c.id AND cm.user_id = c.teacher_id
          )
        """);

    if (hasTable("projects") && hasColumn("projects", "course_id")
        && hasTable("project_members") && hasColumn("project_members", "project_id")
        && hasColumn("project_members", "user_id") && hasTable("users") && hasColumn("users", "role")) {
      jdbc.execute("""
          INSERT INTO class_members (course_id, user_id, role, joined_via, created_at, updated_at)
          SELECT DISTINCT p.course_id, pm.user_id, 'STUDENT', 'MIGRATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM project_members pm
          JOIN projects p ON p.id = pm.project_id
          JOIN users u ON u.id = pm.user_id
          WHERE p.course_id IS NOT NULL
            AND UPPER(COALESCE(u.role, '')) = 'STUDENT'
            AND NOT EXISTS (
              SELECT 1 FROM class_members cm
              WHERE cm.course_id = p.course_id AND cm.user_id = pm.user_id
            )
          """);
    }
  }

  private void backfillCourseTeamOrder() {
    if (!hasTable("teams") || !hasColumn("teams", "group_order") || !hasColumn("teams", "course_id")) return;
    List<java.util.Map<String, Object>> rows = jdbc.queryForList(
        "SELECT id, course_id FROM teams WHERE course_id IS NOT NULL ORDER BY course_id ASC, created_at ASC, id ASC");
    Long currentCourseId = null;
    int index = 0;
    for (java.util.Map<String, Object> row : rows) {
      Number teamId = (Number) row.get("id");
      Number courseId = (Number) row.get("course_id");
      if (teamId == null || courseId == null) continue;
      long cid = courseId.longValue();
      if (currentCourseId == null || currentCourseId.longValue() != cid) {
        currentCourseId = cid;
        index = 1;
      } else {
        index += 1;
      }
      jdbc.update(
          "UPDATE teams SET group_order=? WHERE id=? AND (group_order IS NULL OR group_order<=0)",
          index,
          teamId.longValue());
    }
  }

  private void backfillProjectMilestoneWorkflow() {
    if (!hasTable("project_milestones")) return;
    jdbc.execute("UPDATE project_milestones SET weight=1 WHERE weight IS NULL OR weight<=0");
    jdbc.execute("UPDATE project_milestones SET status='LOCKED' WHERE status IS NULL OR TRIM(status)=''");

    List<Long> projectIds =
        jdbc.query(
            "SELECT DISTINCT project_id FROM project_milestones ORDER BY project_id ASC",
            (rs, rowNum) -> rs.getLong("project_id"));
    for (Long projectId : projectIds) {
      List<Long> milestoneIds =
          jdbc.query(
              "SELECT id FROM project_milestones WHERE project_id=? ORDER BY sort_order ASC, created_at ASC, id ASC",
              (rs, rowNum) -> rs.getLong("id"),
              projectId);
      if (milestoneIds.isEmpty()) continue;
      jdbc.update(
          "UPDATE project_milestones SET status='ACTIVE', activated_at=COALESCE(activated_at, CURRENT_TIMESTAMP) WHERE id=? AND (status IS NULL OR status='LOCKED')",
          milestoneIds.get(0));
      for (int index = 1; index < milestoneIds.size(); index++) {
        jdbc.update(
            "UPDATE project_milestones SET status='LOCKED', completed_at=NULL WHERE id=? AND (status IS NULL OR status<>'DONE')",
            milestoneIds.get(index));
      }
    }
  }

  private void backfillTaskMilestoneAssignments() {
    if (!hasTable("tasks") || !hasColumn("tasks", "project_id") || !hasColumn("tasks", "milestone_id")) return;
    List<Long> projectIds =
        jdbc.query(
            "SELECT DISTINCT project_id FROM tasks WHERE milestone_id IS NULL ORDER BY project_id ASC",
            (rs, rowNum) -> rs.getLong("project_id"));
    for (Long projectId : projectIds) {
      List<Long> milestoneIds =
          jdbc.query(
              "SELECT id FROM project_milestones WHERE project_id=? ORDER BY CASE WHEN status='ACTIVE' THEN 0 ELSE 1 END, sort_order ASC, created_at ASC, id ASC",
              (rs, rowNum) -> rs.getLong("id"),
              projectId);
      if (milestoneIds.isEmpty()) continue;
      jdbc.update(
          "UPDATE tasks SET milestone_id=? WHERE project_id=? AND milestone_id IS NULL",
          milestoneIds.get(0),
          projectId);
    }
  }

  private void backfillProjectProgress() {
    if (!hasTable("projects") || !hasTable("tasks") || !hasColumn("projects", "progress")) return;
    List<Long> projectIds =
        jdbc.query("SELECT id FROM projects ORDER BY id ASC", (rs, rowNum) -> rs.getLong("id"));
    for (Long projectId : projectIds) {
      Integer total =
          jdbc.queryForObject(
              "SELECT COUNT(*) FROM tasks WHERE project_id=?",
              Integer.class,
              projectId);
      Integer completed =
          jdbc.queryForObject(
              "SELECT COUNT(*) FROM tasks WHERE project_id=? AND status='DONE'",
              Integer.class,
              projectId);
      int totalCount = total != null ? total : 0;
      int completedCount = completed != null ? completed : 0;
      int progress = totalCount == 0 ? 0 : (int) Math.round(completedCount * 100.0 / totalCount);
      jdbc.update("UPDATE projects SET progress=? WHERE id=?", progress, projectId);
    }
  }

  private void ensureColumn(String table, String column, String definition) {
    if (hasColumn(table, column)) return;
    jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
  }

  private boolean hasTable(String table) {
    String t = table.toLowerCase(Locale.ROOT);
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME)=?",
        Integer.class,
        t
    );
    return n != null && n > 0;
  }

  private boolean hasColumn(String table, String column) {
    if (!hasTable(table)) return false;
    // DATABASE_TO_UPPER=false means tables/cols may be stored as-is; still be defensive.
    String t = table.toLowerCase(Locale.ROOT);
    String c = column.toLowerCase(Locale.ROOT);
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME)=? AND LOWER(COLUMN_NAME)=?",
        Integer.class,
        t,
        c
    );
    return n != null && n > 0;
  }

  private void ensureVarcharColumnIfEnum(String table, String column, String definition) {
    if (!hasColumn(table, column)) return;
    try {
      String type = jdbc.queryForObject(
          "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME)=? AND LOWER(COLUMN_NAME)=?",
          String.class,
          table.toLowerCase(Locale.ROOT),
          column.toLowerCase(Locale.ROOT)
      );
      if (type != null && type.toUpperCase(Locale.ROOT).contains("ENUM")) {
        jdbc.execute("ALTER TABLE " + table + " ALTER COLUMN " + column + " " + definition);
      }
    } catch (Exception ignored) {
      // best-effort migration for local dev only
    }
  }
}
