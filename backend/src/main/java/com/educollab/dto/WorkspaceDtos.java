package com.educollab.dto;
import java.util.List;
public class WorkspaceDtos {
  public record TeamRecord(Long id, String name, Long courseId, String courseName, int memberCount, Long leaderId, String leaderName) {}
  public record CourseRecord(Long id, String name, String teacherName) {}
  public record ClassMemberRecord(Long id, Long userId, String name, String email, String userRole, String classRole, String joinedVia, String avatar) {}
  public record ClassInvitationRecord(Long id, Long classId, String className, Long invitedUserId, String invitedUserName, String invitedUserEmail, String invitedByName, String status, String createdAt) {}
  public record ClassRecord(Long id, String name, String classCode, String teacherName, int memberCount, int pendingInvitationCount) {}
  public record ClassDetail(ClassRecord classInfo, List<ClassMemberRecord> members, List<ClassInvitationRecord> invitations, List<AssignmentRecord> assignments, List<GroupTaskRecord> groupTasks) {}
  public record ClassSaveRequest(String name) {}
  public record JoinClassByCodeRequest(String classCode) {}
  public record ClassInvitationCreateRequest(String email) {}
  public record ProjectRecord(Long id, String name, String description, String type, String status, int progress, String courseName, String teamName, String dueDate, List<String> memberAvatars) {}
  public record ProjectSaveRequest(Long teamId, Long courseId, Long groupTaskId, String name, String description, String type, String dueDate, boolean initRepository) {}
  public record TaskRecord(Long id, Long projectId, String projectName, String title, String description, String status, Long assigneeId, String assigneeName, String dueDate, String priority) {}
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
  public record NotificationItem(
      Long id,
      String title,
      String content,
      boolean read,
      String createdAt,
      String type,
      String sourceType,
      Long sourceId,
      String sourcePath,
      String sourceLabel
  ) {}
  public record NotificationDetail(
      Long id,
      String title,
      String content,
      boolean read,
      String createdAt,
      String type,
      String sourceType,
      Long sourceId,
      String sourcePath,
      String sourceLabel
  ) {}
  public record DashboardSummary(int activeProjects, int pendingTasks, int unreadNotifications, List<ProjectRecord> projects, List<TaskRecord> urgentTasks, List<DocumentRecord> documents) {}
  public record ProjectStats(int taskCount, int completedTaskCount, int discussionCount, int documentCount, int releaseCount, int commitCount) {}
  public record CommitRecord(String hash, String message, String authorName, String createdAt, String branch) {}
  public record ReleaseRecord(Long id, String version, String title, String description, String createdAt) {}
  public record MergeRequestRecord(Long id, String title, String sourceBranch, String targetBranch, String status) {}
  public record ProjectMember(Long id, String name, String email, String role, String avatar, boolean owner) {}
  public record ProjectMemberCandidate(Long id, String name, String email, String role, String avatar, boolean fromClass) {}
  public record ProjectDetail(ProjectRecord project, ProjectStats stats, List<TaskRecord> tasks, List<DiscussionPost> discussions, List<DocumentRecord> documents, List<ProjectMember> members, boolean currentUserCanManageMembers, List<String> branches, List<CommitRecord> commits, List<ReleaseRecord> releases, List<MergeRequestRecord> mergeRequests) {}
  public record ContributionRow(String studentName, String projectName, int tasksDone, int commits, int engagement) {}
  public record TeacherOverview(int totalProjects, int activeStudents, int pendingReviews, int averageProgress, List<ProjectRecord> projects, List<ContributionRow> contributionRows) {}
  public record TeamSaveRequest(String name, Long courseId, Long leaderId, List<Long> memberIds) {}
  public record ProjectMemberAddRequest(Long userId) {}
  public record TeacherFeedbackSaveRequest(Long projectId, Integer score, String content) {}
  public record TeacherFeedbackRecord(Long id, Long projectId, String projectName, Integer score, String content, String teacherName, String createdAt) {}
  public record AssignmentRecord(
      Long id,
      Long classId,
      String className,
      Long projectId,
      String projectName,
      String title,
      String summary,
      String submissionUrl,
      String dueDate,
      String createdAt,
      String currentUserSubmissionStatus,
      String currentUserSubmittedAt,
      Integer currentUserScore,
      String currentUserTeacherFeedback,
      Integer totalSubmissions,
      Integer gradedSubmissions,
      Integer pendingSubmissions
  ) {}
  public record AssignmentSaveRequest(String title, String summary, String submissionUrl, String dueDate) {}
  public record AssignmentSubmissionRecord(
      Long id,
      Long assignmentId,
      Long classId,
      Long studentId,
      String studentName,
      String studentEmail,
      String content,
      String submissionUrl,
      String status,
      Integer score,
      String teacherFeedback,
      String submittedAt,
      String reviewedAt,
      int attemptCount,
      List<FileAssetRecord> attachments
  ) {}
  public record AssignmentSubmissionSaveRequest(String content, String submissionUrl) {}
  public record AssignmentSubmissionReviewRequest(String status, Integer score, String teacherFeedback) {}
  public record GroupTaskRecord(Long id, Long classId, String className, String title, String description, Integer minMembers, Integer maxMembers, String dueDate, String createdAt, List<GroupTaskTeamRecord> teams) {}
  public record GroupTaskSaveRequest(String title, String description, Integer minMembers, Integer maxMembers, String dueDate) {}
  public record GroupTaskTeamRecord(Long id, Long groupTaskId, String name, Long leaderId, String leaderName, int memberCount, String status, boolean canJoin, boolean canLeave, boolean canTransfer, Long projectId) {}
  public record GroupTaskTeamMember(Long userId, String name, String email, String avatar, boolean leader) {}
  public record GroupTaskTeamDetail(
      Long id,
      Long classId,
      String className,
      Long groupTaskId,
      String groupTaskTitle,
      String name,
      Long leaderId,
      String leaderName,
      String status,
      Long projectId,
      boolean currentUserLeader,
      boolean currentUserMember,
      boolean teacherView,
      List<GroupTaskTeamMember> members,
      List<GroupTaskSubTaskRecord> tasks
  ) {}
  public record GroupTaskTeamSaveRequest(String name) {}
  public record GroupTaskTransferLeaderRequest(Long leaderUserId) {}
  public record GroupTaskSubTaskRecord(Long id, Long teamId, String title, String description, String status, Long assigneeId, String assigneeName, String dueDate, String createdAt) {}
  public record GroupTaskSubTaskSaveRequest(String title, String description, String status, Long assigneeId, String dueDate) {}
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
