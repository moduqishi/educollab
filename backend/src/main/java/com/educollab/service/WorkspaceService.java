package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
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
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public WorkspaceService(TeamRepository teamRepository, TeamMemberRepository teamMemberRepository, CourseRepository courseRepository, ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository, ProjectAccessService projectAccessService, TaskRepository taskRepository, DiscussionPostRepository discussionPostRepository, DiscussionReplyRepository discussionReplyRepository, DiscussionTaskLinkRepository discussionTaskLinkRepository, DocumentRepository documentRepository, AssignmentRepository assignmentRepository, TeacherFeedbackRepository teacherFeedbackRepository, AuthService authService, NotificationService notificationService, GitService gitService, FileStorageService fileStorageService) {
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
    }

    public DashboardSummary dashboard(JwtPrincipal principal) {
        List<ProjectEntity> projects = visibleProjects(principal);
        List<TaskRecord> taskRecords = tasks(principal);
        List<DocumentRecord> documents = documents(principal);
        return new DashboardSummary(
            projects.size(),
            (int) taskRecords.stream().filter(item -> !"DONE".equals(item.status())).count(),
            (int) notificationService.list(principal.userId()).stream().filter(item -> !item.read()).count(),
            projects.stream().limit(4).map(this::toProjectRecord).toList(),
            taskRecords.stream().filter(item -> !"DONE".equals(item.status())).limit(4).toList(),
            documents.stream().limit(4).toList()
        );
    }

    public List<TeamRecord> teams(JwtPrincipal principal) {
        Set<Long> ids = principal.role() == UserRole.TEACHER
            ? teamRepository.findAll().stream().filter(team -> team.getCourse() != null && team.getCourse().getTeacher() != null && principal.userId().equals(team.getCourse().getTeacher().getId())).map(TeamEntity::getId).collect(Collectors.toSet())
            : projectMemberRepository.findByUserId(principal.userId()).stream().map(member -> member.getProject().getTeam().getId()).collect(Collectors.toSet());
        return teamRepository.findAllById(ids).stream()
            .map(team -> new TeamRecord(
                team.getId(),
                team.getName(),
                team.getCourse() != null ? team.getCourse().getId() : null,
                team.getCourse() != null ? team.getCourse().getName() : "",
                teamMemberRepository.findByTeamId(team.getId()).size(),
                team.getLeader() != null ? team.getLeader().getId() : null,
                team.getLeader() != null ? team.getLeader().getName() : ""
            ))
            .toList();
    }

    public List<ProjectRecord> projects(JwtPrincipal principal) {
        return visibleProjects(principal).stream().map(this::toProjectRecord).toList();
    }

    public List<TaskRecord> tasks(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return taskRepository.findByProjectIdIn(projectIds).stream().sorted(Comparator.comparing(TaskEntity::getUpdatedAt).reversed()).map(this::toTaskRecord).toList();
    }

    public List<DiscussionPost> discussions(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return discussionPostRepository.findByProjectIdInOrderByUpdatedAtDesc(projectIds).stream().map(this::toDiscussionListItem).toList();
    }

    public List<DocumentRecord> documents(JwtPrincipal principal) {
        List<Long> projectIds = visibleProjects(principal).stream().map(ProjectEntity::getId).toList();
        if (projectIds.isEmpty()) return List.of();
        return documentRepository.findByProjectIdIn(projectIds).stream().sorted(Comparator.comparing(DocumentEntity::getUpdatedAt).reversed()).map(this::toDocumentRecord).toList();
    }

    public ProjectDetail projectDetail(Long projectId, JwtPrincipal principal) {
        ProjectEntity project = requireVisible(projectId, principal);
        List<TaskRecord> projectTasks = taskRepository.findByProjectId(projectId).stream().map(this::toTaskRecord).toList();
        List<DiscussionPost> posts = discussionPostRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream().map(this::toDiscussionListItem).toList();
        List<DocumentRecord> docs = documentRepository.findByProjectId(projectId).stream().map(this::toDocumentRecord).toList();
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId).stream().map(pm -> new ProjectMember(pm.getUser().getId(), pm.getUser().getName(), pm.getUser().getEmail(), pm.getUser().getRole().name(), pm.getUser().getAvatar())).toList();
        List<String> branches = project.getType() == ProjectType.CODE ? gitService.listBranches(projectId) : List.of();
        List<GitService.CommitView> commits = project.getType() == ProjectType.CODE ? gitService.listCommits(projectId) : List.of();
        return new ProjectDetail(
            toProjectRecord(project),
            new ProjectStats(projectTasks.size(), (int) projectTasks.stream().filter(task -> "DONE".equals(task.status())).count(), posts.size(), docs.size(), gitService.listReleases(projectId).size(), commits.size()),
            projectTasks,
            posts,
            docs,
            members,
            branches,
            commits.stream().map(commit -> new CommitRecord(commit.hash(), commit.message(), commit.authorName(), commit.createdAt(), commit.branch())).toList(),
            gitService.listReleases(projectId).stream().map(release -> new ReleaseRecord(release.getId(), release.getVersion(), release.getTitle(), release.getDescription(), formatter.format(release.getCreatedAt()))).toList(),
            gitService.listMergeRequests(projectId).stream().map(mr -> new MergeRequestRecord(mr.getId(), mr.getTitle(), mr.getSourceBranch(), mr.getTargetBranch(), mr.getStatus().name())).toList()
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
        return new TeamRecord(team.getId(), team.getName(), course.getId(), course.getName(), teamMemberRepository.findByTeamId(team.getId()).size(), leader.getId(), leader.getName());
    }

    @Transactional
    public ProjectRecord createProject(ProjectSaveRequest request, JwtPrincipal principal) {
        TeamEntity team = teamRepository.findById(request.teamId()).orElseThrow(() -> new ApiException("团队不存在"));
        CourseEntity course = courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在"));
        ProjectEntity project = new ProjectEntity();
        project.setTeam(team);
        project.setCourse(course);
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
        return toProjectRecord(project);
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
            notificationService.create(task.getAssignee(), "任务已分配", "你被分配到任务：“" + task.getTitle() + "”", NotificationType.TASK);
        }
        return toTaskRecord(task);
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
        projectMemberRepository.findByProjectId(project.getId()).stream().map(ProjectMemberEntity::getUser).filter(user -> !user.getId().equals(principal.userId())).forEach(user -> notificationService.create(user, "新讨论", "项目“" + project.getName() + "”新增讨论：“" + entity.getTitle() + "”", NotificationType.DISCUSSION));
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
        notificationService.create(post.getAuthor(), "讨论收到回复", "你的讨论“" + post.getTitle() + "”有新的回复", NotificationType.DISCUSSION);
        return discussionDetail(postId, principal);
    }

    public DiscussionDetail discussionDetail(Long postId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        List<DiscussionReply> replies = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(postId).stream().map(reply -> new DiscussionReply(reply.getId(), reply.getAuthor().getName(), reply.getContent(), formatter.format(reply.getCreatedAt()))).toList();
        List<FileAssetRecord> attachments = fileStorageService.list(FileOwnerType.DISCUSSION_POST, postId);
        List<TaskRecord> linkedTasks = discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(link -> toTaskRecord(link.getTask())).toList();
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
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> toTaskRecord(item.getTask())).toList();
    }

    @Transactional
    public List<TaskRecord> unlinkTask(Long postId, Long taskId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        discussionTaskLinkRepository.findByPostIdAndTaskId(postId, taskId).ifPresent(discussionTaskLinkRepository::delete);
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> toTaskRecord(item.getTask())).toList();
    }

    public List<TaskRecord> linkedTasks(Long postId, JwtPrincipal principal) {
        DiscussionPostEntity post = discussionPostRepository.findById(postId).orElseThrow(() -> new ApiException("讨论不存在"));
        requireVisible(post.getProject().getId(), principal);
        return discussionTaskLinkRepository.findByPostIdOrderByCreatedAtDesc(postId).stream().map(item -> toTaskRecord(item.getTask())).toList();
    }

    public TeacherOverview teacherOverview(JwtPrincipal principal) {
        List<ProjectEntity> projects = visibleProjects(principal);
        List<ContributionRow> rows = projects.stream().flatMap(project -> projectMemberRepository.findByProjectId(project.getId()).stream().map(member -> {
            int tasksDone = (int) taskRepository.findByProjectId(project.getId()).stream().filter(task -> task.getAssignee() != null && task.getAssignee().getId().equals(member.getUser().getId()) && task.getStatus() == TaskStatus.DONE).count();
            int commits = project.getType() == ProjectType.CODE ? (int) gitService.listCommits(project.getId()).stream().filter(item -> item.authorName().equals(member.getUser().getName())).count() : 0;
            int engagement = Math.min(100, 40 + tasksDone * 12 + commits * 6);
            return new ContributionRow(member.getUser().getName(), project.getName(), tasksDone, commits, engagement);
        })).toList();
        int averageProgress = projects.isEmpty() ? 0 : (int) projects.stream().mapToInt(ProjectEntity::getProgress).average().orElse(0);
        return new TeacherOverview(projects.size(), rows.size(), feedbacks(principal).size(), averageProgress, projects.stream().map(this::toProjectRecord).toList(), rows);
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
        projectMemberRepository.findByProjectId(project.getId()).stream().map(ProjectMemberEntity::getUser).forEach(user -> notificationService.create(user, "教师反馈已更新", "项目“" + project.getName() + "”收到新的评分反馈", NotificationType.SYSTEM));
        return new TeacherFeedbackRecord(entity.getId(), project.getId(), project.getName(), entity.getScore(), entity.getContent(), entity.getTeacher().getName(), formatter.format(entity.getCreatedAt()));
    }

    public List<AssignmentRecord> assignments(JwtPrincipal principal) {
        return assignmentRepository.findByProjectCourseTeacherId(principal.userId()).stream().map(item -> new AssignmentRecord(item.getId(), item.getProject().getId(), item.getProject().getName(), item.getTitle(), item.getSummary(), item.getSubmissionUrl(), formatter.format(item.getCreatedAt()))).toList();
    }

    public ProjectEntity requireVisible(Long projectId, JwtPrincipal principal) {
        return projectAccessService.requireVisible(projectId, principal);
    }

    public List<ProjectEntity> visibleProjects(JwtPrincipal principal) {
        return projectAccessService.visibleProjects(principal);
    }

    public ProjectRecord toProjectRecord(ProjectEntity project) {
        return new ProjectRecord(project.getId(), project.getName(), project.getDescription(), project.getType().name(), project.getStatus().name(), project.getProgress(), project.getCourse() != null ? project.getCourse().getName() : "", project.getTeam() != null ? project.getTeam().getName() : "", project.getDueDate() != null ? project.getDueDate().toString() : null, projectMemberRepository.findByProjectId(project.getId()).stream().map(item -> item.getUser().getAvatar()).toList());
    }

    @Transactional
    public void addProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        requireVisible(projectId, principal); // must at least see the project
        boolean isTeacher = principal.role() == UserRole.TEACHER;
        boolean isOwner = projectMemberRepository.findByProjectIdAndUserId(projectId, principal.userId()).map(ProjectMemberEntity::isOwnerFlag).orElse(false);
        if (!isTeacher && !isOwner) throw new ApiException("无权管理成员");

        if (projectMemberRepository.findByProjectIdAndUserId(projectId, userId).isPresent()) return;
        UserEntity user = authService.getUser(userId);

        ProjectMemberEntity pm = new ProjectMemberEntity();
        pm.setProject(project);
        pm.setUser(user);
        pm.setOwnerFlag(false);
        projectMemberRepository.save(pm);

        // ensure user is in team as well
        if (project.getTeam() != null) {
            boolean exists = teamMemberRepository.findByTeamId(project.getTeam().getId()).stream().anyMatch(tm -> tm.getUser().getId().equals(userId));
            if (!exists) {
                TeamMemberEntity tm = new TeamMemberEntity();
                tm.setTeam(project.getTeam());
                tm.setUser(user);
                teamMemberRepository.save(tm);
            }
        }
        notificationService.create(user, "已加入项目", "你已被邀请加入项目：“" + project.getName() + "”", NotificationType.SYSTEM);
    }

    @Transactional
    public void removeProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        requireVisible(projectId, principal);
        boolean isTeacher = principal.role() == UserRole.TEACHER;
        boolean isOwner = projectMemberRepository.findByProjectIdAndUserId(projectId, principal.userId()).map(ProjectMemberEntity::isOwnerFlag).orElse(false);
        if (!isTeacher && !isOwner) throw new ApiException("无权管理成员");

        if (principal.userId().equals(userId)) throw new ApiException("不能移除自己");

        ProjectMemberEntity target = projectMemberRepository.findByProjectIdAndUserId(projectId, userId).orElseThrow(() -> new ApiException("成员不存在"));
        if (target.isOwnerFlag()) {
            long owners = projectMemberRepository.findByProjectId(projectId).stream().filter(ProjectMemberEntity::isOwnerFlag).count();
            if (owners <= 1) throw new ApiException("不能移除唯一负责人");
        }
        projectMemberRepository.delete(target);
    }

    public TaskRecord toTaskRecord(TaskEntity task) {
        return new TaskRecord(task.getId(), task.getProject().getId(), task.getProject().getName(), task.getTitle(), task.getDescription(), task.getStatus().name(), task.getAssignee() != null ? task.getAssignee().getName() : "未分配", task.getDueDate() != null ? task.getDueDate().toString() : null, task.getPriority().name());
    }

    public DiscussionPost toDiscussionListItem(DiscussionPostEntity entity) {
        int replies = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(entity.getId()).size();
        int linked = (int) discussionTaskLinkRepository.countByPostId(entity.getId());
        return new DiscussionPost(entity.getId(), entity.getProject().getId(), entity.getProject().getName(), entity.getTitle(), entity.getContent(), entity.getAuthor().getName(), replies, formatter.format(entity.getCreatedAt()), entity.getCategory().name(), entity.getStatus().name(), linked);
    }

    public DocumentRecord toDocumentRecord(DocumentEntity entity) {
        List<String> collaborators = projectMemberRepository.findByProjectId(entity.getProject().getId()).stream().map(item -> item.getUser().getName()).toList();
        return new DocumentRecord(entity.getId(), entity.getProject().getId(), entity.getProject().getName(), entity.getTitle(), entity.getExcerpt(), formatter.format(entity.getUpdatedAt()), collaborators, entity.getCollabKey(), entity.getCurrentContent());
    }

    @Transactional
    public void refreshProjectProgress(Long projectId) {
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow();
        List<TaskEntity> tasks = taskRepository.findByProjectId(projectId);
        int progress = tasks.isEmpty() ? 0 : (int) Math.round(tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count() * 100.0 / tasks.size());
        project.setProgress(progress);
        projectRepository.save(project);
    }
}
