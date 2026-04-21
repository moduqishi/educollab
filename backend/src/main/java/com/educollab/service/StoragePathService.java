package com.educollab.service;

import com.educollab.model.CourseEntity;
import com.educollab.model.ProjectEntity;
import com.educollab.model.TeamEntity;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.temporal.WeekFields;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StoragePathService {
  private final Path storageRoot;

  public StoragePathService(
      @Value("${app.storage.root:}") String configuredRoot,
      @Value("${app.file-storage.root:./data/uploads}") String uploadRoot,
      @Value("${app.git.root:./data/repos}") String repoRoot) {
    if (configuredRoot != null && !configuredRoot.isBlank()) {
      this.storageRoot = Path.of(configuredRoot);
      return;
    }
    Path upload = Path.of(uploadRoot);
    if (upload.getFileName() != null && "uploads".equalsIgnoreCase(upload.getFileName().toString())) {
      this.storageRoot = upload.getParent() != null ? upload.getParent() : upload;
      return;
    }
    Path repo = Path.of(repoRoot);
    if (repo.getFileName() != null && "repos".equalsIgnoreCase(repo.getFileName().toString())) {
      this.storageRoot = repo.getParent() != null ? repo.getParent() : repo;
      return;
    }
    this.storageRoot = upload;
  }

  public Path storageRoot() {
    return storageRoot;
  }

  public Path courseRoot(CourseEntity course) {
    return storageRoot.resolve("courses").resolve(courseSegment(course));
  }

  public Path courseFilesRoot(CourseEntity course) {
    return courseRoot(course).resolve("course-space").resolve("files");
  }

  public Path teamRoot(TeamEntity team) {
    if (team == null || team.getCourse() == null) {
      return storageRoot.resolve("system").resolve("orphan-teams");
    }
    return courseRoot(team.getCourse()).resolve("teams").resolve(teamSegment(team));
  }

  public Path teamFilesRoot(TeamEntity team) {
    return teamRoot(team).resolve("files");
  }

  public Path projectRoot(ProjectEntity project) {
    if (project == null || project.getCourse() == null) {
      return storageRoot.resolve("system").resolve("orphan-projects");
    }
    if (project.getTeam() != null) {
      return teamRoot(project.getTeam()).resolve("projects").resolve(projectSegment(project));
    }
    return courseRoot(project.getCourse()).resolve("ungrouped-projects").resolve(projectSegment(project));
  }

  public Path projectFilesRoot(ProjectEntity project) {
    return projectRoot(project).resolve("files");
  }

  public Path projectRepositoryRoot(ProjectEntity project) {
    return projectRoot(project).resolve("repository");
  }

  public Path projectSystemRoot(ProjectEntity project) {
    return projectRoot(project).resolve("system");
  }

  public Path projectActivityLogsRoot(ProjectEntity project) {
    return projectSystemRoot(project).resolve("activity-logs");
  }

  public Path projectWeeklyActivityLogFile(ProjectEntity project, LocalDateTime occurredAt) {
    LocalDateTime value = occurredAt != null ? occurredAt : LocalDateTime.now();
    WeekFields fields = WeekFields.ISO;
    int weekBasedYear = value.get(fields.weekBasedYear());
    int week = value.get(fields.weekOfWeekBasedYear());
    return projectActivityLogsRoot(project).resolve(String.format("%d-W%02d.events.jsonl", weekBasedYear, week));
  }

  public Path projectSummaryCacheRoot(ProjectEntity project) {
    return projectSystemRoot(project).resolve("summary-cache");
  }

  public Path projectAuditRoot(ProjectEntity project) {
    return projectSystemRoot(project).resolve("audit");
  }

  public Path systemImportsRoot() {
    return storageRoot.resolve("system").resolve("imports");
  }

  public Path systemExportsRoot() {
    return storageRoot.resolve("system").resolve("exports");
  }

  public Path systemTempRoot() {
    return storageRoot.resolve("system").resolve("temp");
  }

  private String courseSegment(CourseEntity course) {
    return course.getId() + "-" + slugify(course.getName() != null ? course.getName() : "course");
  }

  private String teamSegment(TeamEntity team) {
    return team.getId() + "-" + slugify(team.getName() != null ? team.getName() : "team");
  }

  private String projectSegment(ProjectEntity project) {
    return project.getId() + "-" + slugify(project.getName() != null ? project.getName() : "project");
  }

  public String slugify(String text) {
    String raw = text == null ? "item" : text.trim().toLowerCase(Locale.ROOT);
    String normalized = raw.replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "-").replaceAll("(^-|-$)", "");
    return normalized.isBlank() ? "item" : normalized;
  }
}
