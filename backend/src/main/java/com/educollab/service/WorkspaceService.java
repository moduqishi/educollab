package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import com.educollab.service.workspace.WorkspaceProjectMembershipService;
import com.educollab.service.workspace.WorkspaceRecordMapper;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WorkspaceService {
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CourseRepository courseRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final TaskRepository taskRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final DiscussionTaskLinkRepository discussionTaskLinkRepository;
    private final DocumentRepository documentRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeacherFeedbackRepository teacherFeedbackRepository;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final GitService gitService;
    private final FileStorageService fileStorageService;
    private final WorkspaceProjectMembershipService projectMembershipService;
    private final WorkspaceRecordMapper recordMapper;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public WorkspaceService(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository, CourseRepository courseRepository, ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository, ProjectAccessService projectAccessService, TaskRepository taskRepository, DiscussionPostRepository discussionPostRepository, DiscussionReplyRepository discussionReplyRepository, DiscussionTaskLinkRepository discussionTaskLinkRepository, DocumentRepository documentRepository, AssignmentRepository assignmentRepository, TeacherFeedbackRepository teacherFeedbackRepository, AuthService authService, NotificationService notificationService, GitService gitService, FileStorageService fileStorageService, WorkspaceProjectMembershipService projectMembershipService, WorkspaceRecordMapper recordMapper) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.courseRepository = courseRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectAccessService = projectAccessService;
        this.taskRepository = taskRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.discussionTaskLinkRepository = discussionTaskLinkRepository;
        this.documentRepository = documentRepository;
        this.assignmentRepository = assignmentRepository;
        this.teacherFeedbackRepository = teacherFeedbackRepository;
        this.authService = authService;
        this.notificationService = notificationService;
        this.gitService = gitService;
        this.fileStorageService = fileStorageService;
        this.projectMembershipService = projectMembershipService;
        this.recordMapper = recordMapper;
    }

    public DashboardSummary dashboard(JwtPrincipal principal) {
        List<ProjectEntity> projects = visibleProjects(principal);
        List<TaskRecord> taskRecords = tasks(principal);
        List<DocumentRecord> documents = documents(principal);
        return new DashboardSummary(
            projects.size(),
            (int) taskRecords.stream().filter(item -> !"DONE".equals(item.status())).count(),
            (int) notificationService.list(principal.userId()).stream().filter(item -> !item.read()).count(),
            projects.stream().limit(4).map(recordMapper::toProjectRecord).toList(),
            taskRecords.stream().filter(item -> !"DONE".equals(item.status())).limit(4).toList(),
            documents.stream().limit(4).toList()
        );
    }

    public List<TeamRecord> teams(JwtPrincipal principal) {
        Set<Long> ids = principal.role() == UserRole.TEACHER
            ? teamRepository.findAll().stream()
                .filter(team -> team.getCourse() != null && team.getCourse().getTeacher() != null && principal.userId().equals(team.getCourse().getTeacher().getId()))
                .map(TeamEntity::getId)
                .collect(Collectors.toSet())
            : teamMemberRepository.findByUserId(principal.userId()).stream()
                .map(TeamMemberEntity::getTeam)
                .map(TeamEntity::getId)
                .collect(Collectors.toSet());
        return teamRepository.findAllById(ids).stream()
            .map(team -> new TeamRecord(
                team.getId(),
                team.getName(),
                team.getCourse() != null ? team.getCourse().getId() : null,
                team.getCourse() != null ? team.getCourse().getName() : "",
                teamMemberRepository.findByTeamId(team.getId()).size(),
                team.getLeader() != null ? team.getLeader().getId() : null,
                team.getLeader() != null ? team.getLeader().getName() : "",
                team.getInviteCode(),
                team.getGroupTask() != null ? team.getGroupTask().getId() : null
            ))
            .toList();
    }

    public TeamRecord generateInviteCode(Long teamId, JwtPrincipal principal) {
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
            throw new ApiException("只有队长可以生成邀请码");
        }
        String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        team.setInviteCode(code);
        teamRepository.save(team);
        return new TeamRecord(
            team.getId(), team.getName(),
            team.getCourse() != null ? team.getCourse().getId() : null,
            team.getCourse() != null ? team.getCourse().getName() : "",
            teamMemberRepository.findByTeamId(team.getId()).size(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : "",
            team.getInviteCode(),
            team.getGroupTask() != null ? team.getGroupTask().getId() : null
        );
    }

    public TeamRecord joinByInviteCode(String inviteCode, JwtPrincipal principal) {
        TeamEntity team = teamRepository.findAll().stream()
            .filter(t -> inviteCode.equals(t.getInviteCode()))
            .findFirst()
            .orElseThrow(() -> new ApiException("邀请码无效"));
        if (teamMemberRepository.findByTeamIdAndUserId(team.getId(), principal.userId()).isPresent()) {
            throw new ApiException("你已经在该团队中");
        }
        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeam(team);
        member.setUser(authService.getUser(principal.userId()));
        teamMemberRepository.save(member);
        return new TeamRecord(
            team.getId(), team.getName(),
            team.getCourse() != null ? team.getCourse().getId() : null,
            team.getCourse() != null ? team.getCourse().getName() : "",
            teamMemberRepository.findByTeamId(team.getId()).size(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : "",
            team.getInviteCode(),
            team.getGroupTask() != null ? team.getGroupTask().getId() : null
        );
    }

    @Transactional
    public TeamRecord createStandaloneTeam(TeamStandaloneCreateRequest request, JwtPrincipal principal) {
        CourseEntity course = null;
        if (request.courseId() != null) {
            course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ApiException("课程不存在"));
        }
        UserEntity leader = authService.getUser(principal.userId());
        TeamEntity team = new TeamEntity();
        team.setName(request.name());
        team.setCourse(course);
        team.setLeader(leader);
        teamRepository.save(team);
        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeam(team);
        member.setUser(leader);
        teamMemberRepository.save(member);
        if (course != null && course.getTeacher() != null) {
            TeamMemberEntity teacherMember = new TeamMemberEntity();
            teacherMember.setTeam(team);
            teacherMember.setUser(course.getTeacher());
            teamMemberRepository.save(teacherMember);
        }
        return new TeamRecord(
            team.getId(), team.getName(),
            course != null ? course.getId() : null,
            course != null ? course.getName() : null,
            teamMemberRepository.findByTeamId(team.getId()).size(),
            leader.getId(), leader.getName(),
            team.getInviteCode(),
            null
        );
    }

    public List<ProjectRecord> projects(JwtPrincipal principal) {
        return visibleProjects(principal).stream().map(recordMapper::toProjectRecord).toList();
    }

    public List<TaskRecord> tasks(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return taskRepository.findByProjectIdIn(projectIds).stream().sorted(Comparator.comparing(TaskEntity::getUpdatedAt).reversed()).map(recordMapper::toTaskRecord).toList();
    }

    public List<DiscussionPost> discussions(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return discussionPostRepository.findByProjectIdInOrderByUpdatedAtDesc(projectIds).stream().map(recordMapper::toDiscussionListItem).toList();
    }

    public List<DocumentRecord> documents(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return documentRepository.findByProjectIdIn(projectIds).stream().sorted(Comparator.comparing(DocumentEntity::getUpdatedAt).reversed()).map(recordMapper::toDocumentRecord).toList();
    }

    public ProjectDetail projectDetail(Long projectId, JwtPrincipal principal) {
        ProjectEntity project = requireVisible(projectId, principal);
        List<TaskRecord> projectTasks = taskRepository.findByProjectId(projectId).stream().map(recordMapper::toTaskRecord).toList();
        List<DiscussionPost> posts = discussionPostRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream().map(recordMapper::toDiscussionListItem).toList();
        List<DocumentRecord> docs = documentRepository.findByProjectId(projectId).stream().map(recordMapper::toDocumentRecord).toList();
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId).stream().map(recordMapper::toProjectMember).toList();
        List<String> branches = project.getType() == ProjectType.CODE ? safeListBranches(projectId) : List.of();
        List<GitService.CommitView> commits = project.getType() == ProjectType.CODE ? safeListCommits(projectId) : List.of();
        return new ProjectDetail(
            recordMapper.toProjectRecord(project),
            new ProjectStats(projectTasks.size(), (int) projectTasks.stream().filter(task -> "DONE".equals(task.status())).count(), posts.size(), docs.size(), safeListReleases(projectId).size(), commits.size()),
            projectTasks,
            posts,
            docs,
            members,
            projectMembershipService.canManageProjectMembers(projectId, principal),
            branches,
            commits.stream().map(commit -> new CommitRecord(commit.hash(), commit.message(), commit.authorName(), commit.createdAt(), commit.branch())).toList(),
            safeListReleases(projectId).stream().map(release -> new ReleaseRecord(release.getId(), release.getVersion(), release.getTitle(), release.getDescription(), formatter.format(release.getCreatedAt()))).toList(),
            safeListMergeRequests(projectId).stream().map(mr -> new MergeRequestRecord(mr.getId(), mr.getTitle(), mr.getSourceBranch(), mr.getTargetBranch(), mr.getStatus().name())).toList()
        );
    }

    @Transactional
    public TeamRecord createTeam(TeamSaveRequest request, JwtPrincipal principal) {
        CourseEntity course = courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在"));
        UserEntity leader = authService.getUser(request.leaderId() != null ? request.leaderId() : principal.userId());
        TeamEntity team = new TeamEntity();
        team.setName(request.name());
        team.setCourse(course);
        team.setLeader(leader);
        teamRepository.save(team);
        List<Long> memberIds = request.memberIds() == null || request.memberIds().isEmpty() ? List.of(leader.getId()) : request.memberIds();
        for (Long userId : memberIds.stream().distinct().toList()) {
            TeamMemberEntity entity = new TeamMemberEntity();
            entity.setTeam(team);
            entity.setUser(authService.getUser(userId));
            teamMemberRepository.save(entity);
        }
        return new TeamRecord(team.getId(), team.getName(), course.getId(), course.getName(), teamMemberRepository.findByTeamId(team.getId()).size(), leader.getId(), leader.getName(), team.getInviteCode(), team.getGroupTask() != null ? team.getGroupTask().getId() : null);
    }

    @Transactional
    public ProjectRecord createProject(ProjectSaveRequest request, JwtPrincipal principal) {
        if (request.teamId() == null || request.courseId() == null) throw new ApiException("请从组队任务中的队伍创建项目");
        TeamEntity team = teamRepository.findById(request.teamId()).orElseThrow(() -> new ApiException("团队不存在"));
        CourseEntity course = courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在"));
        ProjectEntity project = new ProjectEntity();
        project.setTeam(team);
        project.setCourse(course);
        project.setGroupTask(team.getGroupTask());
        project.setName(request.name());
        project.setDescription(request.description());
        project.setType(ProjectType.valueOf(request.type()));
        project.setStatus(ProjectStatus.ACTIVE);
        if (request.dueDate() != null && !request.dueDate().isBlank()) project.setDueDate(LocalDate.parse(request.dueDate()));
        projectRepository.save(project);
        for (TeamMemberEntity member : teamMemberRepository.findByTeamId(team.getId())) {
            ProjectMemberEntity projectMember = new ProjectMemberEntity();
            projectMember.setProject(project);
            projectMember.setUser(member.getUser());
            projectMember.setOwnerFlag(team.getLeader() != null && member.getUser().getId().equals(team.getLeader().getId()));
            projectMemberRepository.save(projectMember);
        }
        if (request.initRepository() && project.getType() == ProjectType.CODE) {
            gitService.ensureRepository(project);
        }
        return recordMapper.toProjectRecord(project);
    }

    @Transactional
    public TaskRecord saveTask(TaskSaveRequest request, Long taskId, JwtPrincipal principal) {
        ProjectEntity project = requireVisible(request.projectId(), principal);
        TaskEntity task = taskId == null ? new TaskEntity() : taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        task.setProject(project);
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(TaskStatus.valueOf(request.status()));
        task.setPriority(TaskPriority.valueOf(request.priority()));
        task.setAssignee(request.assigneeId() == null ? null : authService.getUser(request.assigneeId()));
        task.setDueDate(request.dueDate() == null || request.dueDate().isBlank() ? null : LocalDate.parse(request.dueDate()));
        taskRepository.save(task);
        refreshProjectProgress(project.getId());
        if (task.getAssignee() != null) {
            notificationService.create(
                task.getAssignee(),
                "任务已分配",
                "你被分配到任务：“" + task.getTitle() + "”",
                NotificationType.TASK,
                NotificationTarget.of(NotificationSourceType.TASK, task.getId(), "/app/tasks/" + task.getId(), "任务详情"));
        }
        return recordMapper.toTaskRecord(task);
    }

    @Transactional
    public void deleteTaskAttachment(Long taskId, Long fileId, JwtPrincipal principal) {
        TaskEntity task = taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        requireVisible(task.getProject().getId(), principal);
        fileStorageService.deleteOwnedFile(FileOwnerType.TASK, taskId, fileId);
    }

    @Transactional
    public DiscussionDetail createDiscussion(DiscussionSaveRequest request, JwtPrincipal principal) {
        ProjectEntity project = requireVisible(request.projectId(), principal);
        DiscussionPostEntity entity = new DiscussionPostEntity();
        entity.setProject(project);
        entity.setAuthor(authService.getUser(principal.userId()));
        entity.setTitle(request.title());
        entity.setContent(request.content());
        entity.setCategory(DiscussionCategory.valueOf(Objects.requireNonNullElse(request.category(), "GENERAL")));
        entity.setStatus(DiscussionStatus.OPEN);
        discussionPostRepository.save(entity);
        projectMemberRepository.findByProjectId(project.getId()).stream().map(ProjectMemberEntity::getUser).filter(user -> !user.getId().equals(principal.userId())).forEach(user -> notificationService.create(
            user,
            "新讨论",
            "项目“" + project.getName() + "”新增讨论：“" + entity.getTitle() + "”",
            NotificationType.DISCUSSION,
            discussionTarget(project.getId(), entity.getId())));
        return discussionDetail(entity.getId(), principal);
    }

    @Transactional
    public DiscussionDetail replyDiscussion(Long postId, DiscussionReplyRequest request, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        DiscussionReplyEntity entity = new DiscussionReplyEntity();
        entity.setPost(post);
        entity.setAuthor(authService.getUser(principal.userId()));
        entity.setContent(request.content());
        discussionReplyRepository.save(entity);
        notificationService.create(
            post.getAuthor(),
            "讨论收到回复",
            "你的讨论“" + post.getTitle() + "”有新的回复",
            NotificationType.DISCUSSION,
            discussionTarget(post.getProject().getId(), post.getId()));
        return discussionDetail(postId, principal);
    }

    public DiscussionDetail discussionDetail(Long postId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        List<DiscussionReply> replies = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(postId).stream().map(reply -> new DiscussionReply(reply.getId(), reply.getAuthor().getName(), reply.getContent(), formatter.format(reply.getCreatedAt()))).toList();
        List<FileAssetRecord> attachments = fileStorageService.list(FileOwnerType.DISCUSSION_POST, postId);
        List<TaskRecord> linkedTasks = discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(link -> recordMapper.toTaskRecord(link.getTask())).toList();
        return new DiscussionDetail(
            post.getId(),
            post.getProject().getId(),
            post.getProject().getName(),
            post.getTitle(),
            post.getContent(),
            post.getAuthor().getName(),
            formatter.format(post.getCreatedAt()),
            post.getCategory().name(),
            post.getStatus().name(),
            replies,
            attachments,
            linkedTasks
        );
    }

    @Transactional
    public DiscussionDetail updateDiscussion(Long postId, DiscussionUpdateRequest request, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        if (request.category() != null && !request.category().isBlank()) post.setCategory(DiscussionCategory.valueOf(request.category()));
        if (request.status() != null && !request.status().isBlank()) post.setStatus(DiscussionStatus.valueOf(request.status()));
        discussionPostRepository.save(post);
        return discussionDetail(postId, principal);
    }

    @Transactional
    public List<TaskRecord> linkTask(Long postId, Long taskId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        TaskEntity task = taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        if (!task.getProject().getId().equals(post.getProject().getId())) throw new ApiException("只能绑定同一项目下的任务");
        if (discussionTaskLinkRepository.findByPostIdAndTaskId(postId, taskId).isEmpty()) {
            DiscussionTaskLinkEntity link = new DiscussionTaskLinkEntity();
            link.setPost(post);
            link.setTask(task);
            discussionTaskLinkRepository.save(link);
        }
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> recordMapper.toTaskRecord(item.getTask())).toList();
    }

    @Transactional
    public List<TaskRecord> unlinkTask(Long postId, Long taskId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        discussionTaskLinkRepository.findByPostIdAndTaskId(postId, taskId).ifPresent(discussionTaskLinkRepository::delete);
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> recordMapper.toTaskRecord(item.getTask())).toList();
    }

    public List<TaskRecord> linkedTasks(Long postId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> recordMapper.toTaskRecord(item.getTask())).toList();
    }

    public TeacherOverview teacherOverview(JwtPrincipal principal) {
        List<ProjectEntity> projects = visibleProjects(principal);
        List<ContributionRow> rows = projects.stream().flatMap(project -> projectMemberRepository.findByProjectId(project.getId()).stream().map(member -> {
            int tasksDone = (int) taskRepository.findByProjectId(project.getId()).stream().filter(task -> task.getAssignee() != null && task.getAssignee().getId().equals(member.getUser().getId()) && task.getStatus() == TaskStatus.DONE).count();
            int commits = project.getType() == ProjectType.CODE ? (int) safeListCommits(project.getId()).stream().filter(item -> item.authorName().equals(member.getUser().getName())).count() : 0;
            int engagement = Math.min(100, 40 + tasksDone * 12 + commits * 6);
            return new ContributionRow(member.getUser().getName(), project.getName(), tasksDone, commits, engagement);
        })).toList();
        int activeStudents = (int) projects.stream()
            .flatMap(project -> projectMemberRepository.findByProjectId(project.getId()).stream())
            .map(ProjectMemberEntity::getUser)
            .filter(user -> user.getRole() == UserRole.STUDENT)
            .map(UserEntity::getId)
            .distinct()
            .count();
        int averageProgress = projects.isEmpty() ? 0 : (int) projects.stream().mapToInt(ProjectEntity::getProgress).average().orElse(0);
        return new TeacherOverview(projects.size(), activeStudents, feedbacks(principal).size(), averageProgress, projects.stream().map(recordMapper::toProjectRecord).toList(), rows);
    }

    public List<TeacherFeedbackRecord> feedbacks(JwtPrincipal principal) {
        return teacherFeedbackRepository.findByProjectCourseTeacherId(principal.userId()).stream().map(item -> new TeacherFeedbackRecord(item.getId(), item.getProject().getId(), item.getProject().getName(), item.getScore(), item.getContent(), item.getTeacher().getName(), formatter.format(item.getCreatedAt()))).toList();
    }

    @Transactional
    public TeacherFeedbackRecord saveFeedback(TeacherFeedbackSaveRequest request, JwtPrincipal principal) {
        ProjectEntity project = projectRepository.findById(request.projectId()).orElseThrow(() -> new ApiException("项目不存在"));
        TeacherFeedbackEntity entity = new TeacherFeedbackEntity();
        entity.setProject(project);
        entity.setTeacher(authService.getUser(principal.userId()));
        entity.setScore(request.score());
        entity.setContent(request.content());
        teacherFeedbackRepository.save(entity);
        projectMemberRepository.findByProjectId(project.getId()).stream().map(ProjectMemberEntity::getUser).forEach(user -> notificationService.create(
            user,
            "教师反馈已更新",
            "项目“" + project.getName() + "”收到新的评分反馈",
            NotificationType.SYSTEM,
            NotificationTarget.none()));
        return new TeacherFeedbackRecord(entity.getId(), project.getId(), project.getName(), entity.getScore(), entity.getContent(), entity.getTeacher().getName(), formatter.format(entity.getCreatedAt()));
    }

    public List<AssignmentRecord> assignments(JwtPrincipal principal) {
        return assignmentRepository.findByCourseTeacherIdOrderByCreatedAtDesc(principal.userId()).stream().map(item -> new AssignmentRecord(
            item.getId(),
            item.getCourse() != null ? item.getCourse().getId() : null,
            item.getCourse() != null ? item.getCourse().getName() : null,
            item.getProject() != null ? item.getProject().getId() : null,
            item.getProject() != null ? item.getProject().getName() : null,
            item.getTitle(),
            item.getSummary(),
            item.getSubmissionUrl(),
            item.getDueDate() != null ? item.getDueDate().toString() : null,
            formatter.format(item.getCreatedAt()),
            null,
            null,
            null,
            null,
            null,
            null,
            null
        )).toList();
    }

    public ProjectEntity requireVisible(Long projectId, JwtPrincipal principal) {
        return projectAccessService.requireVisible(projectId, principal);
    }

    public List<ProjectEntity> visibleProjects(JwtPrincipal principal) {
        return projectAccessService.visibleProjects(principal);
    }

    public ProjectRecord toProjectRecord(ProjectEntity project) {
        return recordMapper.toProjectRecord(project);
    }

    public DocumentRecord toDocumentRecord(DocumentEntity entity) {
        return recordMapper.toDocumentRecord(entity);
    }

    public List<ProjectMemberCandidate> projectMemberCandidates(Long projectId, JwtPrincipal principal) {
        return projectMembershipService.projectMemberCandidates(projectId, principal);
    }

    @Transactional
    public void addProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        projectMembershipService.addProjectMember(projectId, userId, principal);
    }

    @Transactional
    public void removeProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        projectMembershipService.removeProjectMember(projectId, userId, principal);
    }

    @Transactional
    public void addProjectMemberManaged(Long projectId, Long userId, JwtPrincipal principal) {
        projectMembershipService.addProjectMember(projectId, userId, principal);
    }

    @Transactional
    public void removeProjectMemberManaged(Long projectId, Long userId, JwtPrincipal principal) {
        projectMembershipService.removeProjectMember(projectId, userId, principal);
    }

    private List<String> safeListBranches(Long projectId) {
        try {
            return gitService.listBranches(projectId);
        } catch (ApiException ex) {
            return List.of();
        }
    }

    private List<GitService.CommitView> safeListCommits(Long projectId) {
        try {
            return gitService.listCommits(projectId);
        } catch (ApiException ex) {
            return List.of();
        }
    }

    private List<ProjectReleaseEntity> safeListReleases(Long projectId) {
        try {
            return gitService.listReleases(projectId);
        } catch (ApiException ex) {
            return List.of();
        }
    }

    private List<MergeRequestEntity> safeListMergeRequests(Long projectId) {
        try {
            return gitService.listMergeRequests(projectId);
        } catch (ApiException ex) {
            return List.of();
        }
    }

    @Transactional
    public void refreshProjectProgress(Long projectId) {
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow();
        List<TaskEntity> tasks = taskRepository.findByProjectId(projectId);
        int progress = tasks.isEmpty() ? 0 : (int) Math.round(tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count() * 100.0 / tasks.size());
        project.setProgress(progress);
        projectRepository.save(project);
    }

    private NotificationTarget discussionTarget(Long projectId, Long postId) {
        return NotificationTarget.of(
            NotificationSourceType.DISCUSSION,
            postId,
            "/app/projects/" + projectId + "/discussions/" + postId,
            "项目讨论");
    }
}
