package com.educollab.common.config;

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

  private void ensureColumn(String table, String column, String definition) {
    if (hasColumn(table, column)) return;
    jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
  }

  private boolean hasColumn(String table, String column) {
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
