package com.educollab.common.config;

import java.util.List;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
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
public class LocalDbMigrations implements ApplicationRunner {
  private final JdbcTemplate jdbc;

  public LocalDbMigrations(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    ensureColumn("courses", "class_code", "VARCHAR(20)");
    backfillClassCodes();

    ensureColumn("teams", "group_task_id", "BIGINT");
    ensureColumn("teams", "status", "VARCHAR(20) NOT NULL DEFAULT 'FORMING'");
    ensureColumn("projects", "group_task_id", "BIGINT");
    ensureColumn("assignments", "course_id", "BIGINT");
    ensureColumn("assignments", "due_date", "DATE");
    ensureAssignmentSubmissionsTable();

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
    try {
      String type = jdbc.queryForObject(
          "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE LOWER(TABLE_NAME)=? AND LOWER(COLUMN_NAME)=?",
          String.class,
          "file_assets",
          "owner_type"
      );
      if (type != null && type.toUpperCase(Locale.ROOT).contains("ENUM")) {
        jdbc.execute("ALTER TABLE file_assets ALTER COLUMN owner_type VARCHAR(30)");
      }
    } catch (Exception ignored) {
      // best-effort migration for local dev only
    }
  }

  private void ensureAssignmentSubmissionsTable() {
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS assignment_submissions (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          assignment_id BIGINT NOT NULL,
          student_id BIGINT NOT NULL,
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
}
