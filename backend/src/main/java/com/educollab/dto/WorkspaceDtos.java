package com.educollab.dto;
import java.util.List;
public class WorkspaceDtos {
  public record TeamRecord(
      Long id,
      String name,
      Long courseId,
      String courseName,
      Integer groupOrder,
      int memberCount,
      Long leaderId,
      String leaderName,
      String inviteCode,
      Long groupTaskId,
      String source,
      String status,
      String groupTaskTitle,
      Long projectId,
      String projectName) {}
  public record TeamJoinByCodeRequest(String inviteCode) {}
  public record TeamStandaloneCreateRequest(String name, Long courseId) {}
  public record TeamMemberRecord(Long userId, String name, String email, String avatar, boolean leader) {}
  public record TeamLinkedProjectRecord(
      Long projectId,
      String projectName,
      String description,
      String projectType,
      String projectStatus,
      Integer projectProgress,
      Integer taskCount,
      Integer completedTaskCount
  ) {}
  public record TeamTaskRecord(
      Long id,
      Long teamId,
      String title,
      String description,
      String status,
      Long assigneeId,
      String assigneeName,
      String dueDate,
      String createdAt
  ) {}
  public record TeamDetailRecord(
      Long id,
      String name,
      String source,
      Long courseId,
      String courseName,
      Integer groupOrder,
      Long leaderId,
      String leaderName,
      String status,
      String inviteCode,
      boolean currentUserLeader,
      boolean currentUserMember,
      boolean teacherView,
      List<TeamMemberRecord> members,
      TeamLinkedProjectRecord project,
      List<TeamTaskRecord> tasks
  ) {}
  public record ClassProjectRecord(
      Long teamId,
      String teamName,
      Integer groupOrder,
      String teamStatus,
      Long projectId,
      String projectName,
      String projectType,
      String projectStatus,
      Integer progress,
      Integer totalTaskCount,
      Integer completedTaskCount
  ) {}
  public record IdRequest(Long id) {}
  public record CourseRecord(Long id, String name, String teacherName) {}
  public record ClassMemberRecord(Long id, Long userId, String name, String email, String userRole, String classRole, String joinedVia, String avatar) {}
  public record ClassInvitationRecord(Long id, Long classId, String className, Long invitedUserId, String invitedUserName, String invitedUserEmail, String invitedByName, String status, String createdAt) {}
  public record ClassRecord(Long id, String name, String classCode, String teacherName, int memberCount, int pendingInvitationCount) {}
  public record ClassDetail(ClassRecord classInfo, List<ClassMemberRecord> members, List<ClassInvitationRecord> invitations, List<AssignmentRecord> assignments, List<GroupTaskRecord> groupTasks) {}
  public record ClassSaveRequest(String name) {}
  public record JoinClassByCodeRequest(String classCode) {}
  public record ClassInvitationCreateRequest(String email) {}
  public record ProjectRecord(
      Long id,
      String name,
      String description,
      String type,
      String status,
      int progress,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      String dueDate,
      String createdAt,
      List<String> memberAvatars) {}
  public record ProjectSaveRequest(Long teamId, Long courseId, Long groupTaskId, String name, String description, String type, String dueDate, boolean initRepository) {}
  public record ProjectMilestoneRecord(
      Long id,
      Long projectId,
      String title,
      String description,
      Integer sortOrder,
      Integer weight,
      String status,
      String activatedAt,
      String completedAt,
      Integer progressPercent,
      Integer taskCount,
      Integer completedTaskCount,
      boolean canMarkDone,
      String createdAt,
      String updatedAt) {}
  public record ProjectMilestoneSaveRequest(String title, String description, Integer weight) {}
  public record TaskRecord(
      Long id,
      Long projectId,
      String projectName,
      Long milestoneId,
      String milestoneTitle,
      Long parentTaskId,
      Integer sortOrder,
      String title,
      String description,
      String status,
      Long assigneeId,
      String assigneeName,
      String dueDate,
      String priority,
      String createdAt,
      String completedAt,
      boolean hasChildren,
      Integer childCount,
      Integer derivedProgressPercent,
      boolean canMarkDone,
      boolean canCreateChild,
      boolean blockedByMilestone,
      Integer depth) {}
  public record TaskTreeRecord(
      TaskRecord task,
      List<TaskTreeRecord> children) {}
  public record ProjectMilestoneTaskGroupRecord(
      ProjectMilestoneRecord milestone,
      List<TaskTreeRecord> rootTasks) {}
  public record TaskSaveRequest(
      Long projectId,
      Long milestoneId,
      Long parentTaskId,
      Integer sortOrder,
      String title,
      String description,
      String status,
      Long assigneeId,
      String dueDate,
      String priority) {
    public TaskSaveRequest(
        Long projectId,
        Long milestoneId,
        String title,
        String description,
        String status,
        Long assigneeId,
        String dueDate,
        String priority) {
      this(projectId, milestoneId, null, null, title, description, status, assigneeId, dueDate, priority);
    }
  }
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
  public record ProjectDetail(
      ProjectRecord project,
      ProjectStats stats,
      List<ProjectMilestoneRecord> milestones,
      List<TaskRecord> tasks,
      List<ProjectMilestoneTaskGroupRecord> milestoneTaskGroups,
      List<DiscussionPost> discussions,
      List<DocumentRecord> documents,
      List<ProjectMember> members,
      boolean currentUserCanEdit,
      boolean currentUserCanManageMembers,
      List<String> branches,
      List<CommitRecord> commits,
      List<ReleaseRecord> releases,
      List<MergeRequestRecord> mergeRequests) {}
  public record ContributionRow(String studentName, String projectName, int tasksDone, int commits, int engagement) {}
  public record TeacherOverview(int totalProjects, int activeStudents, int pendingReviews, int averageProgress, List<ProjectRecord> projects, List<ContributionRow> contributionRows) {}
  public record ProjectVisitRequest(String pageKey) {}
  public record CourseFilterRecord(Long id, String name) {}
  public record ProjectActivityEventRecord(
      Long id,
      Long projectId,
      String projectName,
      Long courseId,
      String courseName,
      Long teamId,
      String teamName,
      Long userId,
      String userName,
      String eventType,
      String targetType,
      Long targetId,
      String targetTitle,
      Integer eventCount,
      Integer linesAdded,
      Integer linesDeleted,
      Double contributionScore,
      String detailJson,
      String occurredAt) {}
  public record ContributionBreakdownRecord(
      String key,
      String label,
      Integer eventCount,
      Integer metricValue,
      Double contributionScore) {}
  public record UserContributionRecord(
      Long userId,
      String userName,
      Long projectId,
      String projectName,
      Long courseId,
      String courseName,
      String teamName,
      Double contributionScore,
      Integer eventCount,
      String lastActiveAt,
      List<ContributionBreakdownRecord> breakdowns) {}
  public record ProjectContributionSummaryRecord(
      Long projectId,
      String projectName,
      Long courseId,
      String courseName,
      String teamName,
      Double contributionScore,
      Integer activeUserCount,
      Integer eventCount) {}
  public record ProjectWeeklyReportRecord(
      Long projectId,
      String projectName,
      String weekStart,
      String weekEnd,
      String weekLabel,
      Double totalContributionScore,
      Integer activeUserCount,
      Integer eventCount,
      List<ContributionBreakdownRecord> breakdowns,
      List<UserContributionRecord> memberRankings,
      List<ProjectActivityEventRecord> timeline,
      List<ProjectActivityEventRecord> rawEvents) {}
  public record TeacherContributionReportRecord(
      Long selectedCourseId,
      String weekStart,
      String weekEnd,
      String weekLabel,
      List<CourseFilterRecord> courses,
      List<ContributionBreakdownRecord> overallBreakdowns,
      List<ProjectContributionSummaryRecord> projectRows,
      List<UserContributionRecord> userRows) {}
  public record SummaryKpiRecord(
      String key,
      String label,
      String value,
      String hint) {}
  public record SummaryLeaderboardEntry(
      Long subjectId,
      String title,
      String subtitle,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount,
      boolean highlighted) {}
  public record SummaryTrendBucket(
      String bucketKey,
      String label,
      String startDate,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount) {}
  public record SummaryHeatmapCell(
      String date,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount,
      Integer level) {}
  public record MemberSummaryRecord(
      Long userId,
      String userName,
      String teamName,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount,
      String lastActiveAt,
      List<ContributionBreakdownRecord> breakdowns) {}
  public record SummaryWeeklyDigestRecord(
      String weekStart,
      String weekEnd,
      Double contributionScore,
      Integer activeUserCount,
      Integer rawCount,
      Integer effectiveCount,
      List<ContributionBreakdownRecord> breakdowns) {}
  public record ProjectSummaryRecord(
      Long projectId,
      String projectName,
      String rangeType,
      String rangeStart,
      String rangeEnd,
      String rangeLabel,
      Long selectedMemberId,
      String selectedMemberName,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount,
      Integer activeUserCount,
      List<SummaryKpiRecord> kpis,
      List<ContributionBreakdownRecord> breakdowns,
      List<SummaryTrendBucket> trendBuckets,
      List<SummaryHeatmapCell> heatmap,
      List<SummaryLeaderboardEntry> leaderboard,
      List<MemberSummaryRecord> members,
      SummaryWeeklyDigestRecord weeklyDigest,
      List<ProjectActivityEventRecord> timeline,
      List<ProjectActivityEventRecord> rawEvents) {}
  public record TeacherSummaryRecord(
      Long selectedCourseId,
      String rangeType,
      String rangeStart,
      String rangeEnd,
      String rangeLabel,
      Integer courseCount,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount,
      Integer activeUserCount,
      List<CourseFilterRecord> courses,
      List<SummaryKpiRecord> kpis,
      List<ContributionBreakdownRecord> breakdowns,
      List<SummaryTrendBucket> trendBuckets,
      List<SummaryHeatmapCell> heatmap,
      List<SummaryLeaderboardEntry> projectLeaderboard,
      List<SummaryLeaderboardEntry> userLeaderboard,
      SummaryWeeklyDigestRecord weeklyDigest,
      List<ProjectActivityEventRecord> timeline) {}
  public record TeacherAssignmentCourseRecord(
      Long classId,
      String className,
      Integer assignmentCount,
      Integer openAssignmentCount,
      Integer closedAssignmentCount,
      Integer totalSubmissions,
      Integer pendingSubmissions,
      Integer gradedSubmissions,
      String latestDueDate) {}
  public record TeamSaveRequest(String name, Long courseId, Long leaderId, List<Long> memberIds) {}
  public record TeamTransferLeaderRequest(Long leaderUserId) {}
  public record TeamTaskSaveRequest(String title, String description, String status, Long assigneeId, String dueDate) {}
  public record TeamProjectSaveRequest(String name, String description, String type, String dueDate, boolean initRepository) {}
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
      String status,
      boolean allowSubmission,
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
      Long linkedProjectId,
      String linkedProjectName,
      Long linkedDocumentId,
      String linkedDocumentTitle,
      String linkedRepositoryName,
      String linkedRepositoryUrl,
      Integer score,
      String teacherFeedback,
      String submittedAt,
      String reviewedAt,
      int attemptCount,
      List<FileAssetRecord> attachments
  ) {}
  public record AssignmentSubmissionSaveRequest(
      String content,
      String submissionUrl,
      Long linkedProjectId,
      Long linkedDocumentId
  ) {}
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

  // --- Chat ---
  public record ChatRoomRecord(Long id, String roomType, Long projectId, String projectName, Long courseId, String courseName, String name, int memberCount, long messageCount, String lastMessage, String lastMessageAt) {}
  public record ChatMessageRecord(Long id, Long roomId, Long authorId, String authorName, String authorAvatar, String content, Long fileAssetId, String fileName, Long fileSizeBytes, String mimeType, String createdAt) {}
  public record ChatMessageSendRequest(Long roomId, String content, Long fileAssetId, String fileName, Long fileSizeBytes, String mimeType) {}
  public record ChatRoomCreateRequest(String roomType, Long projectId, Long courseId) {}

  // --- Git clone & access tokens ---
  public record GitCloneInfo(String slug, String httpUrl, String defaultBranch) {}
  public record GitTokenItem(Long id, String name, String prefix, String createdAt, String lastUsedAt, boolean revoked, String expiresAt) {}
  public record GitTokenCreateRequest(String name, Integer expiresInDays) {}
  public record GitTokenCreateResponse(String token, String prefix, String expiresAt) {}
}
