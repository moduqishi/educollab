package com.educollab.dto;

import com.educollab.dto.WorkspaceDtos.AssignmentRecord;
import com.educollab.dto.WorkspaceDtos.ClassProjectRecord;
import com.educollab.dto.WorkspaceDtos.ClassRecord;
import com.educollab.dto.WorkspaceDtos.NotificationItem;
import com.educollab.dto.WorkspaceDtos.ProjectActivityEventRecord;
import com.educollab.dto.WorkspaceDtos.ProjectDetail;
import com.educollab.dto.WorkspaceDtos.ProjectRecord;
import com.educollab.dto.WorkspaceDtos.TeamDetailRecord;
import com.educollab.dto.WorkspaceDtos.TeamRecord;
import com.educollab.model.UserRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AdminDtos {
  public record AdminStats(
      long totalUsers,
      long totalStudents,
      long totalTeachers,
      long totalCourses,
      long totalProjects,
      long totalTasks,
      long totalDiscussions,
      long totalAssignments
  ) {}

  public record AdminMetricRecord(
      String key,
      String label,
      String value,
      String hint
  ) {}

  public record AdminHealthRecord(
      String key,
      String label,
      String status,
      String detail,
      String checkedAt
  ) {}

  public record AdminSystemResourceRecord(
      String key,
      String label,
      String value,
      String unit,
      Long used,
      Long total,
      Integer usagePercent,
      String status,
      String hint
  ) {}

  public record AdminIssueRecord(
      String key,
      String title,
      String detail,
      String href,
      String level
  ) {}

  public record AdminActivityRecord(
      String title,
      String detail,
      String createdAt,
      String href
  ) {}

  public record AdminOverviewRecord(
      List<AdminMetricRecord> metrics,
      List<AdminSystemResourceRecord> resourceMetrics,
      List<AdminHealthRecord> healthChecks,
      List<AdminIssueRecord> pendingItems,
      List<AdminActivityRecord> recentActivities,
      String checkedAt
  ) {}

  public record UserSummary(
      Long id,
      String name,
      String email,
      UserRole role,
      Boolean active,
      String avatar,
      Integer courseCount,
      Integer teamCount,
      Integer projectCount,
      String lastActiveAt,
      LocalDate createdAt
  ) {}

  public record UpdateUserRoleRequest(Long userId, UserRole role) {}

  public record UpdateUserRequest(
      String name,
      String email,
      UserRole role,
      Boolean active
  ) {}

  public record ResetPasswordRequest(String newPassword) {}

  public record UserAssignmentDigest(
      Long submissionId,
      Long assignmentId,
      String assignmentTitle,
      String status,
      Integer score,
      String submittedAt
  ) {}

  public record UserDetailRecord(
      UserSummary user,
      List<ClassRecord> courses,
      List<TeamRecord> teams,
      List<ProjectRecord> projects,
      List<UserAssignmentDigest> submissions,
      List<ProjectActivityEventRecord> recentActivity,
      List<NotificationItem> recentNotifications,
      List<AdminAuditRecord> audits
  ) {}

  public record CourseSummary(
      Long id,
      String name,
      String classCode,
      String teacherName,
      Long teacherId,
      int memberCount,
      int teamCount,
      int projectCount,
      int assignmentCount,
      LocalDate createdAt
  ) {}

  public record TeacherOption(
      Long id,
      String name,
      String email
  ) {}

  public record UpdateCourseRequest(Long courseId, String name, String classCode, Long teacherId) {}

  public record CreateCourseRequest(
      String name,
      String classCode,
      Long teacherId
  ) {}

  public record CourseMemberSaveRequest(
      Long userId,
      String role
  ) {}

  public record CourseDetailRecord(
      ClassRecord classInfo,
      List<com.educollab.dto.WorkspaceDtos.ClassMemberRecord> members,
      List<TeamRecord> teams,
      List<ClassProjectRecord> projects,
      List<AssignmentRecord> assignments,
      List<TeacherOption> teacherOptions,
      List<AdminImportJobRecord> importJobs,
      List<AdminAuditRecord> audits
  ) {}

  public record ProjectSummary(
      Long id,
      String name,
      String type,
      String status,
      int progress,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      String currentMilestoneTitle,
      Integer memberCount,
      String lastActiveAt,
      LocalDate createdAt
  ) {}

  public record UpdateProjectStatusRequest(Long projectId, String status) {}

  public record UpdateProjectRequest(
      Long projectId,
      String name,
      String description,
      String status,
      Long courseId,
      Long teamId,
      String dueDate
  ) {}

  public record ProjectMemberSaveRequest(
      Long userId,
      Boolean ownerFlag
  ) {}

  public record ProjectDetailRecord(
      ProjectDetail projectDetail,
      List<CourseSummary> courseOptions,
      List<TeamSummary> teamOptions,
      List<UserSummary> memberCandidates,
      List<AdminAuditRecord> audits
  ) {}

  public record TeamSummary(
      Long id,
      String name,
      Long courseId,
      String courseName,
      Integer groupOrder,
      Long leaderId,
      String leaderName,
      int memberCount,
      Long projectId,
      String projectName,
      String source,
      String status,
      boolean missingLeader,
      boolean missingProject,
      LocalDate createdAt
  ) {}

  public record UpdateTeamRequest(
      Long courseId,
      String name,
      String status,
      Integer groupOrder,
      Long leaderUserId
  ) {}

  public record CreateTeamRequest(
      String name,
      Long courseId,
      Integer groupOrder,
      Long leaderUserId,
      List<Long> memberIds,
      String status
  ) {}

  public record TeamMemberAddRequest(Long userId) {}

  public record TeamTransferLeaderRequest(Long leaderUserId) {}

  public record TeamDetailAdminRecord(
      TeamDetailRecord teamDetail,
      List<UserSummary> memberCandidates,
      List<AdminAuditRecord> audits
  ) {}

  public record TaskSummary(
      Long id,
      String title,
      String description,
      String status,
      String priority,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      Long projectId,
      String projectName,
      String assigneeName,
      String dueDate
  ) {}

  public record TaskSaveRequest(
      Long taskId,
      String title,
      String description,
      String status,
      Long assigneeId,
      String dueDate,
      String priority
  ) {}

  public record DiscussionSummary(
      Long id,
      String title,
      String category,
      String status,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      Long projectId,
      String projectName,
      String authorName,
      int replyCount,
      LocalDate createdAt
  ) {}

  public record UpdateDiscussionStatusRequest(Long discussionId, String status) {}

  public record AssignmentSummary(
      Long id,
      Long courseId,
      String courseName,
      String dueDate,
      int totalSubmissions,
      int gradedSubmissions,
      LocalDate createdAt
  ) {}

  public record DocumentSummary(
      Long id,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      Long projectId,
      String projectName,
      String title,
      String kind,
      String updatedAt,
      Long fileAssetId
  ) {}

  public record UserCourseMembershipRequest(
      Long courseId,
      String role
  ) {}

  public record UserTeamMembershipRequest(Long teamId) {}

  public record UserProjectMembershipRequest(
      Long projectId,
      Boolean ownerFlag
  ) {}

  public record AdminAuditRecord(
      Long id,
      String scopeType,
      Long scopeId,
      String scopeTitle,
      String actionType,
      String detail,
      String adminName,
      String createdAt
  ) {}

  public record AdminImportPreviewRowRecord(
      Integer rowNumber,
      String name,
      String email,
      String groupName,
      String action,
      String message
  ) {}

  public record AdminImportPreviewRecord(
      Integer totalRows,
      Integer readyRows,
      Integer skippedRows,
      Integer createUserRows,
      List<AdminImportPreviewRowRecord> rows
  ) {}

  public record AdminImportJobRecord(
      Long id,
      Long courseId,
      String courseName,
      String fileName,
      String status,
      Integer totalRows,
      Integer importedRows,
      Integer skippedRows,
      Integer createdUsersCount,
      String createdByName,
      String createdAt,
      String reportJson
  ) {}

  public record AdminImportResultRecord(
      AdminImportJobRecord job,
      Integer importedRows,
      Integer skippedRows,
      Integer createdUsersCount,
      List<String> warnings
  ) {}

  public record AdminSystemOverviewRecord(
      List<AdminMetricRecord> metrics,
      List<AdminHealthRecord> healthChecks,
      List<AdminImportJobRecord> recentImports,
      List<AdminAuditRecord> recentAudits
  ) {}

  public record AdminStorageTreeRecord(
      String nodeType,
      String nodeKey,
      Long courseId,
      Long teamId,
      Long projectId,
      String title,
      String subtitle,
      Integer fileCount,
      Integer repoCount,
      Integer logCount,
      List<AdminStorageTreeRecord> children
  ) {}

  public record AdminStorageItemRecord(
      String itemType,
      Long id,
      String name,
      String path,
      Long sizeBytes,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      Long projectId,
      String projectName,
      String ownerType,
      Long ownerId,
      String updatedAt,
      boolean orphaned
  ) {}

  public record AdminStorageBreadcrumbRecord(
      String name,
      String path
  ) {}

  public record AdminStorageDirectoryEntryRecord(
      String path,
      String name,
      String itemType,
      Long sizeBytes,
      String updatedAt
  ) {}

  public record AdminStorageDirectoryRecord(
      Long projectId,
      String projectName,
      String currentPath,
      boolean readOnly,
      List<AdminStorageBreadcrumbRecord> breadcrumbs,
      List<AdminStorageDirectoryEntryRecord> entries
  ) {}

  public record AdminStorageFilePreviewRecord(
      Long projectId,
      String path,
      boolean binary,
      String encoding,
      String content,
      Long sizeBytes
  ) {}

  public record AdminSystemHealthRecord(
      String serviceKey,
      String label,
      String status,
      String detail,
      String checkedAt
  ) {}

  public record AdminBulkActionPreviewRecord(
      String action,
      Integer totalCount,
      Integer affectedCount,
      List<String> warnings
  ) {}

  public record AdminBulkActionResultRecord(
      String action,
      Integer affectedCount,
      List<String> warnings
  ) {}

  public record AdminAnnouncementRequest(
      String title,
      String content,
      String sourcePath,
      String sourceLabel
  ) {}

  public record AdminActionResultRecord(
      String message,
      Integer affectedCount
  ) {}
}
