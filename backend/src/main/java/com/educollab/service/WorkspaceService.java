package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import com.educollab.service.team.TeamRecordMapper;
import com.educollab.service.workspace.ProjectProgressService;
import com.educollab.service.workspace.WorkspaceProjectMembershipService;
import com.educollab.service.workspace.WorkspaceRecordMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
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
    private final ClassMemberRepository classMemberRepository;
    private final GroupTaskTeamTaskRepository groupTaskTeamTaskRepository;
    private final CourseRepository courseRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMilestoneRepository projectMilestoneRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final TaskRepository taskRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final DiscussionTaskLinkRepository discussionTaskLinkRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final DocumentRepository documentRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final TeacherFeedbackRepository teacherFeedbackRepository;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final GitService gitService;
    private final FileStorageService fileStorageService;
    private final WorkspaceProjectMembershipService projectMembershipService;
    private final ProjectProgressService projectProgressService;
    private final ProjectActivityService projectActivityService;
    private final WorkspaceRecordMapper recordMapper;
    private final TeamRecordMapper teamRecordMapper;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final List<ProjectMilestoneSeed> DEFAULT_MILESTONES = List.of(
        new ProjectMilestoneSeed("构思阶段", "明确目标、问题边界和核心价值。", 1),
        new ProjectMilestoneSeed("蓝图搭建", "整理整体结构、页面草图与技术蓝图。", 1),
        new ProjectMilestoneSeed("项目规划", "拆分任务、确认优先级、资源和验收方式。", 1),
        new ProjectMilestoneSeed("开发实现", "进入主要实现、联调与阶段迭代。", 5),
        new ProjectMilestoneSeed("验收交付", "完成测试、演示、文档和最终交付。", 2));

    public WorkspaceService(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository, ClassMemberRepository classMemberRepository, GroupTaskTeamTaskRepository groupTaskTeamTaskRepository, CourseRepository courseRepository, ProjectRepository projectRepository, ProjectMilestoneRepository projectMilestoneRepository, ProjectMemberRepository projectMemberRepository, ProjectAccessService projectAccessService, TaskRepository taskRepository, DiscussionPostRepository discussionPostRepository, DiscussionReplyRepository discussionReplyRepository, DiscussionTaskLinkRepository discussionTaskLinkRepository, TaskCommentRepository taskCommentRepository, DocumentRepository documentRepository, AssignmentRepository assignmentRepository, AssignmentSubmissionRepository assignmentSubmissionRepository, TeacherFeedbackRepository teacherFeedbackRepository, AuthService authService, NotificationService notificationService, GitService gitService, FileStorageService fileStorageService, WorkspaceProjectMembershipService projectMembershipService, ProjectProgressService projectProgressService, ProjectActivityService projectActivityService, WorkspaceRecordMapper recordMapper, TeamRecordMapper teamRecordMapper) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.classMemberRepository = classMemberRepository;
        this.groupTaskTeamTaskRepository = groupTaskTeamTaskRepository;
        this.courseRepository = courseRepository;
        this.projectRepository = projectRepository;
        this.projectMilestoneRepository = projectMilestoneRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectAccessService = projectAccessService;
        this.taskRepository = taskRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.discussionTaskLinkRepository = discussionTaskLinkRepository;
        this.taskCommentRepository = taskCommentRepository;
        this.documentRepository = documentRepository;
        this.assignmentRepository = assignmentRepository;
        this.assignmentSubmissionRepository = assignmentSubmissionRepository;
        this.teacherFeedbackRepository = teacherFeedbackRepository;
        this.authService = authService;
        this.notificationService = notificationService;
        this.gitService = gitService;
        this.fileStorageService = fileStorageService;
        this.projectMembershipService = projectMembershipService;
        this.projectProgressService = projectProgressService;
        this.projectActivityService = projectActivityService;
        this.recordMapper = recordMapper;
        this.teamRecordMapper = teamRecordMapper;
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
            ? visibleTeacherTeams(principal).stream()
                .map(TeamEntity::getId)
                .collect(Collectors.toSet())
            : teamMemberRepository.findByUserId(principal.userId()).stream()
                .map(TeamMemberEntity::getTeam)
                .map(TeamEntity::getId)
                .collect(Collectors.toSet());
        return teamRepository.findAllById(ids).stream()
            .map(teamRecordMapper::toRecord)
            .sorted(
                Comparator.comparing((TeamRecord item) -> teamSourceSort(item.source()))
                    .thenComparing(item -> Objects.requireNonNullElse(item.courseName(), ""))
                    .thenComparing(item -> Objects.requireNonNullElse(item.name(), "")))
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
        return teamRecordMapper.toRecord(team);
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
        return teamRecordMapper.toRecord(team);
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
        team.setSource(course != null ? TeamSource.COURSE : TeamSource.STANDALONE);
        team.setGroupOrder(course != null ? nextCourseTeamOrder(course.getId()) : null);
        teamRepository.save(team);
        TeamMemberEntity member = new TeamMemberEntity();
        member.setTeam(team);
        member.setUser(leader);
        teamMemberRepository.save(member);
        if (course != null && course.getTeacher() != null && !course.getTeacher().getId().equals(leader.getId())) {
            TeamMemberEntity teacherMember = new TeamMemberEntity();
            teacherMember.setTeam(team);
            teacherMember.setUser(course.getTeacher());
            teamMemberRepository.save(teacherMember);
        }
        return teamRecordMapper.toRecord(team);
    }

    public List<ProjectRecord> projects(JwtPrincipal principal) {
        return visibleProjects(principal).stream().map(recordMapper::toProjectRecord).toList();
    }

    public List<TaskRecord> tasks(JwtPrincipal principal) {
        return visibleProjects(principal).stream()
            .flatMap(project -> buildTaskRecordsForProject(project.getId()).stream())
            .sorted(Comparator.comparing(TaskRecord::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
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
        ProjectProgressService.ProjectProgressState progressState = projectProgressService.snapshotProject(projectId);
        List<ProjectMilestoneRecord> milestones = progressState.milestones().stream()
            .map(milestone -> recordMapper.toProjectMilestoneRecord(milestone, progressState.milestoneSnapshots().get(milestone.getId())))
            .toList();
        List<TaskRecord> projectTasks = buildTaskRecords(progressState);
        List<ProjectMilestoneTaskGroupRecord> milestoneTaskGroups = buildMilestoneTaskGroups(progressState, milestones, projectTasks);
        List<DiscussionPost> posts = discussionPostRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream().map(recordMapper::toDiscussionListItem).toList();
        List<DocumentRecord> docs = documentRepository.findByProjectId(projectId).stream().map(recordMapper::toDocumentRecord).toList();
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId).stream().map(recordMapper::toProjectMember).toList();
        List<String> branches = project.getType() == ProjectType.CODE ? safeListBranches(projectId) : List.of();
        List<GitService.CommitView> commits = project.getType() == ProjectType.CODE ? safeListCommits(projectId) : List.of();
        return new ProjectDetail(
            recordMapper.toProjectRecord(project),
            new ProjectStats(projectTasks.size(), (int) projectTasks.stream().filter(task -> "DONE".equals(task.status())).count(), posts.size(), docs.size(), safeListReleases(projectId).size(), commits.size()),
            milestones,
            projectTasks,
            milestoneTaskGroups,
            posts,
            docs,
            members,
            projectAccessService.canEdit(projectId, principal),
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
        team.setSource(TeamSource.COURSE);
        team.setGroupOrder(nextCourseTeamOrder(course.getId()));
        teamRepository.save(team);
        List<Long> memberIds = request.memberIds() == null || request.memberIds().isEmpty() ? List.of(leader.getId()) : request.memberIds();
        for (Long userId : memberIds.stream().distinct().toList()) {
            TeamMemberEntity entity = new TeamMemberEntity();
            entity.setTeam(team);
            entity.setUser(authService.getUser(userId));
            teamMemberRepository.save(entity);
        }
        return teamRecordMapper.toRecord(team);
    }

    public TeamDetailRecord teamDetail(Long teamId, JwtPrincipal principal) {
        TeamEntity team = requireTeamVisible(teamId, principal);
        boolean currentUserMember = teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId()).isPresent();
        boolean teacherView = canTeacherViewTeam(team, principal) && !currentUserMember;
        ProjectEntity project = projectRepository.findByTeamId(teamId).orElse(null);
        List<TeamMemberRecord> members = teamMemberRepository.findByTeamId(teamId).stream()
            .map(member -> new TeamMemberRecord(
                member.getUser().getId(),
                member.getUser().getName(),
                member.getUser().getEmail(),
                member.getUser().getAvatar(),
                team.getLeader() != null && team.getLeader().getId().equals(member.getUser().getId())))
            .toList();
        List<TeamTaskRecord> tasks = groupTaskTeamTaskRepository.findByTeamIdOrderByCreatedAtDesc(teamId).stream()
            .map(this::toTeamTaskRecord)
            .toList();
        TeamLinkedProjectRecord linkedProject = project == null
            ? null
            : new TeamLinkedProjectRecord(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getType() != null ? project.getType().name() : null,
                project.getStatus() != null ? project.getStatus().name() : null,
                project.getProgress(),
                taskRepository.findByProjectId(project.getId()).size(),
                (int) taskRepository.findByProjectId(project.getId()).stream().filter(task -> task.getStatus() == TaskStatus.DONE).count());
        return new TeamDetailRecord(
            team.getId(),
            team.getName(),
            teamRecordMapper.resolveSource(team).name(),
            team.getCourse() != null ? team.getCourse().getId() : null,
            team.getCourse() != null ? team.getCourse().getName() : null,
            team.getGroupOrder(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : null,
            team.getStatus() != null ? team.getStatus().name() : null,
            team.getInviteCode(),
            team.getLeader() != null && team.getLeader().getId().equals(principal.userId()),
            currentUserMember,
            teacherView,
            members,
            linkedProject,
            tasks);
    }

    @Transactional
    public TeamRecord transferLeader(Long teamId, TeamTransferLeaderRequest request, JwtPrincipal principal) {
        TeamEntity team = requireTeamLeader(teamId, principal);
        TeamMemberEntity target = teamMemberRepository.findByTeamIdAndUserId(teamId, request.leaderUserId())
            .orElseThrow(() -> new ApiException("目标成员不在团队中"));
        team.setLeader(target.getUser());
        teamRepository.save(team);
        return teamRecordMapper.toRecord(team);
    }

    @Transactional
    public void removeTeamMember(Long teamId, Long userId, JwtPrincipal principal) {
        TeamEntity team = requireTeamLeader(teamId, principal);
        if (team.getLeader() != null && team.getLeader().getId().equals(userId)) {
            throw new ApiException("不能移除自己，请先转让队长");
        }
        TeamMemberEntity membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            .orElseThrow(() -> new ApiException("该成员不在团队中"));
        teamMemberRepository.delete(membership);
        cleanupEmptyTeam(team);
    }

    public List<TeamTaskRecord> teamTasks(Long teamId, JwtPrincipal principal) {
        requireTeamVisible(teamId, principal);
        return groupTaskTeamTaskRepository.findByTeamIdOrderByCreatedAtDesc(teamId).stream()
            .map(this::toTeamTaskRecord)
            .toList();
    }

    @Transactional
    public TeamTaskRecord saveTeamTask(Long teamId, TeamTaskSaveRequest request, Long taskId, JwtPrincipal principal) {
        TeamEntity team = requireTeamTaskEditor(teamId, principal);
        GroupTaskTeamTaskEntity entity = taskId == null
            ? new GroupTaskTeamTaskEntity()
            : groupTaskTeamTaskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        entity.setTeam(team);
        entity.setTitle(request.title());
        entity.setDescription(request.description());
        entity.setStatus(request.status() == null || request.status().isBlank() ? TaskStatus.TODO : TaskStatus.valueOf(request.status()));
        entity.setDueDate(request.dueDate() == null || request.dueDate().isBlank() ? null : LocalDate.parse(request.dueDate()));
        entity.setAssignee(resolveTeamAssignee(teamId, request.assigneeId()));
        groupTaskTeamTaskRepository.save(entity);
        if (entity.getAssignee() != null) {
            notificationService.create(
                entity.getAssignee(),
                "收到团队任务",
                "团队任务已更新：" + entity.getTitle(),
                NotificationType.TASK,
                NotificationTarget.of(NotificationSourceType.TASK, entity.getId(), "/app/teams/" + teamId + "/tasks", "团队任务"));
        }
        return toTeamTaskRecord(entity);
    }

    @Transactional
    public TeamTaskRecord updateTeamTask(Long taskId, TeamTaskSaveRequest request, JwtPrincipal principal) {
        GroupTaskTeamTaskEntity entity = groupTaskTeamTaskRepository.findById(taskId)
            .orElseThrow(() -> new ApiException("任务不存在"));
        return saveTeamTask(entity.getTeam().getId(), request, taskId, principal);
    }

    @Transactional
    public ProjectRecord createTeamProject(Long teamId, TeamProjectSaveRequest request, JwtPrincipal principal) {
        TeamEntity team = requireTeamLeader(teamId, principal);
        projectRepository.findByTeamId(teamId).ifPresent(project -> {
            throw new ApiException("该团队已创建项目");
        });
        ProjectEntity project = new ProjectEntity();
        project.setTeam(team);
        project.setCourse(team.getCourse());
        project.setGroupTask(null);
        project.setName(request.name());
        project.setDescription(request.description());
        project.setType(ProjectType.valueOf(request.type()));
        project.setStatus(ProjectStatus.ACTIVE);
        project.setDueDate(request.dueDate() == null || request.dueDate().isBlank() ? null : LocalDate.parse(request.dueDate()));
        projectRepository.saveAndFlush(project);
        List<ProjectMilestoneEntity> milestones = createDefaultMilestones(project);
        refreshProjectProgress(project.getId());
        projectActivityService.recordProjectCreated(project, principal.userId());
        milestones.forEach(milestone -> projectActivityService.recordMilestoneCreated(milestone, principal.userId(), true));
        for (TeamMemberEntity member : teamMemberRepository.findByTeamId(teamId)) {
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

    private List<TeamEntity> visibleTeacherTeams(JwtPrincipal principal) {
        Set<Long> visibleIds = new LinkedHashSet<>();
        teamRepository.findByCourseTeacherIdOrderByCreatedAtAsc(principal.userId()).stream()
            .map(TeamEntity::getId)
            .forEach(visibleIds::add);
        teamMemberRepository.findByUserId(principal.userId()).stream()
            .map(TeamMemberEntity::getTeam)
            .filter(team -> teamRecordMapper.resolveSource(team) == TeamSource.STANDALONE)
            .map(TeamEntity::getId)
            .forEach(visibleIds::add);
        return teamRepository.findAllById(visibleIds);
    }

    private int teamSourceSort(String source) {
        if (TeamSource.STANDALONE.name().equals(source)) return 0;
        if (TeamSource.COURSE.name().equals(source)) return 1;
        return 9;
    }

    @Transactional
    public ProjectRecord createProject(ProjectSaveRequest request, JwtPrincipal principal) {
        if (request.teamId() == null) throw new ApiException("请选择项目所属团队");
        TeamEntity team = teamRepository.findById(request.teamId()).orElseThrow(() -> new ApiException("团队不存在"));
        CourseEntity course = request.courseId() != null
            ? courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在"))
            : team.getCourse();
        ProjectEntity project = new ProjectEntity();
        project.setTeam(team);
        project.setCourse(course);
        project.setGroupTask(null);
        project.setName(request.name());
        project.setDescription(request.description());
        project.setType(ProjectType.valueOf(request.type()));
        project.setStatus(ProjectStatus.ACTIVE);
        if (request.dueDate() != null && !request.dueDate().isBlank()) project.setDueDate(LocalDate.parse(request.dueDate()));
        projectRepository.saveAndFlush(project);
        List<ProjectMilestoneEntity> milestones = createDefaultMilestones(project);
        refreshProjectProgress(project.getId());
        projectActivityService.recordProjectCreated(project, principal.userId());
        milestones.forEach(milestone -> projectActivityService.recordMilestoneCreated(milestone, principal.userId(), true));
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
        ProjectEntity project = requireProjectEditable(request.projectId(), principal);
        List<TaskEntity> projectTasks = taskRepository.findByProjectId(project.getId());
        Map<Long, TaskEntity> taskById = projectTasks.stream().collect(Collectors.toMap(TaskEntity::getId, item -> item));
        TaskEntity task = taskId == null ? new TaskEntity() : taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        if (taskId != null && !Objects.equals(task.getProject().getId(), project.getId())) {
            throw new ApiException("任务不属于当前项目");
        }
        boolean existingHasChildren = taskId != null && hasChildren(task.getId(), projectTasks);
        TaskStatus previousStatus = taskId == null ? null : task.getStatus();
        TaskStatus nextStatus = TaskStatus.valueOf(request.status());

        TaskEntity requestedParent = request.parentTaskId() == null ? null : taskById.get(request.parentTaskId());
        if (request.parentTaskId() != null && requestedParent == null) {
            throw new ApiException("父任务不存在");
        }
        ProjectMilestoneEntity milestone =
            resolveMilestone(
                project.getId(),
                request.milestoneId(),
                requestedParent != null && requestedParent.getMilestone() != null
                    ? requestedParent.getMilestone().getId()
                    : null);
        TaskEntity parentTask = resolveParentTask(project.getId(), milestone, request.parentTaskId(), taskId, taskById);
        ProjectProgressService.ProjectProgressState progressState = projectProgressService.snapshotProject(project.getId());
        Map<Long, ProjectMilestoneStatus> milestoneStatusesBefore = milestoneStatuses(progressState);
        validateMilestoneTransition(progressState, milestone, previousStatus, nextStatus, taskId == null);
        validateTaskCompletion(taskId, nextStatus, task, projectTasks);

        task.setProject(project);
        task.setMilestone(milestone);
        task.setParentTask(parentTask);
        task.setSortOrder(resolveTaskSortOrder(request.sortOrder(), task, projectTasks, milestone, parentTask));
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(nextStatus);
        applyCompletedAt(task, previousStatus, nextStatus, existingHasChildren);
        task.setPriority(TaskPriority.valueOf(request.priority()));
        task.setAssignee(resolveTaskAssignee(request.assigneeId(), previousStatus, nextStatus, principal));
        task.setDueDate(request.dueDate() == null || request.dueDate().isBlank() ? null : LocalDate.parse(request.dueDate()));
        taskRepository.save(task);
        ProjectProgressService.ProjectProgressState updatedState = projectProgressService.recomputeProject(project.getId());
        boolean leafTask = !hasChildren(task.getId(), updatedState.tasks());
        projectActivityService.recordTaskSaved(task, taskId == null, previousStatus, nextStatus, leafTask, principal.userId());
        projectActivityService.recordMilestoneCompletionChanges(updatedState.milestones(), milestoneStatusesBefore, milestoneStatuses(updatedState), principal.userId());
        if (task.getAssignee() != null) {
            notificationService.create(
                task.getAssignee(),
                "任务已分配",
                "你被分配到任务：“" + task.getTitle() + "”",
                NotificationType.TASK,
                NotificationTarget.of(NotificationSourceType.TASK, task.getId(), "/app/tasks/" + task.getId(), "任务详情"));
        }
        return recordMapper.toTaskRecord(
            task,
            updatedState.taskSnapshots().get(task.getId()),
            isTaskBlockedByMilestone(updatedState, task));
    }

    public List<ProjectMilestoneRecord> projectMilestones(Long projectId, JwtPrincipal principal) {
        requireVisible(projectId, principal);
        ProjectProgressService.ProjectProgressState state = projectProgressService.snapshotProject(projectId);
        return state.milestones().stream()
            .map(milestone -> recordMapper.toProjectMilestoneRecord(milestone, state.milestoneSnapshots().get(milestone.getId())))
            .toList();
    }

    @Transactional
    public ProjectMilestoneRecord createProjectMilestone(Long projectId, ProjectMilestoneSaveRequest request, JwtPrincipal principal) {
        ProjectEntity project = requireProjectEditable(projectId, principal);
        ProjectMilestoneEntity milestone = new ProjectMilestoneEntity();
        milestone.setProject(project);
        milestone.setTitle(request.title());
        milestone.setDescription(request.description());
        milestone.setSortOrder(nextMilestoneSortOrder(projectId));
        milestone.setWeight(normalizedWeight(request.weight()));
        projectMilestoneRepository.save(milestone);
        ProjectProgressService.ProjectProgressState state = projectProgressService.recomputeProject(projectId);
        projectActivityService.recordMilestoneCreated(milestone, principal.userId(), false);
        return recordMapper.toProjectMilestoneRecord(milestone, state.milestoneSnapshots().get(milestone.getId()));
    }

    @Transactional
    public ProjectMilestoneRecord updateProjectMilestone(Long milestoneId, ProjectMilestoneSaveRequest request, JwtPrincipal principal) {
        ProjectMilestoneEntity milestone = projectMilestoneRepository.findById(milestoneId).orElseThrow(() -> new ApiException("里程碑不存在"));
        requireProjectEditable(milestone.getProject().getId(), principal);
        milestone.setTitle(request.title());
        milestone.setDescription(request.description());
        milestone.setWeight(normalizedWeight(request.weight()));
        projectMilestoneRepository.save(milestone);
        ProjectProgressService.ProjectProgressState state = projectProgressService.recomputeProject(milestone.getProject().getId());
        return recordMapper.toProjectMilestoneRecord(milestone, state.milestoneSnapshots().get(milestone.getId()));
    }

    @Transactional
    public ProjectMilestoneRecord completeProjectMilestone(Long milestoneId, JwtPrincipal principal) {
        ProjectMilestoneEntity milestone = projectMilestoneRepository.findById(milestoneId).orElseThrow(() -> new ApiException("里程碑不存在"));
        requireProjectEditable(milestone.getProject().getId(), principal);
        ProjectProgressService.ProjectProgressState beforeState = projectProgressService.snapshotProject(milestone.getProject().getId());
        ProjectProgressService.MilestoneSnapshot beforeSnapshot = beforeState.milestoneSnapshots().get(milestoneId);
        if (beforeSnapshot == null || beforeSnapshot.status() != ProjectMilestoneStatus.ACTIVE) {
            throw new ApiException("只有当前激活的里程碑可以标记完成");
        }
        if (!beforeSnapshot.canMarkDone()) {
            throw new ApiException("请先完成该里程碑下的所有任务，再标记里程碑完成");
        }
        Map<Long, ProjectMilestoneStatus> milestoneStatusesBefore = milestoneStatuses(beforeState);
        if (milestone.getActivatedAt() == null) {
            milestone.setActivatedAt(LocalDateTime.now());
        }
        milestone.setStatus(ProjectMilestoneStatus.DONE);
        milestone.setCompletedAt(LocalDateTime.now());
        projectMilestoneRepository.save(milestone);
        ProjectProgressService.ProjectProgressState updatedState = projectProgressService.recomputeProject(milestone.getProject().getId());
        projectActivityService.recordMilestoneCompletionChanges(updatedState.milestones(), milestoneStatusesBefore, milestoneStatuses(updatedState), principal.userId());
        return recordMapper.toProjectMilestoneRecord(milestone, updatedState.milestoneSnapshots().get(milestone.getId()));
    }

    @Transactional
    public void deleteProjectMilestone(Long milestoneId, JwtPrincipal principal) {
        ProjectMilestoneEntity milestone = projectMilestoneRepository.findById(milestoneId).orElseThrow(() -> new ApiException("里程碑不存在"));
        requireMilestoneManagePermission(milestone.getProject(), principal);
        boolean hasTasks = taskRepository.findByProjectId(milestone.getProject().getId()).stream()
            .anyMatch(task -> task.getMilestone() != null && milestoneId.equals(task.getMilestone().getId()));
        if (hasTasks) {
            throw new ApiException("该里程碑下还有任务，请先迁移或清空任务归属");
        }
        projectMilestoneRepository.delete(milestone);
        projectProgressService.recomputeProject(milestone.getProject().getId());
    }

    @Transactional
    public void deleteTask(Long taskId, JwtPrincipal principal) {
        TaskEntity task = taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        requireProjectEditable(task.getProject().getId(), principal);
        List<TaskEntity> projectTasks = taskRepository.findByProjectId(task.getProject().getId());
        if (hasChildren(task.getId(), projectTasks)) {
            throw new ApiException("当前任务还有子任务，请先处理子任务后再删除");
        }
        fileStorageService.deleteAllForOwner(FileOwnerType.TASK, taskId);
        discussionTaskLinkRepository.deleteByTaskId(taskId);
        taskCommentRepository.deleteByTaskId(taskId);
        taskRepository.delete(task);
        projectProgressService.recomputeProject(task.getProject().getId());
    }

    private UserEntity resolveTaskAssignee(Long requestedAssigneeId, TaskStatus previousStatus, TaskStatus nextStatus, JwtPrincipal principal) {
        if (previousStatus == TaskStatus.TODO && nextStatus == TaskStatus.IN_PROGRESS) {
            return authService.getUser(principal.userId());
        }
        return requestedAssigneeId == null ? null : authService.getUser(requestedAssigneeId);
    }

    private TaskEntity resolveParentTask(
        Long projectId,
        ProjectMilestoneEntity milestone,
        Long parentTaskId,
        Long taskId,
        Map<Long, TaskEntity> taskById
    ) {
        if (parentTaskId == null) return null;
        TaskEntity parent = taskById.get(parentTaskId);
        if (parent == null || !Objects.equals(parent.getProject().getId(), projectId)) {
            throw new ApiException("父任务不存在");
        }
        if (taskId != null && Objects.equals(parent.getId(), taskId)) {
            throw new ApiException("任务不能把自己设为父任务");
        }
        Long milestoneId = milestone != null ? milestone.getId() : null;
        Long parentMilestoneId = parent.getMilestone() != null ? parent.getMilestone().getId() : null;
        if (!Objects.equals(milestoneId, parentMilestoneId)) {
            throw new ApiException("父子任务必须归属同一个里程碑");
        }
        if (parent.getStatus() == TaskStatus.DONE) {
            throw new ApiException("已完成父任务下不能继续新增或迁入子任务，请先重开父任务");
        }
        TaskEntity cursor = parent;
        while (cursor != null) {
            if (taskId != null && Objects.equals(cursor.getId(), taskId)) {
                throw new ApiException("不能形成循环父子关系");
            }
            cursor = cursor.getParentTask() != null ? taskById.get(cursor.getParentTask().getId()) : null;
        }
        return parent;
    }

    private Integer resolveTaskSortOrder(
        Integer requestedSortOrder,
        TaskEntity task,
        List<TaskEntity> projectTasks,
        ProjectMilestoneEntity milestone,
        TaskEntity parentTask
    ) {
        if (requestedSortOrder != null) return requestedSortOrder;
        if (task.getId() != null && task.getSortOrder() != null) return task.getSortOrder();
        Long milestoneId = milestone != null ? milestone.getId() : null;
        Long parentId = parentTask != null ? parentTask.getId() : null;
        return projectTasks.stream()
            .filter(item -> !Objects.equals(item.getId(), task.getId()))
            .filter(item -> Objects.equals(item.getMilestone() != null ? item.getMilestone().getId() : null, milestoneId))
            .filter(item -> Objects.equals(item.getParentTask() != null ? item.getParentTask().getId() : null, parentId))
            .map(TaskEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private void validateMilestoneTransition(
        ProjectProgressService.ProjectProgressState state,
        ProjectMilestoneEntity milestone,
        TaskStatus previousStatus,
        TaskStatus nextStatus,
        boolean creating
    ) {
        if (milestone == null) return;
        ProjectProgressService.MilestoneSnapshot snapshot = state.milestoneSnapshots().get(milestone.getId());
        ProjectMilestoneStatus status = snapshot != null ? snapshot.status() : milestone.getStatus();
        if (status == ProjectMilestoneStatus.LOCKED && nextStatus != TaskStatus.TODO) {
            throw new ApiException("未激活阶段的任务不能直接推进");
        }
        if (status == ProjectMilestoneStatus.DONE) {
            if (creating) {
                throw new ApiException("已完成阶段不能再新增任务");
            }
            boolean reopen = previousStatus == TaskStatus.DONE && nextStatus != TaskStatus.DONE;
            if (reopen) {
                throw new ApiException("已完成阶段的任务不支持直接重开");
            }
        }
    }

    private void validateTaskCompletion(Long taskId, TaskStatus nextStatus, TaskEntity task, List<TaskEntity> projectTasks) {
        if (nextStatus != TaskStatus.DONE) {
            return;
        }
        Long effectiveTaskId = taskId != null ? taskId : task.getId();
        if (effectiveTaskId == null) {
            return;
        }
        if (!allDescendantsDone(effectiveTaskId, projectTasks)) {
            throw new ApiException("请先完成该任务下的所有子任务，再标记父任务完成");
        }
    }

    private boolean hasChildren(Long taskId, List<TaskEntity> projectTasks) {
        return projectTasks.stream()
            .anyMatch(item -> item.getParentTask() != null && Objects.equals(item.getParentTask().getId(), taskId));
    }

    private boolean allDescendantsDone(Long taskId, List<TaskEntity> projectTasks) {
        return projectTasks.stream()
            .filter(item -> item.getParentTask() != null && Objects.equals(item.getParentTask().getId(), taskId))
            .allMatch(item -> item.getStatus() == TaskStatus.DONE && allDescendantsDone(item.getId(), projectTasks));
    }

    private int normalizedWeight(Integer weight) {
        return weight == null || weight <= 0 ? 1 : weight;
    }

    private List<TaskRecord> buildTaskRecordsForProject(Long projectId) {
        return buildTaskRecords(projectProgressService.snapshotProject(projectId));
    }

    private List<TaskRecord> buildTaskRecords(ProjectProgressService.ProjectProgressState state) {
        return state.tasks().stream()
            .map(task -> recordMapper.toTaskRecord(
                task,
                state.taskSnapshots().get(task.getId()),
                isTaskBlockedByMilestone(state, task)))
            .sorted(Comparator.comparing(TaskRecord::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    private boolean isTaskBlockedByMilestone(ProjectProgressService.ProjectProgressState state, TaskEntity task) {
        if (task.getMilestone() == null) return false;
        ProjectProgressService.MilestoneSnapshot snapshot = state.milestoneSnapshots().get(task.getMilestone().getId());
        return snapshot != null && snapshot.status() != ProjectMilestoneStatus.ACTIVE;
    }

    private List<ProjectMilestoneTaskGroupRecord> buildMilestoneTaskGroups(
        ProjectProgressService.ProjectProgressState state,
        List<ProjectMilestoneRecord> milestones,
        List<TaskRecord> taskRecords
    ) {
        Map<Long, List<TaskRecord>> childrenByParentId = new LinkedHashMap<>();
        for (TaskRecord task : taskRecords) {
            childrenByParentId.computeIfAbsent(task.parentTaskId(), ignored -> new ArrayList<>()).add(task);
        }
        Map<Long, ProjectMilestoneRecord> milestoneRecordById = milestones.stream()
            .collect(Collectors.toMap(ProjectMilestoneRecord::id, item -> item, (left, right) -> left, LinkedHashMap::new));
        return state.milestones().stream()
            .map(milestone -> new ProjectMilestoneTaskGroupRecord(
                milestoneRecordById.get(milestone.getId()),
                taskRecords.stream()
                    .filter(task -> Objects.equals(task.milestoneId(), milestone.getId()) && task.parentTaskId() == null)
                    .map(task -> toTaskTreeRecord(task, childrenByParentId))
                    .toList()))
            .toList();
    }

    private TaskTreeRecord toTaskTreeRecord(TaskRecord task, Map<Long, List<TaskRecord>> childrenByParentId) {
        return new TaskTreeRecord(
            task,
            childrenByParentId.getOrDefault(task.id(), List.of()).stream()
                .map(child -> toTaskTreeRecord(child, childrenByParentId))
                .toList());
    }

    private ProjectMilestoneEntity resolveMilestone(Long projectId, Long milestoneId, Long fallbackMilestoneId) {
        List<ProjectMilestoneEntity> milestones = projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(projectId);
        if (milestones.isEmpty()) return null;
        Long resolvedId = milestoneId != null ? milestoneId : fallbackMilestoneId;
        if (resolvedId != null) {
            ProjectMilestoneEntity milestone = projectMilestoneRepository.findById(resolvedId).orElseThrow(() -> new ApiException("里程碑不存在"));
            if (!Objects.equals(milestone.getProject().getId(), projectId)) {
                throw new ApiException("任务只能归属到当前项目的里程碑");
            }
            return milestone;
        }
        return milestones.stream()
            .filter(item -> item.getStatus() == ProjectMilestoneStatus.ACTIVE)
            .findFirst()
            .orElse(milestones.get(0));
    }

    private void applyCompletedAt(TaskEntity task, TaskStatus previousStatus, TaskStatus nextStatus, boolean hasChildren) {
        boolean nextDone = nextStatus == TaskStatus.DONE;
        boolean previousDone = previousStatus == TaskStatus.DONE;
        if (!previousDone && nextDone) {
            task.setCompletedAt(LocalDateTime.now());
            return;
        }
        if (previousDone && !nextDone) {
            task.setCompletedAt(null);
        }
    }

    @Transactional
    public void deleteTaskAttachment(Long taskId, Long fileId, JwtPrincipal principal) {
        TaskEntity task = taskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
        requireProjectEditable(task.getProject().getId(), principal);
        fileStorageService.deleteOwnedFile(FileOwnerType.TASK, taskId, fileId);
    }

    @Transactional
    public DiscussionDetail createDiscussion(DiscussionSaveRequest request, JwtPrincipal principal) {
        ProjectEntity project = requireProjectEditable(request.projectId(), principal);
        DiscussionPostEntity entity = new DiscussionPostEntity();
        entity.setProject(project);
        entity.setAuthor(authService.getUser(principal.userId()));
        entity.setTitle(request.title());
        entity.setContent(request.content());
        entity.setCategory(DiscussionCategory.valueOf(Objects.requireNonNullElse(request.category(), "GENERAL")));
        entity.setStatus(DiscussionStatus.OPEN);
        discussionPostRepository.save(entity);
        projectActivityService.recordDiscussionPostCreated(entity, principal.userId());
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
        requireProjectEditable(post.getProject().getId(), principal);
        DiscussionReplyEntity entity = new DiscussionReplyEntity();
        entity.setPost(post);
        entity.setAuthor(authService.getUser(principal.userId()));
        entity.setContent(request.content());
        discussionReplyRepository.save(entity);
        projectActivityService.recordDiscussionReplyCreated(entity, principal.userId());
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
        requireProjectEditable(post.getProject().getId(), principal);
        if (request.category() != null && !request.category().isBlank()) post.setCategory(DiscussionCategory.valueOf(request.category()));
        if (request.status() != null && !request.status().isBlank()) post.setStatus(DiscussionStatus.valueOf(request.status()));
        discussionPostRepository.save(post);
        return discussionDetail(postId, principal);
    }

    @Transactional
    public List<TaskRecord> linkTask(Long postId, Long taskId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireProjectEditable(post.getProject().getId(), principal);
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
        requireProjectEditable(post.getProject().getId(), principal);
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
        int pendingReviews = (int) assignmentSubmissionRepository.findByAssignmentCourseTeacherId(principal.userId()).stream()
            .filter(item -> item.getStatus() == AssignmentSubmissionStatus.SUBMITTED)
            .count();
        return new TeacherOverview(projects.size(), activeStudents, pendingReviews, averageProgress, projects.stream().map(recordMapper::toProjectRecord).toList(), rows);
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
            item.getStatus() != null ? item.getStatus().name() : "OPEN",
            item.getStatus() == null || item.getStatus() == AssignmentStatus.OPEN,
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

    public ProjectEntity requireProjectEditable(Long projectId, JwtPrincipal principal) {
        return projectAccessService.requireEditable(projectId, principal);
    }

    public boolean canEditProject(Long projectId, JwtPrincipal principal) {
        return projectAccessService.canEdit(projectId, principal);
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

    public void trackProjectVisit(Long projectId, String pageKey, JwtPrincipal principal) {
        projectActivityService.trackProjectVisit(projectId, pageKey, principal);
    }

    public ProjectWeeklyReportRecord projectWeeklyReport(Long projectId, LocalDate weekStart, JwtPrincipal principal) {
        return projectActivityService.projectWeeklyReport(projectId, weekStart, principal);
    }

    public List<ProjectActivityEventRecord> projectActivity(Long projectId, LocalDate weekStart, JwtPrincipal principal) {
        return projectActivityService.projectActivity(projectId, weekStart, principal);
    }

    public ProjectSummaryRecord projectSummary(
        Long projectId,
        String rangeType,
        LocalDate anchorDate,
        LocalDate startDate,
        LocalDate endDate,
        Long memberId,
        JwtPrincipal principal
    ) {
        return projectActivityService.projectSummary(projectId, rangeType, anchorDate, startDate, endDate, memberId, principal);
    }

    public List<ProjectActivityEventRecord> projectSummaryActivity(
        Long projectId,
        String rangeType,
        LocalDate anchorDate,
        LocalDate startDate,
        LocalDate endDate,
        Long memberId,
        JwtPrincipal principal
    ) {
        return projectActivityService.projectSummaryActivity(projectId, rangeType, anchorDate, startDate, endDate, memberId, principal);
    }

    public TeacherContributionReportRecord teacherContributionReport(Long courseId, LocalDate weekStart, JwtPrincipal principal) {
        return projectActivityService.teacherContributionReport(courseId, weekStart, principal);
    }

    public TeacherSummaryRecord teacherSummary(
        Long courseId,
        String rangeType,
        LocalDate anchorDate,
        LocalDate startDate,
        LocalDate endDate,
        JwtPrincipal principal
    ) {
        return projectActivityService.teacherSummary(courseId, rangeType, anchorDate, startDate, endDate, principal);
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

    private TeamEntity requireTeamVisible(Long teamId, JwtPrincipal principal) {
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        if (canTeacherViewTeam(team, principal) || canCourseStudentViewTeam(team, principal)) {
            return team;
        }
        teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId())
            .orElseThrow(() -> new ApiException("无权访问该团队"));
        return team;
    }

    private TeamEntity requireTeamLeader(Long teamId, JwtPrincipal principal) {
        TeamEntity team = requireTeamVisible(teamId, principal);
        if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
            throw new ApiException("只有队长可以执行该操作");
        }
        return team;
    }

    private void requireMilestoneManagePermission(ProjectEntity project, JwtPrincipal principal) {
        requireProjectEditable(project.getId(), principal);
        if (principal.role() == UserRole.TEACHER) {
            return;
        }
        if (project.getTeam() != null && project.getTeam().getLeader() != null && Objects.equals(project.getTeam().getLeader().getId(), principal.userId())) {
            return;
        }
        boolean owner = projectMemberRepository.findByProjectIdAndUserId(project.getId(), principal.userId())
            .map(ProjectMemberEntity::isOwnerFlag)
            .orElse(false);
        if (project.getTeam() == null && owner) {
            return;
        }
        throw new ApiException("只有教师或队长可以删除里程碑");
    }

    private TeamEntity requireTeamTaskEditor(Long teamId, JwtPrincipal principal) {
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        if (principal.role() == UserRole.TEACHER) {
            throw new ApiException("教师视图仅支持查看团队任务");
        }
        teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId())
            .orElseThrow(() -> new ApiException("只有团队成员可以编辑任务"));
        return team;
    }

    private boolean canTeacherViewTeam(TeamEntity team, JwtPrincipal principal) {
        return principal.role() == UserRole.TEACHER
            && team.getCourse() != null
            && team.getCourse().getTeacher() != null
            && team.getCourse().getTeacher().getId().equals(principal.userId());
    }

    private boolean canCourseStudentViewTeam(TeamEntity team, JwtPrincipal principal) {
        return principal.role() == UserRole.STUDENT
            && teamRecordMapper.resolveSource(team) == TeamSource.COURSE
            && team.getCourse() != null
            && classMemberRepository.findByCourseIdAndUserId(team.getCourse().getId(), principal.userId()).isPresent();
    }

    private Integer nextCourseTeamOrder(Long courseId) {
        return teamRepository.findByCourseIdOrderByCreatedAtAsc(courseId).stream()
            .map(TeamEntity::getGroupOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private List<ProjectMilestoneEntity> createDefaultMilestones(ProjectEntity project) {
        List<ProjectMilestoneEntity> existing = projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(project.getId());
        if (!existing.isEmpty()) {
            return existing;
        }
        List<ProjectMilestoneEntity> created = new ArrayList<>();
        int sortOrder = 1;
        for (ProjectMilestoneSeed seed : DEFAULT_MILESTONES) {
            ProjectMilestoneEntity milestone = new ProjectMilestoneEntity();
            milestone.setProject(project);
            milestone.setTitle(seed.title());
            milestone.setDescription(seed.description());
            milestone.setSortOrder(sortOrder++);
            milestone.setWeight(seed.weight());
            projectMilestoneRepository.save(milestone);
            created.add(milestone);
        }
        return created;
    }

    private Map<Long, ProjectMilestoneStatus> milestoneStatuses(ProjectProgressService.ProjectProgressState state) {
        return state.milestones().stream()
            .collect(Collectors.toMap(
                ProjectMilestoneEntity::getId,
                milestone -> state.milestoneSnapshots().containsKey(milestone.getId())
                    ? state.milestoneSnapshots().get(milestone.getId()).status()
                    : milestone.getStatus(),
                (left, right) -> right,
                LinkedHashMap::new));
    }

    private int nextMilestoneSortOrder(Long projectId) {
        return projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(projectId).stream()
            .map(ProjectMilestoneEntity::getSortOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private UserEntity resolveTeamAssignee(Long teamId, Long assigneeId) {
        if (assigneeId == null) return null;
        return teamMemberRepository.findByTeamIdAndUserId(teamId, assigneeId)
            .map(TeamMemberEntity::getUser)
            .orElseThrow(() -> new ApiException("任务负责人必须是当前团队成员"));
    }

    private TeamTaskRecord toTeamTaskRecord(GroupTaskTeamTaskEntity entity) {
        return new TeamTaskRecord(
            entity.getId(),
            entity.getTeam() != null ? entity.getTeam().getId() : null,
            entity.getTitle(),
            entity.getDescription(),
            entity.getStatus() != null ? entity.getStatus().name() : null,
            entity.getAssignee() != null ? entity.getAssignee().getId() : null,
            entity.getAssignee() != null ? entity.getAssignee().getName() : null,
            entity.getDueDate() != null ? entity.getDueDate().toString() : null,
            entity.getCreatedAt() != null ? formatter.format(entity.getCreatedAt()) : null);
    }

    private void cleanupEmptyTeam(TeamEntity team) {
        if (teamMemberRepository.findByTeamId(team.getId()).isEmpty()) {
            projectRepository.findByTeamId(team.getId()).ifPresent(projectRepository::delete);
            teamRepository.delete(team);
        }
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
        projectProgressService.recomputeProject(projectId);
    }

    private NotificationTarget discussionTarget(Long projectId, Long postId) {
        return NotificationTarget.of(
            NotificationSourceType.DISCUSSION,
            postId,
            "/app/projects/" + projectId + "/discussions/" + postId,
            "项目讨论");
    }

    private record ProjectMilestoneSeed(String title, String description, int weight) {}
}
