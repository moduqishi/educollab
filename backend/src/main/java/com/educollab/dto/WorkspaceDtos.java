package com.educollab.dto;
import java.util.List;
public class WorkspaceDtos {
  public record TeamRecord(Long id, String name, Long courseId, String courseName, int memberCount, Long leaderId, String leaderName) {}
  public record CourseRecord(Long id, String name, String teacherName) {}
  public record ProjectRecord(Long id, String name, String description, String type, String status, int progress, String courseName, String teamName, String dueDate, List<String> memberAvatars) {}
  public record TaskRecord(Long id, Long projectId, String projectName, String title, String description, String status, String assigneeName, String dueDate, String priority) {}
  public record TaskSaveRequest(Long projectId, String title, String description, String status, Long assigneeId, String dueDate, String priority) {}
  public record DiscussionReply(Long id, String authorName, String content, String createdAt) {}
  public record DiscussionPost(Long id, Long projectId, String projectName, String title, String content, String authorName, int replyCount, String createdAt, String category, String status, int linkedTaskCount) {}
  public record DiscussionDetail(Long id, Long projectId, String projectName, String title, String content, String authorName, String createdAt, String category, String status, List<DiscussionReply> replies, List<FileAssetRecord> attachments, List<TaskRecord> linkedTasks) {}
  public record DiscussionSaveRequest(Long projectId, String title, String content, String category) {}
  public record DiscussionReplyRequest(String content) {}
  public record DiscussionUpdateRequest(String status, String category) {}
  public record DocumentRecord(Long id, Long projectId, String projectName, String title, String excerpt, String updatedAt, List<String> collaborators, String collabKey, String currentContent, String kind, String officeExt, Long fileAssetId) {}
  public record DocumentSaveRequest(Long projectId, String title, String currentContent) {}
  public record DocumentUpdateRequest(String title) {}
  public record DocumentAutosaveRequest(String currentContent, String excerpt, boolean saveVersion, String versionLabel) {}
  public record DocumentVersionRecord(Long id, String label, String createdBy, String createdAt, String snapshotContent, Long fileAssetId) {}
  public record NotificationItem(Long id, String title, String content, boolean read, String createdAt, String type) {}
  public record DashboardSummary(int activeProjects, int pendingTasks, int unreadNotifications, List<ProjectRecord> projects, List<TaskRecord> urgentTasks, List<DocumentRecord> documents) {}
  public record ProjectStats(int taskCount, int completedTaskCount, int discussionCount, int documentCount, int releaseCount, int commitCount) {}
  public record CommitRecord(String hash, String message, String authorName, String createdAt, String branch) {}
  public record ReleaseRecord(Long id, String version, String title, String description, String createdAt) {}
  public record MergeRequestRecord(Long id, String title, String sourceBranch, String targetBranch, String status) {}
  public record ProjectMember(Long id, String name, String email, String role, String avatar) {}
  public record ProjectDetail(ProjectRecord project, ProjectStats stats, List<TaskRecord> tasks, List<DiscussionPost> discussions, List<DocumentRecord> documents, List<ProjectMember> members, List<String> branches, List<CommitRecord> commits, List<ReleaseRecord> releases, List<MergeRequestRecord> mergeRequests) {}
  public record ContributionRow(String studentName, String projectName, int tasksDone, int commits, int engagement) {}
  public record TeacherOverview(int totalProjects, int activeStudents, int pendingReviews, int averageProgress, List<ProjectRecord> projects, List<ContributionRow> contributionRows) {}
  public record TeamSaveRequest(String name, Long courseId, Long leaderId, List<Long> memberIds) {}
  public record ProjectSaveRequest(Long teamId, Long courseId, String name, String description, String type, String dueDate, boolean initRepository) {}
  public record ProjectMemberAddRequest(Long userId) {}
  public record TeacherFeedbackSaveRequest(Long projectId, Integer score, String content) {}
  public record TeacherFeedbackRecord(Long id, Long projectId, String projectName, Integer score, String content, String teacherName, String createdAt) {}
  public record AssignmentRecord(Long id, Long projectId, String projectName, String title, String summary, String submissionUrl, String createdAt) {}
  public record FileAssetRecord(Long id, String fileName, String ownerType, Long ownerId, String mimeType, Long sizeBytes, String createdAt) {}
  public record MergeRequestSaveRequest(Long projectId, String title, String sourceBranch, String targetBranch) {}
  public record ReleaseSaveRequest(Long projectId, String version, String title, String description) {}
  public record BranchCreateRequest(Long projectId, String name) {}

  // --- Git clone & access tokens ---
  public record GitCloneInfo(String slug, String httpUrl, String defaultBranch) {}
  public record GitTokenItem(Long id, String name, String prefix, String createdAt, String lastUsedAt, boolean revoked, String expiresAt) {}
  public record GitTokenCreateRequest(String name, Integer expiresInDays) {}
  public record GitTokenCreateResponse(String token, String prefix, String expiresAt) {}
}
