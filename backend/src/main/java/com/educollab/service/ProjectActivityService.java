package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.ContributionBreakdownRecord;
import com.educollab.dto.WorkspaceDtos.CourseFilterRecord;
import com.educollab.dto.WorkspaceDtos.MemberSummaryRecord;
import com.educollab.dto.WorkspaceDtos.ProjectActivityEventRecord;
import com.educollab.dto.WorkspaceDtos.ProjectContributionSummaryRecord;
import com.educollab.dto.WorkspaceDtos.ProjectSummaryRecord;
import com.educollab.dto.WorkspaceDtos.ProjectWeeklyReportRecord;
import com.educollab.dto.WorkspaceDtos.SummaryHeatmapCell;
import com.educollab.dto.WorkspaceDtos.SummaryKpiRecord;
import com.educollab.dto.WorkspaceDtos.SummaryLeaderboardEntry;
import com.educollab.dto.WorkspaceDtos.SummaryTrendBucket;
import com.educollab.dto.WorkspaceDtos.SummaryWeeklyDigestRecord;
import com.educollab.dto.WorkspaceDtos.TeacherContributionReportRecord;
import com.educollab.dto.WorkspaceDtos.TeacherSummaryRecord;
import com.educollab.dto.WorkspaceDtos.UserContributionRecord;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.CourseEntity;
import com.educollab.model.DiscussionPostEntity;
import com.educollab.model.DiscussionReplyEntity;
import com.educollab.model.DocumentVersionEntity;
import com.educollab.model.ProjectActivityEventEntity;
import com.educollab.model.ProjectActivityEventType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMilestoneEntity;
import com.educollab.model.ProjectMilestoneStatus;
import com.educollab.model.ProjectStatus;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskStatus;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.DiscussionPostRepository;
import com.educollab.repo.DiscussionReplyRepository;
import com.educollab.repo.DocumentVersionRepository;
import com.educollab.repo.ProjectActivityEventRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectMilestoneRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProjectActivityService {
  private static final double VISIT_DIVISOR = 20.0;
  private static final double FILE_UPLOAD_POINTS = 1.0;
  private static final double DOCUMENT_VERSION_POINTS = 1.0;
  private static final double TASK_CREATE_POINTS = 1.0;
  private static final double TASK_COMPLETE_POINTS = 2.0;
  private static final double DISCUSSION_POST_POINTS = 1.0;
  private static final double DISCUSSION_REPLY_POINTS = 0.5;
  private static final double ASSIGNMENT_SUBMIT_POINTS = 3.0;
  private static final double GIT_COMMIT_POINTS = 1.0;
  private static final double GIT_LINE_DIVISOR = 100.0;

  private final ProjectActivityEventRepository eventRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMilestoneRepository milestoneRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final DiscussionPostRepository discussionPostRepository;
  private final DiscussionReplyRepository discussionReplyRepository;
  private final DocumentVersionRepository documentVersionRepository;
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final ProjectAccessService projectAccessService;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;
  private final StoragePathService storagePathService;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public ProjectActivityService(
      ProjectActivityEventRepository eventRepository,
      ProjectRepository projectRepository,
      ProjectMilestoneRepository milestoneRepository,
      ProjectMemberRepository projectMemberRepository,
      DiscussionPostRepository discussionPostRepository,
      DiscussionReplyRepository discussionReplyRepository,
      DocumentVersionRepository documentVersionRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      ProjectAccessService projectAccessService,
      UserRepository userRepository,
      ObjectMapper objectMapper,
      StoragePathService storagePathService) {
    this.eventRepository = eventRepository;
    this.projectRepository = projectRepository;
    this.milestoneRepository = milestoneRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.discussionPostRepository = discussionPostRepository;
    this.discussionReplyRepository = discussionReplyRepository;
    this.documentVersionRepository = documentVersionRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.projectAccessService = projectAccessService;
    this.userRepository = userRepository;
    this.objectMapper = objectMapper;
    this.storagePathService = storagePathService;
  }

  @Transactional
  public void trackProjectVisit(Long projectId, String pageKey, JwtPrincipal principal) {
    ProjectEntity project = projectAccessService.requireVisible(projectId, principal);
    String normalizedPage = (pageKey == null || pageKey.isBlank()) ? "overview" : pageKey.trim().toLowerCase(Locale.ROOT);
    LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
    ProjectActivityEventEntity recent =
        eventRepository.findFirstByProjectIdAndUserIdAndEventTypeAndOccurredAtGreaterThanEqualOrderByOccurredAtDesc(
            projectId,
            principal.userId(),
            ProjectActivityEventType.PROJECT_VISIT,
            threshold);
    if (recent != null) {
      return;
    }
    saveEvent(
        project,
        principal.userId(),
        ProjectActivityEventType.PROJECT_VISIT,
        "PAGE",
        null,
        normalizedPage,
        1,
        null,
        null,
        null,
        detail("pageKey", normalizedPage),
        LocalDateTime.now());
  }

  @Transactional
  public List<ProjectActivityEventRecord> projectActivity(Long projectId, LocalDate weekStart, JwtPrincipal principal) {
    projectAccessService.requireVisible(projectId, principal);
    seedHistoricalProjectEvents(projectId);
    WeekWindow window = normalizeWeekWindow(weekStart);
    return eventRepository
        .findByProjectIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
            projectId, window.start(), window.endExclusive())
        .stream()
        .map(this::toEventRecord)
        .toList();
  }

  @Transactional
  public ProjectWeeklyReportRecord projectWeeklyReport(Long projectId, LocalDate weekStart, JwtPrincipal principal) {
    ProjectEntity project = projectAccessService.requireVisible(projectId, principal);
    seedHistoricalProjectEvents(projectId);
    WeekWindow window = normalizeWeekWindow(weekStart);
    List<ProjectActivityEventEntity> events =
        eventRepository.findByProjectIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
            projectId, window.start(), window.endExclusive());
    List<ProjectActivityEventRecord> rawEvents = events.stream().map(this::toEventRecord).toList();
    List<UserContributionRecord> memberRankings = buildUserContributionRows(events);
    List<ContributionBreakdownRecord> breakdowns = buildBreakdowns(events);
    double totalContribution = memberRankings.stream().mapToDouble(UserContributionRecord::contributionScore).sum();
    int activeUserCount = (int) events.stream().map(ProjectActivityEventEntity::getUser).filter(Objects::nonNull).map(UserEntity::getId).distinct().count();
    return new ProjectWeeklyReportRecord(
        project.getId(),
        project.getName(),
        window.startDate().toString(),
        window.endDate().toString(),
        weekLabel(window),
        round(totalContribution),
        activeUserCount,
        events.size(),
        breakdowns,
        memberRankings,
        rawEvents.stream().limit(20).toList(),
        rawEvents);
  }

  @Transactional
  public TeacherContributionReportRecord teacherContributionReport(Long courseId, LocalDate weekStart, JwtPrincipal principal) {
    if (principal.role() != UserRole.TEACHER) {
      throw new ApiException("只有教师可以查看总结总览");
    }
    List<ProjectEntity> visibleProjects = projectAccessService.visibleProjects(principal).stream()
        .filter(project -> courseId == null || (project.getCourse() != null && Objects.equals(project.getCourse().getId(), courseId)))
        .toList();
    visibleProjects.forEach(project -> seedHistoricalProjectEvents(project.getId()));
    WeekWindow window = normalizeWeekWindow(weekStart);
    List<Long> projectIds = visibleProjects.stream().map(ProjectEntity::getId).toList();
    List<ProjectActivityEventEntity> events = projectIds.isEmpty()
        ? List.of()
        : eventRepository.findByProjectIdInAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(projectIds, window.start(), window.endExclusive());
    List<CourseFilterRecord> courses = projectAccessService.visibleProjects(principal).stream()
        .map(ProjectEntity::getCourse)
        .filter(Objects::nonNull)
        .collect(Collectors.toMap(CourseEntity::getId, course -> new CourseFilterRecord(course.getId(), course.getName()), (left, right) -> left, LinkedHashMap::new))
        .values()
        .stream()
        .toList();
    return new TeacherContributionReportRecord(
        courseId,
        window.startDate().toString(),
        window.endDate().toString(),
        weekLabel(window),
        courses,
        buildBreakdowns(events),
        buildProjectSummaries(visibleProjects, events),
        buildUserContributionRows(events));
  }

  @Transactional
  public ProjectSummaryRecord projectSummary(
      Long projectId,
      String rangeType,
      LocalDate anchorDate,
      LocalDate startDate,
      LocalDate endDate,
      Long memberId,
      JwtPrincipal principal) {
    ProjectEntity project = projectAccessService.requireVisible(projectId, principal);
    seedHistoricalProjectEvents(projectId);
    List<ProjectActivityEventEntity> allEvents = eventRepository.findByProjectIdOrderByOccurredAtAsc(projectId);
    SummaryRange range = resolveRange(rangeType, anchorDate, startDate, endDate, earliestDate(project, allEvents));
    Map<Long, Double> effectiveScores = buildEffectiveScoreMap(allEvents);
    List<ProjectActivityEventEntity> rangeEvents = filterEventsByRange(allEvents, range);
    List<MemberSummaryRecord> members = buildMemberSummaries(rangeEvents, effectiveScores);
    List<ProjectActivityEventEntity> focusEvents = filterEventsByMember(rangeEvents, memberId);
    Long resolvedMemberId = memberId != null && members.stream().anyMatch(item -> Objects.equals(item.userId(), memberId)) ? memberId : null;
    String selectedMemberName = resolvedMemberId == null
        ? null
        : members.stream().filter(item -> Objects.equals(item.userId(), resolvedMemberId)).map(MemberSummaryRecord::userName).findFirst().orElse(null);
    if (resolvedMemberId == null) {
      focusEvents = rangeEvents;
    }
    SummaryWeeklyDigestRecord weeklyDigest = buildWeeklyDigest(focusEvents, effectiveScores, range);
    return new ProjectSummaryRecord(
        project.getId(),
        project.getName(),
        range.rangeType(),
        range.startDate().toString(),
        range.endDate().toString(),
        range.label(),
        resolvedMemberId,
        selectedMemberName,
        round(totalScore(focusEvents, effectiveScores)),
        focusEvents.size(),
        effectiveCount(focusEvents, effectiveScores),
        activeUserCount(focusEvents),
        List.of(
            new SummaryKpiRecord("score", "贡献值", formatOneDecimal(totalScore(focusEvents, effectiveScores)), "当前筛选范围内的有效贡献"),
            new SummaryKpiRecord("effective", "有效行为", String.valueOf(effectiveCount(focusEvents, effectiveScores)), "已去除刷分和重复计分"),
            new SummaryKpiRecord("raw", "原始日志", String.valueOf(focusEvents.size()), "完整保留的行为记录"),
            new SummaryKpiRecord("active", "活跃成员", String.valueOf(activeUserCount(focusEvents)), "范围内至少有一条行为的成员")),
        buildBreakdowns(focusEvents, effectiveScores),
        buildTrendBuckets(focusEvents, effectiveScores, range),
        buildHeatmap(focusEvents, effectiveScores, range),
        buildMemberLeaderboard(members, resolvedMemberId),
        members,
        weeklyDigest,
        toEventRecordsDescending(focusEvents, effectiveScores, 20),
        toEventRecordsDescending(focusEvents, effectiveScores, 80));
  }

  @Transactional
  public List<ProjectActivityEventRecord> projectSummaryActivity(
      Long projectId,
      String rangeType,
      LocalDate anchorDate,
      LocalDate startDate,
      LocalDate endDate,
      Long memberId,
      JwtPrincipal principal) {
    ProjectEntity project = projectAccessService.requireVisible(projectId, principal);
    seedHistoricalProjectEvents(projectId);
    List<ProjectActivityEventEntity> allEvents = eventRepository.findByProjectIdOrderByOccurredAtAsc(projectId);
    SummaryRange range = resolveRange(rangeType, anchorDate, startDate, endDate, earliestDate(project, allEvents));
    Map<Long, Double> effectiveScores = buildEffectiveScoreMap(allEvents);
    List<ProjectActivityEventEntity> rangeEvents = filterEventsByMember(filterEventsByRange(allEvents, range), memberId);
    return toEventRecordsDescending(rangeEvents, effectiveScores, 200);
  }

  @Transactional
  public TeacherSummaryRecord teacherSummary(
      Long courseId,
      String rangeType,
      LocalDate anchorDate,
      LocalDate startDate,
      LocalDate endDate,
      JwtPrincipal principal) {
    if (principal.role() != UserRole.TEACHER) {
      throw new ApiException("只有教师可以查看总结总览");
    }
    List<ProjectEntity> visibleProjects = projectAccessService.visibleProjects(principal).stream()
        .filter(project -> courseId == null || (project.getCourse() != null && Objects.equals(project.getCourse().getId(), courseId)))
        .toList();
    visibleProjects.forEach(project -> seedHistoricalProjectEvents(project.getId()));
    List<Long> projectIds = visibleProjects.stream().map(ProjectEntity::getId).toList();
    List<ProjectActivityEventEntity> allEvents = projectIds.isEmpty() ? List.of() : eventRepository.findByProjectIdInOrderByOccurredAtAsc(projectIds);
    SummaryRange range = resolveRange(rangeType, anchorDate, startDate, endDate, earliestDate(visibleProjects, allEvents));
    Map<Long, Double> effectiveScores = buildEffectiveScoreMap(allEvents);
    List<ProjectActivityEventEntity> rangeEvents = filterEventsByRange(allEvents, range);
    List<MemberSummaryRecord> members = buildMemberSummaries(rangeEvents, effectiveScores);
    List<ProjectSummarySlice> projectSlices = buildProjectSummarySlices(rangeEvents, effectiveScores);
    List<CourseFilterRecord> courses = projectAccessService.visibleProjects(principal).stream()
        .map(ProjectEntity::getCourse)
        .filter(Objects::nonNull)
        .collect(Collectors.toMap(CourseEntity::getId, course -> new CourseFilterRecord(course.getId(), course.getName()), (left, right) -> left, LinkedHashMap::new))
        .values()
        .stream()
        .toList();
    return new TeacherSummaryRecord(
        courseId,
        range.rangeType(),
        range.startDate().toString(),
        range.endDate().toString(),
        range.label(),
        courseId == null ? courses.size() : (courseId != null ? 1 : 0),
        round(totalScore(rangeEvents, effectiveScores)),
        rangeEvents.size(),
        effectiveCount(rangeEvents, effectiveScores),
        activeUserCount(rangeEvents),
        courses,
        List.of(
            new SummaryKpiRecord("score", "贡献值", formatOneDecimal(totalScore(rangeEvents, effectiveScores)), "当前课程筛选的有效贡献"),
            new SummaryKpiRecord("projects", "项目数", String.valueOf(projectSlices.size()), "当前范围内有行为的项目"),
            new SummaryKpiRecord("members", "活跃成员", String.valueOf(activeUserCount(rangeEvents)), "当前范围内有行为的成员"),
            new SummaryKpiRecord("effective", "有效行为", String.valueOf(effectiveCount(rangeEvents, effectiveScores)), "已过滤刷分与重复完成")),
        buildBreakdowns(rangeEvents, effectiveScores),
        buildTrendBuckets(rangeEvents, effectiveScores, range),
        buildHeatmap(rangeEvents, effectiveScores, range),
        buildProjectLeaderboard(projectSlices),
        buildMemberLeaderboard(members, null),
        buildWeeklyDigest(rangeEvents, effectiveScores, range),
        toEventRecordsDescending(rangeEvents, effectiveScores, 30));
  }

  @Transactional
  public void recordProjectCreated(ProjectEntity project, Long actorUserId) {
    saveEvent(
        project,
        actorUserId,
        ProjectActivityEventType.PROJECT_CREATED,
        "PROJECT",
        project.getId(),
        project.getName(),
        1,
        null,
        null,
        "project-created:" + project.getId(),
        detail("status", project.getStatus() != null ? project.getStatus().name() : ProjectStatus.ACTIVE.name()),
        project.getCreatedAt() != null ? project.getCreatedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordMilestoneCreated(ProjectMilestoneEntity milestone, Long actorUserId, boolean defaultTemplate) {
    saveEvent(
        milestone.getProject(),
        actorUserId,
        ProjectActivityEventType.MILESTONE_CREATED,
        "MILESTONE",
        milestone.getId(),
        milestone.getTitle(),
        1,
        null,
        null,
        "milestone-created:" + milestone.getId(),
        detail(
            "defaultTemplate", defaultTemplate,
            "weight", Objects.requireNonNullElse(milestone.getWeight(), 1)),
        milestone.getCreatedAt() != null ? milestone.getCreatedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordMilestoneCompletionChanges(
      List<ProjectMilestoneEntity> milestones,
      Map<Long, ProjectMilestoneStatus> beforeStatuses,
      Map<Long, ProjectMilestoneStatus> afterStatuses,
      Long actorUserId) {
    for (ProjectMilestoneEntity milestone : milestones) {
      ProjectMilestoneStatus before = beforeStatuses.get(milestone.getId());
      ProjectMilestoneStatus after = afterStatuses.get(milestone.getId());
      if (before != ProjectMilestoneStatus.DONE && after == ProjectMilestoneStatus.DONE) {
        saveEvent(
            milestone.getProject(),
            actorUserId,
            ProjectActivityEventType.MILESTONE_COMPLETED,
            "MILESTONE",
            milestone.getId(),
            milestone.getTitle(),
            1,
            null,
            null,
            completionKey("milestone-completed", milestone.getId(), milestone.getCompletedAt()),
            detail("weight", Objects.requireNonNullElse(milestone.getWeight(), 1)),
            milestone.getCompletedAt() != null ? milestone.getCompletedAt() : LocalDateTime.now());
      }
    }
  }

  @Transactional
  public void recordTaskSaved(TaskEntity task, boolean created, TaskStatus previousStatus, TaskStatus nextStatus, boolean leafTask, Long actorUserId) {
    if (created) {
      saveEvent(
          task.getProject(),
          actorUserId,
          ProjectActivityEventType.TASK_CREATED,
          "TASK",
          task.getId(),
          task.getTitle(),
          1,
          null,
          null,
          "task-created:" + task.getId(),
          detail(
              "milestoneId", task.getMilestone() != null ? task.getMilestone().getId() : null,
              "parentTaskId", task.getParentTask() != null ? task.getParentTask().getId() : null),
          task.getCreatedAt() != null ? task.getCreatedAt() : LocalDateTime.now());
    }
    if (previousStatus != null && previousStatus != nextStatus) {
      saveEvent(
          task.getProject(),
          actorUserId,
          ProjectActivityEventType.TASK_STATUS_CHANGED,
          "TASK",
          task.getId(),
          task.getTitle(),
          1,
          null,
          null,
          completionKey("task-status", task.getId(), task.getUpdatedAt()),
          detail("from", previousStatus.name(), "to", nextStatus.name()),
          LocalDateTime.now());
    }
    if (leafTask && nextStatus == TaskStatus.DONE && previousStatus != TaskStatus.DONE) {
      saveEvent(
          task.getProject(),
          actorUserId,
          ProjectActivityEventType.TASK_COMPLETED,
          "TASK",
          task.getId(),
          task.getTitle(),
          1,
          null,
          null,
          completionKey("task-completed", task.getId(), task.getCompletedAt()),
          detail("assigneeId", task.getAssignee() != null ? task.getAssignee().getId() : null),
          task.getCompletedAt() != null ? task.getCompletedAt() : LocalDateTime.now());
    }
  }

  @Transactional
  public void recordDiscussionPostCreated(DiscussionPostEntity post, Long actorUserId) {
    saveEvent(
        post.getProject(),
        actorUserId,
        ProjectActivityEventType.DISCUSSION_POST_CREATED,
        "DISCUSSION_POST",
        post.getId(),
        post.getTitle(),
        1,
        null,
        null,
        "discussion-post:" + post.getId(),
        detail("category", post.getCategory() != null ? post.getCategory().name() : "GENERAL"),
        post.getCreatedAt() != null ? post.getCreatedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordDiscussionReplyCreated(DiscussionReplyEntity reply, Long actorUserId) {
    saveEvent(
        reply.getPost().getProject(),
        actorUserId,
        ProjectActivityEventType.DISCUSSION_REPLY_CREATED,
        "DISCUSSION_REPLY",
        reply.getId(),
        reply.getPost().getTitle(),
        1,
        null,
        null,
        "discussion-reply:" + reply.getId(),
        detail("postId", reply.getPost().getId()),
        reply.getCreatedAt() != null ? reply.getCreatedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordDocumentCreated(ProjectEntity project, Long documentId, String title, Long actorUserId, LocalDateTime occurredAt) {
    saveEvent(
        project,
        actorUserId,
        ProjectActivityEventType.DOCUMENT_CREATED,
        "DOCUMENT",
        documentId,
        title,
        1,
        null,
        null,
        "document-created:" + documentId,
        detail(),
        occurredAt != null ? occurredAt : LocalDateTime.now());
  }

  @Transactional
  public void recordDocumentVersionSaved(DocumentVersionEntity version, Long actorUserId) {
    saveEvent(
        version.getDocument().getProject(),
        actorUserId,
        ProjectActivityEventType.DOCUMENT_VERSION_SAVED,
        "DOCUMENT_VERSION",
        version.getId(),
        version.getDocument().getTitle(),
        1,
        null,
        null,
        "document-version:" + version.getId(),
        detail(
            "documentId", version.getDocument().getId(),
            "label", version.getLabel()),
        version.getCreatedAt() != null ? version.getCreatedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordFileUploaded(ProjectEntity project, Long actorUserId, Long fileId, String fileName, String ownerType, Long ownerId, LocalDateTime occurredAt) {
    saveEvent(
        project,
        actorUserId,
        ProjectActivityEventType.FILE_UPLOADED,
        ownerType,
        ownerId,
        fileName,
        1,
        null,
        null,
        "file-upload:" + fileId,
        detail("fileId", fileId, "fileName", fileName, "ownerType", ownerType, "ownerId", ownerId),
        occurredAt != null ? occurredAt : LocalDateTime.now());
  }

  @Transactional
  public void recordAssignmentSubmitted(AssignmentSubmissionEntity submission) {
    if (submission.getLinkedProject() == null || submission.getStudent() == null) {
      return;
    }
    String dedupeKey = "assignment-submit:" + submission.getId() + ":" + Objects.requireNonNullElse(submission.getAttemptCount(), 0);
    saveEvent(
        submission.getLinkedProject(),
        submission.getStudent().getId(),
        ProjectActivityEventType.ASSIGNMENT_SUBMITTED,
        "ASSIGNMENT_SUBMISSION",
        submission.getId(),
        submission.getAssignment() != null ? submission.getAssignment().getTitle() : "项目作业提交",
        1,
        null,
        null,
        dedupeKey,
        detail(
            "assignmentId", submission.getAssignment() != null ? submission.getAssignment().getId() : null,
            "attemptCount", Objects.requireNonNullElse(submission.getAttemptCount(), 0)),
        submission.getSubmittedAt() != null ? submission.getSubmittedAt() : LocalDateTime.now());
  }

  @Transactional
  public void recordGitPushCommits(Long projectId, Long actorUserId, List<GitCommitActivity> commits) {
    if (commits == null || commits.isEmpty()) {
      return;
    }
    ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
    for (GitCommitActivity commit : commits) {
      saveEvent(
          project,
          actorUserId,
          ProjectActivityEventType.GIT_COMMIT_PUSHED,
          "GIT_COMMIT",
          null,
          commit.message(),
          1,
          commit.linesAdded(),
          commit.linesDeleted(),
          "git-commit:" + projectId + ":" + commit.hash(),
          detail(
              "hash", commit.hash(),
              "branch", commit.branch(),
              "authorName", commit.authorName()),
          commit.occurredAt() != null ? commit.occurredAt() : LocalDateTime.now());
    }
  }

  private void seedHistoricalProjectEvents(Long projectId) {
    ProjectEntity project = projectRepository.findById(projectId).orElse(null);
    if (project == null) {
      return;
    }
    Long fallbackActorId = resolveFallbackActorId(project);
    saveEvent(
        project,
        fallbackActorId,
        ProjectActivityEventType.PROJECT_CREATED,
        "PROJECT",
        project.getId(),
        project.getName(),
        1,
        null,
        null,
        "project-created:" + project.getId(),
        detail("seeded", true),
        project.getCreatedAt() != null ? project.getCreatedAt() : LocalDateTime.now());
    for (ProjectMilestoneEntity milestone : milestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(projectId)) {
      saveEvent(
          project,
          fallbackActorId,
          ProjectActivityEventType.MILESTONE_CREATED,
          "MILESTONE",
          milestone.getId(),
          milestone.getTitle(),
          1,
          null,
          null,
          "milestone-created:" + milestone.getId(),
          detail("seeded", true, "weight", Objects.requireNonNullElse(milestone.getWeight(), 1)),
          milestone.getCreatedAt() != null ? milestone.getCreatedAt() : LocalDateTime.now());
      if (milestone.getCompletedAt() != null) {
        saveEvent(
            project,
            fallbackActorId,
            ProjectActivityEventType.MILESTONE_COMPLETED,
            "MILESTONE",
            milestone.getId(),
            milestone.getTitle(),
            1,
            null,
            null,
            completionKey("milestone-completed", milestone.getId(), milestone.getCompletedAt()),
            detail("seeded", true),
            milestone.getCompletedAt());
      }
    }
    for (DiscussionPostEntity post : discussionPostRepository.findByProjectIdOrderByUpdatedAtDesc(projectId)) {
      saveEvent(
          project,
          post.getAuthor() != null ? post.getAuthor().getId() : fallbackActorId,
          ProjectActivityEventType.DISCUSSION_POST_CREATED,
          "DISCUSSION_POST",
          post.getId(),
          post.getTitle(),
          1,
          null,
          null,
          "discussion-post:" + post.getId(),
          detail("seeded", true),
          post.getCreatedAt() != null ? post.getCreatedAt() : LocalDateTime.now());
    }
    for (DiscussionReplyEntity reply : discussionReplyRepository.findAll()) {
      if (reply.getPost() == null || reply.getPost().getProject() == null || !Objects.equals(reply.getPost().getProject().getId(), projectId)) {
        continue;
      }
      saveEvent(
          project,
          reply.getAuthor() != null ? reply.getAuthor().getId() : fallbackActorId,
          ProjectActivityEventType.DISCUSSION_REPLY_CREATED,
          "DISCUSSION_REPLY",
          reply.getId(),
          reply.getPost().getTitle(),
          1,
          null,
          null,
          "discussion-reply:" + reply.getId(),
          detail("seeded", true, "postId", reply.getPost().getId()),
          reply.getCreatedAt() != null ? reply.getCreatedAt() : LocalDateTime.now());
    }
    for (DocumentVersionEntity version : documentVersionRepository.findAll()) {
      if (version.getDocument() == null || version.getDocument().getProject() == null || !Objects.equals(version.getDocument().getProject().getId(), projectId)) {
        continue;
      }
      saveEvent(
          project,
          version.getCreatedBy() != null ? version.getCreatedBy().getId() : fallbackActorId,
          ProjectActivityEventType.DOCUMENT_VERSION_SAVED,
          "DOCUMENT_VERSION",
          version.getId(),
          version.getDocument().getTitle(),
          1,
          null,
          null,
          "document-version:" + version.getId(),
          detail("seeded", true, "documentId", version.getDocument().getId()),
          version.getCreatedAt() != null ? version.getCreatedAt() : LocalDateTime.now());
    }
    for (AssignmentSubmissionEntity submission : assignmentSubmissionRepository.findAll()) {
      if (submission.getLinkedProject() == null || !Objects.equals(submission.getLinkedProject().getId(), projectId) || submission.getSubmittedAt() == null) {
        continue;
      }
      saveEvent(
          project,
          submission.getStudent() != null ? submission.getStudent().getId() : fallbackActorId,
          ProjectActivityEventType.ASSIGNMENT_SUBMITTED,
          "ASSIGNMENT_SUBMISSION",
          submission.getId(),
          submission.getAssignment() != null ? submission.getAssignment().getTitle() : "项目作业提交",
          1,
          null,
          null,
          "assignment-submit:" + submission.getId() + ":" + Objects.requireNonNullElse(submission.getAttemptCount(), 0),
          detail("seeded", true),
          submission.getSubmittedAt());
    }
  }

  private Long resolveFallbackActorId(ProjectEntity project) {
    return projectMemberRepository.findByProjectId(project.getId()).stream()
        .filter(item -> item.isOwnerFlag())
        .map(item -> item.getUser().getId())
        .findFirst()
        .orElse(project.getTeam() != null && project.getTeam().getLeader() != null ? project.getTeam().getLeader().getId() : null);
  }

  private SummaryRange resolveRange(
      String requestedRangeType,
      LocalDate anchorDate,
      LocalDate startDate,
      LocalDate endDate,
      LocalDate earliestDate) {
    String rangeType = requestedRangeType == null || requestedRangeType.isBlank()
        ? "WEEK"
        : requestedRangeType.trim().toUpperCase(Locale.ROOT);
    LocalDate anchor = anchorDate != null ? anchorDate : LocalDate.now();
    return switch (rangeType) {
      case "ALL" -> {
        LocalDate start = earliestDate != null ? earliestDate : anchor;
        yield new SummaryRange("ALL", start, anchor, start + " ~ " + anchor);
      }
      case "MONTH" -> {
        LocalDate start = anchor.withDayOfMonth(1);
        LocalDate end = anchor.withDayOfMonth(anchor.lengthOfMonth());
        yield new SummaryRange("MONTH", start, end, anchor.getYear() + "-" + String.format("%02d", anchor.getMonthValue()));
      }
      case "CUSTOM" -> {
        if (startDate == null || endDate == null) {
          throw new ApiException("自定义时间范围缺少开始或结束日期");
        }
        if (endDate.isBefore(startDate)) {
          throw new ApiException("自定义时间范围无效");
        }
        yield new SummaryRange("CUSTOM", startDate, endDate, startDate + " ~ " + endDate);
      }
      default -> {
        LocalDate start = anchor.with(DayOfWeek.MONDAY);
        LocalDate end = start.plusDays(6);
        yield new SummaryRange("WEEK", start, end, start + " ~ " + end);
      }
    };
  }

  private LocalDate earliestDate(ProjectEntity project, List<ProjectActivityEventEntity> allEvents) {
    if (!allEvents.isEmpty()) {
      return allEvents.get(0).getOccurredAt().toLocalDate();
    }
    return project.getCreatedAt() != null ? project.getCreatedAt().toLocalDate() : LocalDate.now();
  }

  private LocalDate earliestDate(List<ProjectEntity> projects, List<ProjectActivityEventEntity> allEvents) {
    if (!allEvents.isEmpty()) {
      return allEvents.get(0).getOccurredAt().toLocalDate();
    }
    return projects.stream()
        .map(ProjectEntity::getCreatedAt)
        .filter(Objects::nonNull)
        .min(LocalDateTime::compareTo)
        .map(LocalDateTime::toLocalDate)
        .orElse(LocalDate.now());
  }

  private List<ProjectActivityEventEntity> filterEventsByRange(List<ProjectActivityEventEntity> events, SummaryRange range) {
    return events.stream()
        .filter(item -> {
          LocalDate date = item.getOccurredAt().toLocalDate();
          return !date.isBefore(range.startDate()) && !date.isAfter(range.endDate());
        })
        .toList();
  }

  private List<ProjectActivityEventEntity> filterEventsByMember(List<ProjectActivityEventEntity> events, Long memberId) {
    if (memberId == null) {
      return events;
    }
    return events.stream()
        .filter(item -> item.getUser() != null && Objects.equals(item.getUser().getId(), memberId))
        .toList();
  }

  private Map<Long, Double> buildEffectiveScoreMap(List<ProjectActivityEventEntity> allEvents) {
    Map<Long, Double> scores = new LinkedHashMap<>();
    Set<String> completedTaskKeys = new HashSet<>();
    for (ProjectActivityEventEntity event : allEvents) {
      if (event.getId() == null) {
        continue;
      }
      double score = baseContributionScore(event);
      if (event.getEventType() == ProjectActivityEventType.TASK_STATUS_CHANGED) {
        score = 0;
      }
      if (event.getEventType() == ProjectActivityEventType.TASK_COMPLETED) {
        Long userId = event.getUser() != null ? event.getUser().getId() : null;
        Long taskId = event.getTargetId();
        if (userId == null || taskId == null) {
          score = 0;
        } else {
          String key = userId + ":" + taskId;
          if (completedTaskKeys.contains(key)) {
            score = 0;
          } else {
            completedTaskKeys.add(key);
          }
        }
      }
      scores.put(event.getId(), score);
    }
    return scores;
  }

  private int effectiveCount(Collection<ProjectActivityEventEntity> events, Map<Long, Double> effectiveScores) {
    return (int) events.stream()
        .filter(item -> effectiveScore(item, effectiveScores) > 0)
        .count();
  }

  private int activeUserCount(Collection<ProjectActivityEventEntity> events) {
    return (int) events.stream()
        .map(ProjectActivityEventEntity::getUser)
        .filter(Objects::nonNull)
        .map(UserEntity::getId)
        .distinct()
        .count();
  }

  private double totalScore(Collection<ProjectActivityEventEntity> events, Map<Long, Double> effectiveScores) {
    return events.stream().mapToDouble(item -> effectiveScore(item, effectiveScores)).sum();
  }

  private List<MemberSummaryRecord> buildMemberSummaries(List<ProjectActivityEventEntity> events, Map<Long, Double> effectiveScores) {
    Map<Long, List<ProjectActivityEventEntity>> byUser = events.stream()
        .filter(item -> item.getUser() != null)
        .collect(Collectors.groupingBy(item -> item.getUser().getId(), LinkedHashMap::new, Collectors.toList()));
    return byUser.values().stream()
        .map(userEvents -> {
          ProjectActivityEventEntity latest = userEvents.stream().max(Comparator.comparing(ProjectActivityEventEntity::getOccurredAt)).orElse(userEvents.get(0));
          UserEntity user = latest.getUser();
          return new MemberSummaryRecord(
              user.getId(),
              user.getName(),
              latest.getTeam() != null ? latest.getTeam().getName() : null,
              round(totalScore(userEvents, effectiveScores)),
              userEvents.size(),
              effectiveCount(userEvents, effectiveScores),
              formatter.format(latest.getOccurredAt()),
              buildBreakdowns(userEvents, effectiveScores));
        })
        .sorted(Comparator.comparing(MemberSummaryRecord::contributionScore).reversed().thenComparing(MemberSummaryRecord::userName))
        .toList();
  }

  private List<SummaryLeaderboardEntry> buildMemberLeaderboard(List<MemberSummaryRecord> members, Long highlightedUserId) {
    return members.stream()
        .map(item -> new SummaryLeaderboardEntry(
            item.userId(),
            item.userName(),
            item.teamName(),
            item.contributionScore(),
            item.rawCount(),
            item.effectiveCount(),
            highlightedUserId != null && Objects.equals(item.userId(), highlightedUserId)))
        .toList();
  }

  private List<ProjectSummarySlice> buildProjectSummarySlices(List<ProjectActivityEventEntity> events, Map<Long, Double> effectiveScores) {
    Map<Long, List<ProjectActivityEventEntity>> byProject = events.stream()
        .collect(Collectors.groupingBy(item -> item.getProject().getId(), LinkedHashMap::new, Collectors.toList()));
    return byProject.values().stream()
        .map(projectEvents -> {
          ProjectActivityEventEntity latest = projectEvents.stream().max(Comparator.comparing(ProjectActivityEventEntity::getOccurredAt)).orElse(projectEvents.get(0));
          ProjectEntity project = latest.getProject();
          return new ProjectSummarySlice(
              project.getId(),
              project.getName(),
              project.getCourse() != null ? project.getCourse().getName() : null,
              project.getTeam() != null ? project.getTeam().getName() : null,
              round(totalScore(projectEvents, effectiveScores)),
              projectEvents.size(),
              effectiveCount(projectEvents, effectiveScores));
        })
        .sorted(Comparator.comparing(ProjectSummarySlice::contributionScore).reversed().thenComparing(ProjectSummarySlice::projectName))
        .toList();
  }

  private List<SummaryLeaderboardEntry> buildProjectLeaderboard(List<ProjectSummarySlice> projectSlices) {
    return projectSlices.stream()
        .map(item -> new SummaryLeaderboardEntry(
            item.projectId(),
            item.projectName(),
            item.courseName() != null ? item.courseName() + (item.teamName() != null ? " · " + item.teamName() : "") : item.teamName(),
            item.contributionScore(),
            item.rawCount(),
            item.effectiveCount(),
            false))
        .toList();
  }

  private List<ContributionBreakdownRecord> buildBreakdowns(Collection<ProjectActivityEventEntity> events, Map<Long, Double> effectiveScores) {
    Map<ProjectActivityEventType, List<ProjectActivityEventEntity>> byType = events.stream()
        .filter(item -> effectiveScore(item, effectiveScores) > 0)
        .collect(Collectors.groupingBy(ProjectActivityEventEntity::getEventType, LinkedHashMap::new, Collectors.toList()));
    return byType.entrySet().stream()
        .map(entry -> {
          int eventCount = entry.getValue().stream()
              .mapToInt(item -> effectiveScore(item, effectiveScores) > 0 ? eventUnits(item) : 0)
              .sum();
          int metricValue = entry.getValue().stream().mapToInt(this::metricValue).sum();
          double score = entry.getValue().stream().mapToDouble(item -> effectiveScore(item, effectiveScores)).sum();
          return new ContributionBreakdownRecord(
              entry.getKey().name(),
              eventLabel(entry.getKey()),
              eventCount,
              metricValue,
              round(score));
        })
        .sorted(Comparator.comparing(ContributionBreakdownRecord::contributionScore).reversed().thenComparing(ContributionBreakdownRecord::label))
        .toList();
  }

  private List<SummaryTrendBucket> buildTrendBuckets(
      List<ProjectActivityEventEntity> events,
      Map<Long, Double> effectiveScores,
      SummaryRange range) {
    List<SummaryTrendBucket> buckets = new java.util.ArrayList<>();
    long spanDays = ChronoUnit.DAYS.between(range.startDate(), range.endDate()) + 1;
    boolean daily = spanDays <= 45;
    boolean weekly = !daily && spanDays <= 180;
    if (daily) {
      LocalDate cursor = range.startDate();
      while (!cursor.isAfter(range.endDate())) {
        LocalDate bucketDate = cursor;
        List<ProjectActivityEventEntity> bucketEvents = events.stream()
            .filter(item -> item.getOccurredAt().toLocalDate().equals(bucketDate))
            .toList();
        buckets.add(new SummaryTrendBucket(
            bucketDate.toString(),
            bucketDate.toString(),
            bucketDate.toString(),
            round(totalScore(bucketEvents, effectiveScores)),
            bucketEvents.size(),
            effectiveCount(bucketEvents, effectiveScores)));
        cursor = cursor.plusDays(1);
      }
      return buckets;
    }
    if (weekly) {
      LocalDate cursor = range.startDate().with(DayOfWeek.MONDAY);
      while (!cursor.isAfter(range.endDate())) {
        LocalDate bucketStart = cursor;
        LocalDate bucketEnd = cursor.plusDays(6);
        List<ProjectActivityEventEntity> bucketEvents = events.stream()
            .filter(item -> {
              LocalDate date = item.getOccurredAt().toLocalDate();
              return !date.isBefore(bucketStart) && !date.isAfter(bucketEnd) && !date.isBefore(range.startDate()) && !date.isAfter(range.endDate());
            })
            .toList();
        buckets.add(new SummaryTrendBucket(
            bucketStart.toString(),
            bucketStart + " ~ " + bucketEnd,
            bucketStart.toString(),
            round(totalScore(bucketEvents, effectiveScores)),
            bucketEvents.size(),
            effectiveCount(bucketEvents, effectiveScores)));
        cursor = cursor.plusWeeks(1);
      }
      return buckets;
    }
    LocalDate cursor = range.startDate().withDayOfMonth(1);
    while (!cursor.isAfter(range.endDate())) {
      LocalDate bucketStart = cursor;
      LocalDate bucketEnd = cursor.withDayOfMonth(cursor.lengthOfMonth());
      List<ProjectActivityEventEntity> bucketEvents = events.stream()
          .filter(item -> {
            LocalDate date = item.getOccurredAt().toLocalDate();
            return !date.isBefore(bucketStart) && !date.isAfter(bucketEnd) && !date.isBefore(range.startDate()) && !date.isAfter(range.endDate());
          })
          .toList();
      buckets.add(new SummaryTrendBucket(
          bucketStart.toString(),
          bucketStart.getYear() + "-" + String.format("%02d", bucketStart.getMonthValue()),
          bucketStart.toString(),
          round(totalScore(bucketEvents, effectiveScores)),
          bucketEvents.size(),
          effectiveCount(bucketEvents, effectiveScores)));
      cursor = cursor.plusMonths(1);
    }
    return buckets;
  }

  private List<SummaryHeatmapCell> buildHeatmap(
      List<ProjectActivityEventEntity> events,
      Map<Long, Double> effectiveScores,
      SummaryRange range) {
    Map<LocalDate, List<ProjectActivityEventEntity>> byDate = events.stream()
        .collect(Collectors.groupingBy(item -> item.getOccurredAt().toLocalDate(), LinkedHashMap::new, Collectors.toList()));
    Map<LocalDate, Double> scoreByDate = new LinkedHashMap<>();
    LocalDate cursor = range.startDate();
    double maxScore = 0;
    while (!cursor.isAfter(range.endDate())) {
      double score = round(totalScore(byDate.getOrDefault(cursor, List.of()), effectiveScores));
      scoreByDate.put(cursor, score);
      maxScore = Math.max(maxScore, score);
      cursor = cursor.plusDays(1);
    }
    List<SummaryHeatmapCell> cells = new java.util.ArrayList<>();
    for (Map.Entry<LocalDate, Double> entry : scoreByDate.entrySet()) {
      LocalDate date = entry.getKey();
      List<ProjectActivityEventEntity> dayEvents = byDate.getOrDefault(date, List.of());
      cells.add(new SummaryHeatmapCell(
          date.toString(),
          entry.getValue(),
          dayEvents.size(),
          effectiveCount(dayEvents, effectiveScores),
          heatLevel(entry.getValue(), maxScore)));
    }
    return cells;
  }

  private SummaryWeeklyDigestRecord buildWeeklyDigest(
      List<ProjectActivityEventEntity> events,
      Map<Long, Double> effectiveScores,
      SummaryRange parentRange) {
    LocalDate anchor = parentRange.endDate().isAfter(LocalDate.now()) ? LocalDate.now() : parentRange.endDate();
    LocalDate weekStart = anchor.with(DayOfWeek.MONDAY);
    LocalDate weekEnd = weekStart.plusDays(6);
    List<ProjectActivityEventEntity> weeklyEvents = events.stream()
        .filter(item -> {
          LocalDate date = item.getOccurredAt().toLocalDate();
          return !date.isBefore(weekStart) && !date.isAfter(weekEnd);
        })
        .toList();
    return new SummaryWeeklyDigestRecord(
        weekStart.toString(),
        weekEnd.toString(),
        round(totalScore(weeklyEvents, effectiveScores)),
        activeUserCount(weeklyEvents),
        weeklyEvents.size(),
        effectiveCount(weeklyEvents, effectiveScores),
        buildBreakdowns(weeklyEvents, effectiveScores));
  }

  private List<ProjectActivityEventRecord> toEventRecordsDescending(
      List<ProjectActivityEventEntity> events,
      Map<Long, Double> effectiveScores,
      int limit) {
    return events.stream()
        .sorted(Comparator.comparing(ProjectActivityEventEntity::getOccurredAt).reversed())
        .limit(limit)
        .map(item -> toEventRecord(item, effectiveScores))
        .toList();
  }

  private String formatOneDecimal(double value) {
    return String.format(Locale.US, "%.1f", round(value));
  }

  private int heatLevel(double score, double maxScore) {
    if (score <= 0 || maxScore <= 0) {
      return 0;
    }
    double ratio = score / maxScore;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

  private double effectiveScore(ProjectActivityEventEntity event, Map<Long, Double> effectiveScores) {
    if (event.getId() == null) {
      return 0;
    }
    return effectiveScores.getOrDefault(event.getId(), 0.0);
  }

  private List<ProjectContributionSummaryRecord> buildProjectSummaries(List<ProjectEntity> projects, List<ProjectActivityEventEntity> events) {
    Map<Long, List<ProjectActivityEventEntity>> byProjectId = events.stream().collect(Collectors.groupingBy(item -> item.getProject().getId(), LinkedHashMap::new, Collectors.toList()));
    return projects.stream()
        .map(project -> {
          List<ProjectActivityEventEntity> projectEvents = byProjectId.getOrDefault(project.getId(), List.of());
          double score = buildUserContributionRows(projectEvents).stream().mapToDouble(UserContributionRecord::contributionScore).sum();
          int activeUsers = (int) projectEvents.stream().map(ProjectActivityEventEntity::getUser).filter(Objects::nonNull).map(UserEntity::getId).distinct().count();
          return new ProjectContributionSummaryRecord(
              project.getId(),
              project.getName(),
              project.getCourse() != null ? project.getCourse().getId() : null,
              project.getCourse() != null ? project.getCourse().getName() : null,
              project.getTeam() != null ? project.getTeam().getName() : null,
              round(score),
              activeUsers,
              projectEvents.size());
        })
        .sorted(Comparator.comparing(ProjectContributionSummaryRecord::contributionScore).reversed().thenComparing(ProjectContributionSummaryRecord::projectName))
        .toList();
  }

  private List<UserContributionRecord> buildUserContributionRows(List<ProjectActivityEventEntity> events) {
    Map<String, List<ProjectActivityEventEntity>> byUserProject = events.stream()
        .filter(item -> item.getUser() != null)
        .collect(Collectors.groupingBy(item -> item.getUser().getId() + ":" + item.getProject().getId(), LinkedHashMap::new, Collectors.toList()));
    return byUserProject.values().stream()
        .map(userEvents -> {
          UserEntity user = userEvents.get(0).getUser();
          ProjectActivityEventEntity latest = userEvents.stream().max(Comparator.comparing(ProjectActivityEventEntity::getOccurredAt)).orElse(userEvents.get(0));
          ProjectEntity latestProject = latest.getProject();
          double score = userEvents.stream().mapToDouble(this::contributionScore).sum();
          return new UserContributionRecord(
              user.getId(),
              user.getName(),
              latestProject.getId(),
              latestProject.getName(),
              latestProject.getCourse() != null ? latestProject.getCourse().getId() : null,
              latestProject.getCourse() != null ? latestProject.getCourse().getName() : null,
              latestProject.getTeam() != null ? latestProject.getTeam().getName() : null,
              round(score),
              userEvents.size(),
              formatter.format(latest.getOccurredAt()),
              buildBreakdowns(userEvents));
        })
        .sorted(Comparator.comparing(UserContributionRecord::contributionScore).reversed().thenComparing(UserContributionRecord::userName))
        .toList();
  }

  private List<ContributionBreakdownRecord> buildBreakdowns(Collection<ProjectActivityEventEntity> events) {
    Map<ProjectActivityEventType, List<ProjectActivityEventEntity>> byType = events.stream()
        .collect(Collectors.groupingBy(ProjectActivityEventEntity::getEventType, LinkedHashMap::new, Collectors.toList()));
    return byType.entrySet().stream()
        .map(entry -> {
          int eventCount = entry.getValue().stream().mapToInt(this::eventUnits).sum();
          int metricValue = entry.getValue().stream().mapToInt(this::metricValue).sum();
          double score = entry.getValue().stream().mapToDouble(this::contributionScore).sum();
          return new ContributionBreakdownRecord(
              entry.getKey().name(),
              eventLabel(entry.getKey()),
              eventCount,
              metricValue,
              round(score));
        })
        .sorted(Comparator.comparing(ContributionBreakdownRecord::contributionScore).reversed().thenComparing(ContributionBreakdownRecord::label))
        .toList();
  }

  private int eventUnits(ProjectActivityEventEntity event) {
    return Objects.requireNonNullElse(event.getEventCount(), 1);
  }

  private int metricValue(ProjectActivityEventEntity event) {
    if (event.getEventType() == ProjectActivityEventType.GIT_COMMIT_PUSHED) {
      return Objects.requireNonNullElse(event.getLinesAdded(), 0) + Objects.requireNonNullElse(event.getLinesDeleted(), 0);
    }
    return eventUnits(event);
  }

  private double baseContributionScore(ProjectActivityEventEntity event) {
    int eventCount = eventUnits(event);
    return switch (event.getEventType()) {
      case PROJECT_VISIT -> eventCount / VISIT_DIVISOR;
      case FILE_UPLOADED -> eventCount * FILE_UPLOAD_POINTS;
      case DOCUMENT_VERSION_SAVED -> eventCount * DOCUMENT_VERSION_POINTS;
      case TASK_CREATED -> eventCount * TASK_CREATE_POINTS;
      case TASK_COMPLETED -> eventCount * TASK_COMPLETE_POINTS;
      case DISCUSSION_POST_CREATED -> eventCount * DISCUSSION_POST_POINTS;
      case DISCUSSION_REPLY_CREATED -> eventCount * DISCUSSION_REPLY_POINTS;
      case ASSIGNMENT_SUBMITTED -> eventCount * ASSIGNMENT_SUBMIT_POINTS;
      case GIT_COMMIT_PUSHED ->
          eventCount * GIT_COMMIT_POINTS
              + ((Objects.requireNonNullElse(event.getLinesAdded(), 0) + Objects.requireNonNullElse(event.getLinesDeleted(), 0)) / GIT_LINE_DIVISOR);
      default -> 0.0;
    };
  }

  private double contributionScore(ProjectActivityEventEntity event) {
    return baseContributionScore(event);
  }

  private ProjectActivityEventRecord toEventRecord(ProjectActivityEventEntity entity) {
    return toEventRecord(entity, Map.of());
  }

  private ProjectActivityEventRecord toEventRecord(ProjectActivityEventEntity entity, Map<Long, Double> effectiveScores) {
    ProjectEntity project = entity.getProject();
    double score = effectiveScores.isEmpty() ? round(contributionScore(entity)) : round(effectiveScore(entity, effectiveScores));
    return new ProjectActivityEventRecord(
        entity.getId(),
        project.getId(),
        project.getName(),
        entity.getCourse() != null ? entity.getCourse().getId() : null,
        entity.getCourse() != null ? entity.getCourse().getName() : null,
        entity.getTeam() != null ? entity.getTeam().getId() : null,
        entity.getTeam() != null ? entity.getTeam().getName() : null,
        entity.getUser() != null ? entity.getUser().getId() : null,
        entity.getUser() != null ? entity.getUser().getName() : null,
        entity.getEventType().name(),
        entity.getTargetType(),
        entity.getTargetId(),
        entity.getTargetTitle(),
        entity.getEventCount(),
        entity.getLinesAdded(),
        entity.getLinesDeleted(),
        score,
        entity.getDetailJson(),
        formatter.format(entity.getOccurredAt()));
  }

  private WeekWindow normalizeWeekWindow(LocalDate requestedWeekStart) {
    LocalDate today = LocalDate.now();
    LocalDate start = requestedWeekStart != null ? requestedWeekStart : today.with(DayOfWeek.MONDAY);
    start = start.with(DayOfWeek.MONDAY);
    LocalDate end = start.plusDays(6);
    return new WeekWindow(start, end, start.atStartOfDay(), end.plusDays(1).atStartOfDay());
  }

  private String weekLabel(WeekWindow window) {
    return window.startDate() + " ~ " + window.endDate();
  }

  private double round(double value) {
    return Math.round(value * 10.0) / 10.0;
  }

  private String eventLabel(ProjectActivityEventType type) {
    return switch (type) {
      case PROJECT_CREATED -> "创建项目";
      case PROJECT_VISIT -> "访问项目";
      case MILESTONE_CREATED -> "创建里程碑";
      case MILESTONE_COMPLETED -> "完成里程碑";
      case TASK_CREATED -> "创建任务";
      case TASK_STATUS_CHANGED -> "推进任务状态";
      case TASK_COMPLETED -> "完成任务";
      case DISCUSSION_POST_CREATED -> "发起讨论";
      case DISCUSSION_REPLY_CREATED -> "讨论回复";
      case DOCUMENT_CREATED -> "创建文档";
      case DOCUMENT_VERSION_SAVED -> "保存文档版本";
      case FILE_UPLOADED -> "上传文件";
      case ASSIGNMENT_SUBMITTED -> "提交作业";
      case GIT_COMMIT_PUSHED -> "提交代码";
    };
  }

  private String completionKey(String prefix, Long id, LocalDateTime occurredAt) {
    return prefix + ":" + id + ":" + (occurredAt != null ? occurredAt.toString() : "pending");
  }

  @Transactional
  protected void saveEvent(
      ProjectEntity project,
      Long actorUserId,
      ProjectActivityEventType eventType,
      String targetType,
      Long targetId,
      String targetTitle,
      Integer eventCount,
      Integer linesAdded,
      Integer linesDeleted,
      String dedupeKey,
      Object detail,
      LocalDateTime occurredAt) {
    if (project == null || eventType == null || occurredAt == null) {
      return;
    }
    if (dedupeKey != null && eventRepository.existsByDedupeKey(dedupeKey)) {
      return;
    }
    ProjectActivityEventEntity entity = new ProjectActivityEventEntity();
    entity.setProject(project);
    entity.setCourse(project.getCourse());
    entity.setTeam(project.getTeam());
    entity.setUser(resolveUser(actorUserId));
    entity.setEventType(eventType);
    entity.setTargetType(targetType);
    entity.setTargetId(targetId);
    entity.setTargetTitle(targetTitle);
    entity.setEventCount(Objects.requireNonNullElse(eventCount, 1));
    entity.setLinesAdded(linesAdded);
    entity.setLinesDeleted(linesDeleted);
    entity.setDedupeKey(dedupeKey);
    entity.setDetailJson(toJson(detail));
    entity.setOccurredAt(occurredAt);
    entity = eventRepository.save(entity);
    appendProjectLog(entity);
  }

  private UserEntity resolveUser(Long userId) {
    if (userId == null) {
      return null;
    }
    return userRepository.findById(userId).orElse(null);
  }

  private String toJson(Object detail) {
    if (detail == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(detail);
    } catch (JsonProcessingException e) {
      return String.valueOf(detail);
    }
  }

  private void appendProjectLog(ProjectActivityEventEntity entity) {
    if (entity == null || entity.getProject() == null) {
      return;
    }
    try {
      Path dir = storagePathService.projectActivityLogsRoot(entity.getProject());
      Files.createDirectories(dir);
      Path file = storagePathService.projectWeeklyActivityLogFile(entity.getProject(), entity.getOccurredAt());
      Map<String, Object> payloadMap = new java.util.LinkedHashMap<>();
      payloadMap.put("id", entity.getId());
      payloadMap.put("projectId", entity.getProject().getId());
      payloadMap.put("projectName", entity.getProject().getName());
      payloadMap.put("courseId", entity.getCourse() != null ? entity.getCourse().getId() : null);
      payloadMap.put("teamId", entity.getTeam() != null ? entity.getTeam().getId() : null);
      payloadMap.put("userId", entity.getUser() != null ? entity.getUser().getId() : null);
      payloadMap.put("userName", entity.getUser() != null ? entity.getUser().getName() : null);
      payloadMap.put("eventType", entity.getEventType() != null ? entity.getEventType().name() : null);
      payloadMap.put("targetType", entity.getTargetType());
      payloadMap.put("targetId", entity.getTargetId());
      payloadMap.put("targetTitle", entity.getTargetTitle());
      payloadMap.put("eventCount", entity.getEventCount());
      payloadMap.put("linesAdded", entity.getLinesAdded());
      payloadMap.put("linesDeleted", entity.getLinesDeleted());
      payloadMap.put("detailJson", entity.getDetailJson());
      payloadMap.put("occurredAt", entity.getOccurredAt() != null ? formatter.format(entity.getOccurredAt()) : null);
      String payload = objectMapper.writeValueAsString(payloadMap);
      Files.writeString(file, payload + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    } catch (IOException ignored) {
    }
  }

  private Map<String, Object> detail(Object... pairs) {
    if (pairs == null || pairs.length == 0) {
      return Map.of();
    }
    Map<String, Object> map = new LinkedHashMap<>();
    for (int i = 0; i + 1 < pairs.length; i += 2) {
      Object key = pairs[i];
      Object value = pairs[i + 1];
      if (key == null || value == null) {
        continue;
      }
      map.put(String.valueOf(key), value);
    }
    return map;
  }

  private record WeekWindow(LocalDate startDate, LocalDate endDate, LocalDateTime start, LocalDateTime endExclusive) {}

  private record SummaryRange(String rangeType, LocalDate startDate, LocalDate endDate, String label) {}

  private record ProjectSummarySlice(
      Long projectId,
      String projectName,
      String courseName,
      String teamName,
      Double contributionScore,
      Integer rawCount,
      Integer effectiveCount) {}

  public record GitCommitActivity(
      String hash,
      String message,
      String branch,
      String authorName,
      Integer linesAdded,
      Integer linesDeleted,
      LocalDateTime occurredAt) {}
}
