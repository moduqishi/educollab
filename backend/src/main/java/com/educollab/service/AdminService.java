package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AdminDtos.*;
import com.educollab.dto.WorkspaceDtos;
import com.educollab.dto.WorkspaceDtos.ClassMemberRecord;
import com.educollab.dto.WorkspaceDtos.ClassRecord;
import com.educollab.dto.WorkspaceDtos.ProjectActivityEventRecord;
import com.educollab.dto.WorkspaceDtos.ProjectDetail;
import com.educollab.dto.WorkspaceDtos.ProjectRecord;
import com.educollab.dto.WorkspaceDtos.TeamDetailRecord;
import com.educollab.dto.WorkspaceDtos.TeamRecord;
import com.educollab.model.*;
import com.educollab.repo.*;
import com.educollab.service.workspace.ProjectProgressService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.lang.management.ManagementFactory;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.StandardCopyOption;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.sql.DataSource;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import static com.educollab.model.UserRole.ADMIN;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final ProjectMilestoneRepository projectMilestoneRepository;
    private final ProjectActivityEventRepository projectActivityEventRepository;
    private final NotificationRepository notificationRepository;
    private final DocumentRepository documentRepository;
    private final FileAssetRepository fileAssetRepository;
    private final GitRepositoryRepository gitRepositoryRepository;
    private final AdminAuditEventRepository adminAuditEventRepository;
    private final AdminImportJobRepository adminImportJobRepository;
    private final AiConfigurationRepository aiConfigurationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final ClassroomService classroomService;
    private final WorkspaceService workspaceService;
    private final ProjectProgressService projectProgressService;
    private final AdminAuditService adminAuditService;
    private final StorageService storageService;
    private final StoragePathService storagePathService;
    private final ObjectMapper objectMapper;
    private final DataSource dataSource;
    private final Path uploadRoot;
    private final Path repoRoot;
    private final Path logRoot;
    private final Path systemUsageRoot;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public AdminService(
            UserRepository userRepository,
            CourseRepository courseRepository,
            ClassMemberRepository classMemberRepository,
            ProjectRepository projectRepository,
            TaskRepository taskRepository,
            DiscussionPostRepository discussionPostRepository,
            DiscussionReplyRepository discussionReplyRepository,
            AssignmentRepository assignmentRepository,
            AssignmentSubmissionRepository submissionRepository,
            ProjectMemberRepository projectMemberRepository,
            TeamMemberRepository teamMemberRepository,
            TeamRepository teamRepository,
            ProjectMilestoneRepository projectMilestoneRepository,
            ProjectActivityEventRepository projectActivityEventRepository,
            NotificationRepository notificationRepository,
            DocumentRepository documentRepository,
            FileAssetRepository fileAssetRepository,
            GitRepositoryRepository gitRepositoryRepository,
            AdminAuditEventRepository adminAuditEventRepository,
            AdminImportJobRepository adminImportJobRepository,
            AiConfigurationRepository aiConfigurationRepository,
            PasswordEncoder passwordEncoder,
            AuthService authService,
            NotificationService notificationService,
            ClassroomService classroomService,
            WorkspaceService workspaceService,
            ProjectProgressService projectProgressService,
            AdminAuditService adminAuditService,
            StorageService storageService,
            StoragePathService storagePathService,
            ObjectMapper objectMapper,
            DataSource dataSource,
            @Value("${app.file-storage.root:./data/uploads}") String uploadRoot,
            @Value("${app.git.root:./data/repos}") String repoRoot,
            @Value("${app.logs.root:./data/logs}") String logRoot,
            @Value("${app.workspace.root:}") String workspaceRoot
    ) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.classMemberRepository = classMemberRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.teamRepository = teamRepository;
        this.projectMilestoneRepository = projectMilestoneRepository;
        this.projectActivityEventRepository = projectActivityEventRepository;
        this.notificationRepository = notificationRepository;
        this.documentRepository = documentRepository;
        this.fileAssetRepository = fileAssetRepository;
        this.gitRepositoryRepository = gitRepositoryRepository;
        this.adminAuditEventRepository = adminAuditEventRepository;
        this.adminImportJobRepository = adminImportJobRepository;
        this.aiConfigurationRepository = aiConfigurationRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.notificationService = notificationService;
        this.classroomService = classroomService;
        this.workspaceService = workspaceService;
        this.projectProgressService = projectProgressService;
        this.adminAuditService = adminAuditService;
        this.storageService = storageService;
        this.storagePathService = storagePathService;
        this.objectMapper = objectMapper;
        this.dataSource = dataSource;
        this.uploadRoot = Path.of(uploadRoot);
        this.repoRoot = Path.of(repoRoot);
        this.logRoot = Path.of(logRoot);
        this.systemUsageRoot = resolveSystemUsageRoot(workspaceRoot);
    }

    private void requireAdmin(JwtPrincipal principal) {
        if (principal.role() != ADMIN) {
            throw new ApiException("需要管理员权限");
        }
    }

    public AdminStats getStats(JwtPrincipal principal) {
        requireAdmin(principal);
        List<UserEntity> users = userRepository.findAll();
        long students = users.stream().filter(u -> u.getRole() == UserRole.STUDENT).count();
        long teachers = users.stream().filter(u -> u.getRole() == UserRole.TEACHER).count();
        return new AdminStats(
                users.size(),
                students,
                teachers,
                courseRepository.count(),
                projectRepository.count(),
                taskRepository.count(),
                discussionPostRepository.count(),
                assignmentRepository.count()
        );
    }

    public AdminOverviewRecord overview(JwtPrincipal principal) {
        requireAdmin(principal);
        String checkedAt = format(LocalDateTime.now());
        AdminStats stats = getStats(principal);
        long activeProjects = projectRepository.findAll().stream().filter(project -> project.getStatus() == ProjectStatus.ACTIVE).count();
        long openTasks = taskRepository.findAll().stream().filter(task -> task.getStatus() != TaskStatus.DONE).count();
        long pendingReviews = submissionRepository.findAll().stream()
            .filter(item -> item.getStatus() == AssignmentSubmissionStatus.SUBMITTED || item.getStatus() == AssignmentSubmissionStatus.RETURNED)
            .count();
        long totalTeams = teamRepository.count();

        List<AdminMetricRecord> metrics = List.of(
            new AdminMetricRecord("users", "用户总数", String.valueOf(stats.totalUsers()), "覆盖学生、教师与管理员账号"),
            new AdminMetricRecord("teachers", "教师数", String.valueOf(stats.totalTeachers()), "拥有教师权限的账号数量"),
            new AdminMetricRecord("students", "学生数", String.valueOf(stats.totalStudents()), "拥有学生权限的账号数量"),
            new AdminMetricRecord("courses", "课程数", String.valueOf(stats.totalCourses()), "当前系统中的课程总量"),
            new AdminMetricRecord("teams", "团队数", String.valueOf(totalTeams), "包含课程团队与独立团队"),
            new AdminMetricRecord("projects", "项目数", String.valueOf(stats.totalProjects()), "当前所有项目工作区"));

        List<AdminSystemResourceRecord> resourceMetrics = buildOverviewResourceMetrics();
        List<AdminHealthRecord> healthChecks = runtimeHealthChecks().stream()
            .map(item -> new AdminHealthRecord(item.serviceKey(), item.label(), item.status(), item.detail(), item.checkedAt()))
            .toList();

        long coursesWithoutTeacher = courseRepository.findAll().stream().filter(course -> course.getTeacher() == null).count();
        long teamsWithoutLeader = teamRepository.findAll().stream().filter(team -> team.getLeader() == null).count();
        long projectsWithoutMembers = projectRepository.findAll().stream().filter(project -> projectMemberRepository.findByProjectId(project.getId()).isEmpty()).count();
        List<AdminIssueRecord> pendingItems = new ArrayList<>();
        if (resourceMetrics.stream().anyMatch(item -> "WARN".equals(item.status()) || "DOWN".equals(item.status()))) {
            resourceMetrics.stream()
                .filter(item -> "WARN".equals(item.status()) || "DOWN".equals(item.status()))
                .forEach(item -> pendingItems.add(new AdminIssueRecord(item.key(), item.label() + " 异常", Objects.requireNonNullElse(item.hint(), item.value()), "/app/admin/system", "warn")));
        }
        healthChecks.stream()
            .filter(item -> !"UP".equals(item.status()))
            .forEach(item -> pendingItems.add(new AdminIssueRecord(item.key(), item.label() + " 状态异常", item.detail(), "/app/admin/system", "warn")));
        if (coursesWithoutTeacher > 0) pendingItems.add(new AdminIssueRecord("coursesWithoutTeacher", "存在未分配教师的课程", coursesWithoutTeacher + " 门课程等待教师归属", "/app/admin/courses", "warn"));
        if (teamsWithoutLeader > 0) pendingItems.add(new AdminIssueRecord("teamsWithoutLeader", "存在无队长团队", teamsWithoutLeader + " 支团队缺少队长", "/app/admin/teams", "warn"));
        if (projectsWithoutMembers > 0) pendingItems.add(new AdminIssueRecord("projectsWithoutMembers", "存在无成员项目", projectsWithoutMembers + " 个项目没有成员关系", "/app/admin/projects", "warn"));
        if (pendingReviews > 0) pendingItems.add(new AdminIssueRecord("pendingReviews", "存在待批改作业", pendingReviews + " 份提交待教师处理", "/app/admin/content/assignments", "info"));
        if (openTasks > 0) pendingItems.add(new AdminIssueRecord("openTasks", "存在未完成任务", openTasks + " 条任务仍在进行或待办", "/app/admin/content/tasks", "info"));
        if (pendingItems.isEmpty()) pendingItems.add(new AdminIssueRecord("clear", "当前没有明显异常", "系统资源、服务状态和结构关系均保持正常。", "/app/admin/system", "ok"));

        List<AdminActivityRecord> recentActivities = adminAuditEventRepository.findAll().stream()
            .sorted(Comparator.comparing(AdminAuditEventEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(10)
            .map(this::toActivityRecord)
            .toList();
        if (recentActivities.isEmpty()) {
            recentActivities = userRepository.findAll().stream()
                .sorted(Comparator.comparing(UserEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(6)
                .map(user -> new AdminActivityRecord("新账号加入系统", user.getName() + " · " + user.getEmail(), format(user.getCreatedAt()), "/app/admin/users/" + user.getId()))
                .toList();
        }

        return new AdminOverviewRecord(metrics, resourceMetrics, healthChecks, pendingItems, recentActivities, checkedAt);
    }

    public List<UserSummary> listUsers(JwtPrincipal principal) {
        requireAdmin(principal);
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(UserEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toUserSummary)
                .toList();
    }

    public UserDetailRecord userDetail(JwtPrincipal principal, Long userId) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("用户不存在"));
        List<ClassRecord> courses = classMemberRepository.findByUserId(userId).stream()
            .map(member -> new ClassRecord(
                member.getCourse().getId(),
                member.getCourse().getName(),
                member.getCourse().getClassCode(),
                member.getCourse().getTeacher() != null ? member.getCourse().getTeacher().getName() : null,
                classMemberRepository.findByCourseId(member.getCourse().getId()).size(),
                0))
            .toList();
        List<TeamRecord> teams = teamMemberRepository.findByUserId(userId).stream()
            .map(TeamMemberEntity::getTeam)
            .filter(Objects::nonNull)
            .map(team -> new TeamRecord(
                team.getId(),
                team.getName(),
                team.getCourse() != null ? team.getCourse().getId() : null,
                team.getCourse() != null ? team.getCourse().getName() : null,
                team.getGroupOrder(),
                teamMemberRepository.findByTeamId(team.getId()).size(),
                team.getLeader() != null ? team.getLeader().getId() : null,
                team.getLeader() != null ? team.getLeader().getName() : null,
                team.getInviteCode(),
                team.getGroupTask() != null ? team.getGroupTask().getId() : null,
                team.getSource() != null ? team.getSource().name() : null,
                team.getStatus() != null ? team.getStatus().name() : null,
                team.getGroupTask() != null ? team.getGroupTask().getTitle() : null,
                projectRepository.findByTeamId(team.getId()).map(ProjectEntity::getId).orElse(null),
                projectRepository.findByTeamId(team.getId()).map(ProjectEntity::getName).orElse(null)))
            .toList();
        List<ProjectRecord> projects = projectMemberRepository.findByUserId(userId).stream()
            .map(ProjectMemberEntity::getProject)
            .filter(Objects::nonNull)
            .map(project -> new ProjectRecord(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getType() != null ? project.getType().name() : null,
                project.getStatus() != null ? project.getStatus().name() : null,
                Objects.requireNonNullElse(project.getProgress(), 0),
                project.getCourse() != null ? project.getCourse().getId() : null,
                project.getCourse() != null ? project.getCourse().getName() : null,
                project.getTeam() != null ? project.getTeam().getId() : null,
                project.getTeam() != null ? project.getTeam().getName() : null,
                project.getDueDate() != null ? project.getDueDate().toString() : null,
                format(project.getCreatedAt()),
                List.of()))
            .toList();
        List<UserAssignmentDigest> submissions = submissionRepository.findAll().stream()
            .filter(item -> item.getStudent() != null && Objects.equals(item.getStudent().getId(), userId))
            .sorted(Comparator.comparing(AssignmentSubmissionEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(10)
            .map(item -> new UserAssignmentDigest(
                item.getId(),
                item.getAssignment() != null ? item.getAssignment().getId() : null,
                item.getAssignment() != null ? item.getAssignment().getTitle() : null,
                item.getStatus() != null ? item.getStatus().name() : null,
                item.getScore(),
                format(item.getSubmittedAt())))
            .toList();
        List<ProjectActivityEventRecord> recentActivity = projectActivityEventRepository.findAll().stream()
            .filter(item -> item.getUser() != null && Objects.equals(item.getUser().getId(), userId))
            .sorted(Comparator.comparing(ProjectActivityEventEntity::getOccurredAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(12)
            .map(this::toProjectActivityRecord)
            .toList();
        List<WorkspaceDtos.NotificationItem> notifications = notificationService.list(userId).stream().limit(10).toList();
        List<AdminAuditRecord> audits = auditRecords("USER", userId, 20);
        return new UserDetailRecord(toUserSummary(user), courses, teams, projects, submissions, recentActivity, notifications, audits);
    }

    @Transactional
    public UserSummary updateUserRole(JwtPrincipal principal, UpdateUserRoleRequest request) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ApiException("用户不存在"));
        user.setRole(request.role());
        user = userRepository.save(user);
        adminAuditService.record(principal, "USER", user.getId(), user.getName(), "UPDATE_ROLE", "角色修改为 " + request.role().name());
        return toUserSummary(user);
    }

    @Transactional
    public UserSummary updateUser(JwtPrincipal principal, Long userId, UpdateUserRequest request) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("用户不存在"));
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            String email = request.email().trim().toLowerCase(Locale.ROOT);
            userRepository.findByEmailIgnoreCase(email)
                .filter(existing -> !Objects.equals(existing.getId(), userId))
                .ifPresent(existing -> { throw new ApiException("该邮箱已被其他账号使用"); });
            user.setEmail(email);
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.active() != null) {
            user.setActive(request.active());
        }
        userRepository.save(user);
        adminAuditService.record(principal, "USER", user.getId(), user.getName(), "UPDATE_USER", "更新账号信息");
        return toUserSummary(user);
    }

    @Transactional
    public UserSummary resetUserPassword(JwtPrincipal principal, Long userId, ResetPasswordRequest request) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("用户不存在"));
        String rawPassword = request != null && request.newPassword() != null && !request.newPassword().isBlank()
            ? request.newPassword().trim()
            : "Password123!";
        if (rawPassword.length() < 8) {
            throw new ApiException("密码至少需要 8 位");
        }
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
        adminAuditService.record(principal, "USER", user.getId(), user.getName(), "RESET_PASSWORD", "管理员重置密码");
        return toUserSummary(user);
    }

    @Transactional
    public void deleteUser(JwtPrincipal principal, Long userId) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("用户不存在"));
        adminAuditService.record(principal, "USER", user.getId(), user.getName(), "DELETE_USER", "删除账号 " + user.getEmail());
        userRepository.delete(user);
    }

    @Transactional
    public CourseSummary createCourse(JwtPrincipal principal, CreateCourseRequest request) {
        requireAdmin(principal);
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new ApiException("课程名称不能为空");
        }
        CourseEntity course = new CourseEntity();
        course.setName(request.name().trim());
        String classCode = request.classCode() == null || request.classCode().isBlank()
            ? generateCourseCode(request.name())
            : request.classCode().trim().toUpperCase(Locale.ROOT);
        courseRepository.findByClassCode(classCode).ifPresent(existing -> {
            throw new ApiException("班级码已存在");
        });
        course.setClassCode(classCode);
        if (request.teacherId() != null) {
            UserEntity teacher = userRepository.findById(request.teacherId())
                .orElseThrow(() -> new ApiException("教师不存在"));
            course.setTeacher(teacher);
        }
        course = courseRepository.save(course);
        if (course.getTeacher() != null) {
            ensureClassMembership(course, course.getTeacher(), ClassMemberRole.TEACHER, "ADMIN");
        }
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "CREATE_COURSE", "创建课程");
        return toCourseSummary(course);
    }

    public List<CourseSummary> listCourses(JwtPrincipal principal) {
        requireAdmin(principal);
        return courseRepository.findAll().stream()
                .sorted(Comparator.comparing(CourseEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toCourseSummary)
                .toList();
    }

    public CourseDetailRecord courseDetail(JwtPrincipal principal, Long courseId) {
        requireAdmin(principal);
        WorkspaceDtos.ClassDetail classDetail = classroomService.classDetail(courseId, principal);
        List<TeamRecord> teams = classroomService.teams(courseId, principal);
        List<WorkspaceDtos.ClassProjectRecord> projects = classroomService.classProjects(courseId, principal);
        List<TeacherOption> teacherOptions = userRepository.findAll().stream()
            .filter(user -> user.getRole() == UserRole.TEACHER || user.getRole() == UserRole.ADMIN)
            .sorted(Comparator.comparing(UserEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(user -> new TeacherOption(user.getId(), user.getName(), user.getEmail()))
            .toList();
        return new CourseDetailRecord(
            classDetail.classInfo(),
            classDetail.members(),
            teams,
            projects,
            classDetail.assignments(),
            teacherOptions,
            importJobs(courseId, principal),
            auditRecords("COURSE", courseId, 30));
    }

    @Transactional
    public CourseDetailRecord addCourseMember(JwtPrincipal principal, Long courseId, CourseMemberSaveRequest request) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException("课程不存在"));
        UserEntity user = userRepository.findById(request.userId())
            .orElseThrow(() -> new ApiException("用户不存在"));
        ClassMemberRole role = request.role() == null || request.role().isBlank()
            ? ClassMemberRole.STUDENT
            : ClassMemberRole.valueOf(request.role().trim().toUpperCase(Locale.ROOT));
        ClassMemberEntity membership = classMemberRepository.findByCourseIdAndUserId(courseId, user.getId()).orElse(null);
        if (membership == null) {
            membership = new ClassMemberEntity();
            membership.setCourse(course);
            membership.setUser(user);
        }
        membership.setRole(role);
        membership.setJoinedVia("ADMIN");
        classMemberRepository.save(membership);
        if (role == ClassMemberRole.TEACHER) {
            course.setTeacher(user);
            courseRepository.save(course);
        }
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "ADD_COURSE_MEMBER", "添加成员 " + user.getName());
        return courseDetail(principal, courseId);
    }

    @Transactional
    public CourseDetailRecord removeCourseMember(JwtPrincipal principal, Long courseId, Long userId) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException("课程不存在"));
        ClassMemberEntity membership = classMemberRepository.findByCourseIdAndUserId(courseId, userId)
            .orElseThrow(() -> new ApiException("该成员不在课程中"));
        classMemberRepository.delete(membership);
        if (course.getTeacher() != null && Objects.equals(course.getTeacher().getId(), userId)) {
            course.setTeacher(null);
            courseRepository.save(course);
        }
        for (TeamEntity team : teamRepository.findByCourseIdOrderByCreatedAtAsc(courseId)) {
            teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId).ifPresent(teamMemberRepository::delete);
            if (team.getLeader() != null && Objects.equals(team.getLeader().getId(), userId)) {
                team.setLeader(teamMemberRepository.findByTeamId(team.getId()).stream()
                    .map(TeamMemberEntity::getUser)
                    .filter(user -> !Objects.equals(user.getId(), userId))
                    .findFirst()
                    .orElse(null));
                teamRepository.save(team);
            }
        }
        projectRepository.findByCourseIdOrderByCreatedAtAsc(courseId).forEach(project ->
            projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId).ifPresent(projectMemberRepository::delete));
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "REMOVE_COURSE_MEMBER", "移除成员 " + membership.getUser().getName());
        return courseDetail(principal, courseId);
    }

    @Transactional
    public CourseSummary updateCourse(JwtPrincipal principal, UpdateCourseRequest request) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ApiException("课程不存在"));
        if (request.name() != null && !request.name().isBlank()) {
            course.setName(request.name().trim());
        }
        if (request.classCode() != null && !request.classCode().isBlank()) {
            course.setClassCode(request.classCode().trim().toUpperCase(Locale.ROOT));
        }
        if (request.teacherId() != null) {
            UserEntity teacher = userRepository.findById(request.teacherId())
                .orElseThrow(() -> new ApiException("教师不存在"));
            course.setTeacher(teacher);
            ensureClassMembership(course, teacher, ClassMemberRole.TEACHER, "ADMIN");
        }
        course = courseRepository.save(course);
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "UPDATE_COURSE", "更新课程信息");
        return toCourseSummary(course);
    }

    @Transactional
    public void deleteCourse(JwtPrincipal principal, Long courseId) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException("课程不存在"));
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "DELETE_COURSE", "删除课程");
        courseRepository.delete(course);
    }

    public AdminImportPreviewRecord previewCourseImport(JwtPrincipal principal, Long courseId, MultipartFile file) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException("课程不存在"));
        ParsedImport parsed = parseImportFile(file);
        List<AdminImportPreviewRowRecord> rows = buildImportPreviewRows(course, parsed.rows());
        int ready = (int) rows.stream().filter(row -> !"SKIP".equals(row.action())).count();
        int skipped = (int) rows.stream().filter(row -> "SKIP".equals(row.action())).count();
        int createUsers = (int) rows.stream().filter(row -> "CREATE_USER".equals(row.action())).count();
        return new AdminImportPreviewRecord(rows.size(), ready, skipped, createUsers, rows);
    }

    @Transactional
    public AdminImportResultRecord executeCourseImport(JwtPrincipal principal, Long courseId, MultipartFile file) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ApiException("课程不存在"));
        ParsedImport parsed = parseImportFile(file);
        List<AdminImportPreviewRowRecord> rows = buildImportPreviewRows(course, parsed.rows());
        List<String> warnings = new ArrayList<>();
        int imported = 0;
        int skipped = 0;
        int createdUsers = 0;
        for (AdminImportPreviewRowRecord row : rows) {
            if ("SKIP".equals(row.action())) {
                skipped++;
                warnings.add("第 " + row.rowNumber() + " 行：" + row.message());
                continue;
            }
            UserEntity user = userRepository.findByEmailIgnoreCase(row.email().trim().toLowerCase(Locale.ROOT)).orElse(null);
            if (user == null) {
                user = new UserEntity();
                user.setName(row.name().trim());
                user.setEmail(row.email().trim().toLowerCase(Locale.ROOT));
                user.setPasswordHash(passwordEncoder.encode("Password123!"));
                user.setRole(UserRole.STUDENT);
                user.setActive(true);
                userRepository.save(user);
                createdUsers++;
            }
            ensureClassMembership(course, user, ClassMemberRole.STUDENT, "ADMIN_IMPORT");
            imported++;
            if (row.groupName() != null && !row.groupName().isBlank()) {
                ensureTeamMembership(course, row.groupName().trim(), user);
            }
        }
        AdminImportJobEntity job = new AdminImportJobEntity();
        job.setCourse(course);
        job.setCreatedBy(authService.getUser(principal.userId()));
        job.setJobType("COURSE_STUDENTS");
        job.setFileName(file != null ? file.getOriginalFilename() : "unknown");
        job.setStatus("COMPLETED");
        job.setTotalRows(rows.size());
        job.setImportedRows(imported);
        job.setSkippedRows(skipped);
        job.setCreatedUsersCount(createdUsers);
        try {
            job.setReportJson(objectMapper.writeValueAsString(Map.of("warnings", warnings, "rows", rows)));
        } catch (JsonProcessingException e) {
            throw new ApiException("导入结果写入失败");
        }
        adminImportJobRepository.save(job);
        adminAuditService.record(principal, "COURSE", course.getId(), course.getName(), "IMPORT_STUDENTS", "导入学生 " + imported + " 人，创建账号 " + createdUsers + " 个");
        return new AdminImportResultRecord(toImportJobRecord(job), imported, skipped, createdUsers, warnings);
    }

    public List<AdminImportJobRecord> importJobs(Long courseId, JwtPrincipal principal) {
        requireAdmin(principal);
        return adminImportJobRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream().map(this::toImportJobRecord).toList();
    }

    public List<ProjectSummary> listProjects(JwtPrincipal principal) {
        requireAdmin(principal);
        return projectRepository.findAll().stream()
                .sorted(Comparator.comparing(ProjectEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toProjectSummary)
                .toList();
    }

    public ProjectDetailRecord projectDetail(JwtPrincipal principal, Long projectId) {
        requireAdmin(principal);
        ProjectDetail detail = workspaceService.projectDetail(projectId, principal);
        List<CourseSummary> courseOptions = courseRepository.findAll().stream()
            .sorted(Comparator.comparing(CourseEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(this::toCourseSummary)
            .toList();
        List<TeamSummary> teamOptions = teamRepository.findAll().stream()
            .sorted(Comparator.comparing(TeamEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toTeamSummary)
            .toList();
        List<UserSummary> memberCandidates = userRepository.findAll().stream()
            .filter(user -> user.getRole() != UserRole.ADMIN)
            .sorted(Comparator.comparing(UserEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(this::toUserSummary)
            .toList();
        return new ProjectDetailRecord(detail, courseOptions, teamOptions, memberCandidates, auditRecords("PROJECT", projectId, 30));
    }

    @Transactional
    public ProjectSummary updateProjectStatus(JwtPrincipal principal, UpdateProjectStatusRequest request) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ApiException("项目不存在"));
        ProjectStatus newStatus = ProjectStatus.valueOf(request.status());
        project.setStatus(newStatus);
        project = projectRepository.save(project);
        adminAuditService.record(principal, "PROJECT", project.getId(), project.getName(), "UPDATE_PROJECT_STATUS", "状态修改为 " + newStatus.name());
        return toProjectSummary(project);
    }

    @Transactional
    public ProjectSummary updateProject(JwtPrincipal principal, UpdateProjectRequest request) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(request.projectId())
            .orElseThrow(() -> new ApiException("项目不存在"));
        if (request.name() != null && !request.name().isBlank()) {
            project.setName(request.name().trim());
        }
        if (request.description() != null) {
            project.setDescription(request.description().trim());
        }
        if (request.status() != null && !request.status().isBlank()) {
            project.setStatus(ProjectStatus.valueOf(request.status().trim().toUpperCase(Locale.ROOT)));
        }
        if (request.courseId() != null) {
            CourseEntity course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ApiException("课程不存在"));
            project.setCourse(course);
        }
        if (request.teamId() != null) {
            TeamEntity team = teamRepository.findById(request.teamId())
                .orElseThrow(() -> new ApiException("团队不存在"));
            project.setTeam(team);
            if (project.getCourse() == null && team.getCourse() != null) {
                project.setCourse(team.getCourse());
            }
        }
        if (request.dueDate() != null) {
            project.setDueDate(request.dueDate().isBlank() ? null : LocalDate.parse(request.dueDate()));
        }
        project = projectRepository.save(project);
        adminAuditService.record(principal, "PROJECT", project.getId(), project.getName(), "UPDATE_PROJECT", "更新项目基础信息");
        return toProjectSummary(project);
    }

    @Transactional
    public ProjectDetailRecord addProjectMember(JwtPrincipal principal, Long projectId, ProjectMemberSaveRequest request) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ApiException("项目不存在"));
        UserEntity user = userRepository.findById(request.userId())
            .orElseThrow(() -> new ApiException("用户不存在"));
        if (projectMemberRepository.findByProjectIdAndUserId(projectId, user.getId()).isEmpty()) {
            ProjectMemberEntity entity = new ProjectMemberEntity();
            entity.setProject(project);
            entity.setUser(user);
            entity.setOwnerFlag(Boolean.TRUE.equals(request.ownerFlag()));
            projectMemberRepository.save(entity);
        }
        if (project.getCourse() != null) {
            ensureClassMembership(project.getCourse(), user, ClassMemberRole.STUDENT, "ADMIN_PROJECT");
        }
        adminAuditService.record(principal, "PROJECT", project.getId(), project.getName(), "ADD_PROJECT_MEMBER", "添加项目成员 " + user.getName());
        return projectDetail(principal, projectId);
    }

    @Transactional
    public ProjectDetailRecord removeProjectMember(JwtPrincipal principal, Long projectId, Long userId) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ApiException("项目不存在"));
        ProjectMemberEntity membership = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
            .orElseThrow(() -> new ApiException("该成员不在项目中"));
        projectMemberRepository.delete(membership);
        adminAuditService.record(principal, "PROJECT", project.getId(), project.getName(), "REMOVE_PROJECT_MEMBER", "移除项目成员 " + membership.getUser().getName());
        return projectDetail(principal, projectId);
    }

    @Transactional
    public void deleteProject(JwtPrincipal principal, Long projectId) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ApiException("项目不存在"));
        adminAuditService.record(principal, "PROJECT", project.getId(), project.getName(), "DELETE_PROJECT", "删除项目");
        projectRepository.delete(project);
    }

    public List<TeamSummary> listTeams(JwtPrincipal principal) {
        requireAdmin(principal);
        return teamRepository.findAll().stream()
            .sorted(Comparator.comparing(TeamEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toTeamSummary)
            .toList();
    }

    public TeamDetailAdminRecord teamDetail(JwtPrincipal principal, Long teamId) {
        requireAdmin(principal);
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        TeamDetailRecord detail = workspaceService.teamDetail(teamId, principal);
        List<UserSummary> memberCandidates = (team.getCourse() != null
            ? classMemberRepository.findByCourseId(team.getCourse().getId()).stream().map(ClassMemberEntity::getUser).toList()
            : userRepository.findAll()).stream()
            .filter(user -> teamMemberRepository.findByTeamIdAndUserId(teamId, user.getId()).isEmpty())
            .sorted(Comparator.comparing(UserEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(this::toUserSummary)
            .toList();
        return new TeamDetailAdminRecord(detail, memberCandidates, auditRecords("TEAM", teamId, 30));
    }

    @Transactional
    public TeamSummary createTeam(JwtPrincipal principal, CreateTeamRequest request) {
        requireAdmin(principal);
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new ApiException("团队名称不能为空");
        }
        TeamEntity team = new TeamEntity();
        team.setName(request.name().trim());
        if (request.courseId() != null) {
            team.setCourse(courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在")));
            team.setSource(TeamSource.COURSE);
            team.setGroupOrder(request.groupOrder() != null ? request.groupOrder() : nextGroupOrder(request.courseId()));
        } else {
            team.setSource(TeamSource.STANDALONE);
            team.setGroupOrder(request.groupOrder());
        }
        if (request.status() != null && !request.status().isBlank()) {
            team.setStatus(TeamStatus.valueOf(request.status().trim().toUpperCase(Locale.ROOT)));
        }
        if (request.leaderUserId() != null) {
            team.setLeader(userRepository.findById(request.leaderUserId()).orElseThrow(() -> new ApiException("队长不存在")));
        }
        team = teamRepository.save(team);
        LinkedHashSet<Long> memberIds = new LinkedHashSet<>();
        if (team.getLeader() != null) {
            memberIds.add(team.getLeader().getId());
        }
        if (request.memberIds() != null) {
            memberIds.addAll(request.memberIds());
        }
        for (Long memberId : memberIds) {
            addTeamMemberInternal(team, memberId);
        }
        adminAuditService.record(principal, "TEAM", team.getId(), team.getName(), "CREATE_TEAM", "创建团队");
        return toTeamSummary(team);
    }

    @Transactional
    public TeamSummary updateTeam(JwtPrincipal principal, Long teamId, UpdateTeamRequest request) {
        requireAdmin(principal);
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        if (request.name() != null && !request.name().isBlank()) {
            team.setName(request.name().trim());
        }
        if (request.courseId() != null) {
            CourseEntity course = courseRepository.findById(request.courseId()).orElseThrow(() -> new ApiException("课程不存在"));
            team.setCourse(course);
            team.setSource(TeamSource.COURSE);
        }
        if (request.status() != null && !request.status().isBlank()) {
            team.setStatus(TeamStatus.valueOf(request.status().trim().toUpperCase(Locale.ROOT)));
        }
        if (request.groupOrder() != null) {
            team.setGroupOrder(request.groupOrder());
        }
        if (request.leaderUserId() != null) {
            UserEntity leader = userRepository.findById(request.leaderUserId()).orElseThrow(() -> new ApiException("队长不存在"));
            team.setLeader(leader);
            addTeamMemberInternal(team, leader.getId());
        }
        team = teamRepository.save(team);
        adminAuditService.record(principal, "TEAM", team.getId(), team.getName(), "UPDATE_TEAM", "更新团队信息");
        return toTeamSummary(team);
    }

    @Transactional
    public TeamDetailAdminRecord addTeamMember(JwtPrincipal principal, Long teamId, TeamMemberAddRequest request) {
        requireAdmin(principal);
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        addTeamMemberInternal(team, request.userId());
        adminAuditService.record(principal, "TEAM", team.getId(), team.getName(), "ADD_TEAM_MEMBER", "添加团队成员");
        return teamDetail(principal, teamId);
    }

    @Transactional
    public TeamDetailAdminRecord removeTeamMember(JwtPrincipal principal, Long teamId, Long userId) {
        requireAdmin(principal);
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        if (team.getLeader() != null && Objects.equals(team.getLeader().getId(), userId)) {
            throw new ApiException("请先转移队长，再移除当前队长");
        }
        TeamMemberEntity membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            .orElseThrow(() -> new ApiException("该成员不在团队中"));
        teamMemberRepository.delete(membership);
        projectRepository.findByTeamId(teamId)
            .flatMap(project -> projectMemberRepository.findByProjectIdAndUserId(project.getId(), userId))
            .ifPresent(projectMemberRepository::delete);
        adminAuditService.record(principal, "TEAM", team.getId(), team.getName(), "REMOVE_TEAM_MEMBER", "移除团队成员 " + membership.getUser().getName());
        return teamDetail(principal, teamId);
    }

    @Transactional
    public TeamSummary transferTeamLeader(JwtPrincipal principal, Long teamId, TeamTransferLeaderRequest request) {
        requireAdmin(principal);
        TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
        TeamMemberEntity target = teamMemberRepository.findByTeamIdAndUserId(teamId, request.leaderUserId())
            .orElseThrow(() -> new ApiException("目标成员不在团队中"));
        team.setLeader(target.getUser());
        team = teamRepository.save(team);
        adminAuditService.record(principal, "TEAM", team.getId(), team.getName(), "TRANSFER_TEAM_LEADER", "转移队长给 " + target.getUser().getName());
        return toTeamSummary(team);
    }

    public List<TaskSummary> listTasks(JwtPrincipal principal) {
        requireAdmin(principal);
        return taskRepository.findAll().stream()
                .sorted(Comparator.comparing(TaskEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(t -> new TaskSummary(
                        t.getId(),
                        t.getTitle(),
                        t.getDescription(),
                        t.getStatus() != null ? t.getStatus().name() : null,
                        t.getPriority() != null ? t.getPriority().name() : null,
                        t.getProject() != null && t.getProject().getCourse() != null ? t.getProject().getCourse().getId() : null,
                        t.getProject() != null && t.getProject().getCourse() != null ? t.getProject().getCourse().getName() : null,
                        t.getProject() != null && t.getProject().getTeam() != null ? t.getProject().getTeam().getId() : null,
                        t.getProject() != null && t.getProject().getTeam() != null ? t.getProject().getTeam().getName() : null,
                        t.getProject() != null ? t.getProject().getId() : null,
                        t.getProject() != null ? t.getProject().getName() : null,
                        t.getAssignee() != null ? t.getAssignee().getName() : null,
                        t.getDueDate() != null ? t.getDueDate().toString() : null
                ))
                .toList();
    }

    @Transactional
    public TaskSummary saveTask(JwtPrincipal principal, TaskSaveRequest request) {
        requireAdmin(principal);
        TaskEntity task = taskRepository.findById(request.taskId())
                .orElseThrow(() -> new ApiException("任务不存在"));

        if (request.title() != null && !request.title().isBlank()) {
            task.setTitle(request.title());
        }
        if (request.description() != null) {
            task.setDescription(request.description());
        }
        if (request.status() != null) {
            task.setStatus(TaskStatus.valueOf(request.status()));
        }
        if (request.priority() != null) {
            task.setPriority(TaskPriority.valueOf(request.priority()));
        }
        if (request.assigneeId() != null) {
            UserEntity assignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ApiException("用户不存在"));
            task.setAssignee(assignee);
        }
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            task.setDueDate(LocalDate.parse(request.dueDate()));
        }

        task = taskRepository.save(task);
        if (task.getProject() != null) {
            projectProgressService.recomputeProject(task.getProject().getId());
            adminAuditService.record(principal, "PROJECT", task.getProject().getId(), task.getProject().getName(), "UPDATE_TASK", "更新任务「" + task.getTitle() + "」");
        }
        return new TaskSummary(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus() != null ? task.getStatus().name() : null,
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getProject() != null && task.getProject().getCourse() != null ? task.getProject().getCourse().getId() : null,
                task.getProject() != null && task.getProject().getCourse() != null ? task.getProject().getCourse().getName() : null,
                task.getProject() != null && task.getProject().getTeam() != null ? task.getProject().getTeam().getId() : null,
                task.getProject() != null && task.getProject().getTeam() != null ? task.getProject().getTeam().getName() : null,
                task.getProject() != null ? task.getProject().getId() : null,
                task.getProject() != null ? task.getProject().getName() : null,
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                task.getDueDate() != null ? task.getDueDate().toString() : null
        );
    }

    @Transactional
    public void deleteTask(JwtPrincipal principal, Long taskId) {
        requireAdmin(principal);
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ApiException("任务不存在"));
        Long projectId = task.getProject() != null ? task.getProject().getId() : null;
        String projectName = task.getProject() != null ? task.getProject().getName() : null;
        taskRepository.delete(task);
        if (projectId != null) {
            projectProgressService.recomputeProject(projectId);
            adminAuditService.record(principal, "PROJECT", projectId, projectName, "DELETE_TASK", "删除任务「" + task.getTitle() + "」");
        }
    }

    public List<DiscussionSummary> listDiscussions(JwtPrincipal principal) {
        requireAdmin(principal);
        return discussionPostRepository.findAll().stream()
                .sorted(Comparator.comparing(DiscussionPostEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(d -> {
                    int replyCount = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(d.getId()).size();
                    return new DiscussionSummary(
                            d.getId(),
                            d.getTitle(),
                            d.getCategory() != null ? d.getCategory().name() : null,
                            d.getStatus() != null ? d.getStatus().name() : null,
                            d.getProject() != null && d.getProject().getCourse() != null ? d.getProject().getCourse().getId() : null,
                            d.getProject() != null && d.getProject().getCourse() != null ? d.getProject().getCourse().getName() : null,
                            d.getProject() != null && d.getProject().getTeam() != null ? d.getProject().getTeam().getId() : null,
                            d.getProject() != null && d.getProject().getTeam() != null ? d.getProject().getTeam().getName() : null,
                            d.getProject() != null ? d.getProject().getId() : null,
                            d.getProject() != null ? d.getProject().getName() : null,
                            d.getAuthor() != null ? d.getAuthor().getName() : null,
                            replyCount,
                            d.getCreatedAt() != null ? d.getCreatedAt().toLocalDate() : null
                    );
                })
                .toList();
    }

    @Transactional
    public DiscussionSummary updateDiscussionStatus(JwtPrincipal principal, UpdateDiscussionStatusRequest request) {
        requireAdmin(principal);
        DiscussionPostEntity discussion = discussionPostRepository.findById(request.discussionId())
                .orElseThrow(() -> new ApiException("讨论不存在"));
        DiscussionStatus newStatus = DiscussionStatus.valueOf(request.status());
        discussion.setStatus(newStatus);
        discussion = discussionPostRepository.save(discussion);
        if (discussion.getProject() != null) {
            adminAuditService.record(principal, "PROJECT", discussion.getProject().getId(), discussion.getProject().getName(), "UPDATE_DISCUSSION", "讨论「" + discussion.getTitle() + "」状态变更为 " + newStatus.name());
        }
        int replyCount = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(discussion.getId()).size();
        return new DiscussionSummary(
                discussion.getId(),
                discussion.getTitle(),
                discussion.getCategory() != null ? discussion.getCategory().name() : null,
                discussion.getStatus() != null ? discussion.getStatus().name() : null,
                discussion.getProject() != null && discussion.getProject().getCourse() != null ? discussion.getProject().getCourse().getId() : null,
                discussion.getProject() != null && discussion.getProject().getCourse() != null ? discussion.getProject().getCourse().getName() : null,
                discussion.getProject() != null && discussion.getProject().getTeam() != null ? discussion.getProject().getTeam().getId() : null,
                discussion.getProject() != null && discussion.getProject().getTeam() != null ? discussion.getProject().getTeam().getName() : null,
                discussion.getProject() != null ? discussion.getProject().getId() : null,
                discussion.getProject() != null ? discussion.getProject().getName() : null,
                discussion.getAuthor() != null ? discussion.getAuthor().getName() : null,
                replyCount,
                discussion.getCreatedAt() != null ? discussion.getCreatedAt().toLocalDate() : null
        );
    }

    @Transactional
    public void deleteDiscussion(JwtPrincipal principal, Long discussionId) {
        requireAdmin(principal);
        DiscussionPostEntity discussion = discussionPostRepository.findById(discussionId)
            .orElseThrow(() -> new ApiException("讨论不存在"));
        if (discussion.getProject() != null) {
            adminAuditService.record(principal, "PROJECT", discussion.getProject().getId(), discussion.getProject().getName(), "DELETE_DISCUSSION", "删除讨论「" + discussion.getTitle() + "」");
        }
        discussionPostRepository.delete(discussion);
    }

    public List<AssignmentSummary> listAssignments(JwtPrincipal principal) {
        requireAdmin(principal);
        return assignmentRepository.findAll().stream()
                .sorted(Comparator.comparing(AssignmentEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(a -> {
                    List<AssignmentSubmissionEntity> submissions = submissionRepository.findByAssignmentId(a.getId());
                    int total = submissions.size();
                    int graded = (int) submissions.stream()
                            .filter(s -> s.getStatus() == AssignmentSubmissionStatus.GRADED)
                            .count();
                    return new AssignmentSummary(
                            a.getId(),
                            a.getCourse() != null ? a.getCourse().getId() : null,
                            a.getCourse() != null ? a.getCourse().getName() : null,
                            a.getDueDate() != null ? a.getDueDate().toString() : null,
                            total,
                            graded,
                            a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate() : null
                    );
                })
                .toList();
    }

    @Transactional
    public void deleteAssignment(JwtPrincipal principal, Long assignmentId) {
        requireAdmin(principal);
        AssignmentEntity assignment = assignmentRepository.findById(assignmentId)
            .orElseThrow(() -> new ApiException("作业不存在"));
        adminAuditService.record(principal, "COURSE", assignment.getCourse() != null ? assignment.getCourse().getId() : null, assignment.getCourse() != null ? assignment.getCourse().getName() : null, "DELETE_ASSIGNMENT", "删除作业「" + assignment.getTitle() + "」");
        assignmentRepository.delete(assignment);
    }

    public List<DocumentSummary> listDocuments(JwtPrincipal principal) {
        requireAdmin(principal);
        return documentRepository.findAll().stream()
            .sorted(Comparator.comparing(DocumentEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(document -> new DocumentSummary(
                document.getId(),
                document.getProject() != null && document.getProject().getCourse() != null ? document.getProject().getCourse().getId() : null,
                document.getProject() != null && document.getProject().getCourse() != null ? document.getProject().getCourse().getName() : null,
                document.getProject() != null && document.getProject().getTeam() != null ? document.getProject().getTeam().getId() : null,
                document.getProject() != null && document.getProject().getTeam() != null ? document.getProject().getTeam().getName() : null,
                document.getProject() != null ? document.getProject().getId() : null,
                document.getProject() != null ? document.getProject().getName() : null,
                document.getTitle(),
                document.getKind() != null ? document.getKind().name() : null,
                format(document.getUpdatedAt()),
                document.getFileAssetId()))
            .toList();
    }

    @Transactional
    public UserDetailRecord addUserCourseMembership(JwtPrincipal principal, Long userId, UserCourseMembershipRequest request) {
        requireAdmin(principal);
        addCourseMember(principal, request.courseId(), new CourseMemberSaveRequest(userId, request.role()));
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "ADD_USER_COURSE", "加入课程 " + request.courseId());
        return userDetail(principal, userId);
    }

    @Transactional
    public UserDetailRecord removeUserCourseMembership(JwtPrincipal principal, Long userId, Long courseId) {
        requireAdmin(principal);
        removeCourseMember(principal, courseId, userId);
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "REMOVE_USER_COURSE", "移出课程 " + courseId);
        return userDetail(principal, userId);
    }

    @Transactional
    public UserDetailRecord addUserTeamMembership(JwtPrincipal principal, Long userId, UserTeamMembershipRequest request) {
        requireAdmin(principal);
        addTeamMember(principal, request.teamId(), new TeamMemberAddRequest(userId));
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "ADD_USER_TEAM", "加入团队 " + request.teamId());
        return userDetail(principal, userId);
    }

    @Transactional
    public UserDetailRecord removeUserTeamMembership(JwtPrincipal principal, Long userId, Long teamId) {
        requireAdmin(principal);
        removeTeamMember(principal, teamId, userId);
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "REMOVE_USER_TEAM", "移出团队 " + teamId);
        return userDetail(principal, userId);
    }

    @Transactional
    public UserDetailRecord addUserProjectMembership(JwtPrincipal principal, Long userId, UserProjectMembershipRequest request) {
        requireAdmin(principal);
        addProjectMember(principal, request.projectId(), new ProjectMemberSaveRequest(userId, request.ownerFlag()));
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "ADD_USER_PROJECT", "加入项目 " + request.projectId());
        return userDetail(principal, userId);
    }

    @Transactional
    public UserDetailRecord removeUserProjectMembership(JwtPrincipal principal, Long userId, Long projectId) {
        requireAdmin(principal);
        removeProjectMember(principal, projectId, userId);
        adminAuditService.record(principal, "USER", userId, userRepository.findById(userId).map(UserEntity::getName).orElse("用户"), "REMOVE_USER_PROJECT", "移出项目 " + projectId);
        return userDetail(principal, userId);
    }

    public List<AdminAuditRecord> audit(JwtPrincipal principal, String scopeType, Long scopeId, Integer limit) {
        requireAdmin(principal);
        int resolvedLimit = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);
        if (scopeType != null && !scopeType.isBlank() && scopeId != null) {
            return adminAuditEventRepository.findByScopeTypeAndScopeIdOrderByCreatedAtDesc(scopeType.toUpperCase(Locale.ROOT), scopeId).stream().limit(resolvedLimit).map(this::toAuditRecord).toList();
        }
        if (scopeType != null && !scopeType.isBlank()) {
            return adminAuditEventRepository.findByScopeTypeOrderByCreatedAtDesc(scopeType.toUpperCase(Locale.ROOT)).stream().limit(resolvedLimit).map(this::toAuditRecord).toList();
        }
        return adminAuditEventRepository.findAll().stream()
            .sorted(Comparator.comparing(AdminAuditEventEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(resolvedLimit)
            .map(this::toAuditRecord)
            .toList();
    }

    public AdminSystemOverviewRecord systemOverview(JwtPrincipal principal) {
        requireAdmin(principal);
        long uploadBytes = sumDirectorySize(uploadRoot);
        long repoCount = safeCountDirectories(repoRoot);
        List<AdminMetricRecord> metrics = List.of(
            new AdminMetricRecord("users", "用户总数", String.valueOf(userRepository.count()), "系统账号总量"),
            new AdminMetricRecord("courses", "课程总数", String.valueOf(courseRepository.count()), "教学班级规模"),
            new AdminMetricRecord("projects", "项目总数", String.valueOf(projectRepository.count()), "项目工作区规模"),
            new AdminMetricRecord("uploads", "文件占用", humanBytes(uploadBytes), "本地上传目录累计大小"),
            new AdminMetricRecord("repos", "仓库数量", String.valueOf(repoCount), "本地 bare repo 数量"));
        List<AdminHealthRecord> healthChecks = runtimeHealthChecks().stream()
            .map(item -> new AdminHealthRecord(item.serviceKey(), item.label(), item.status(), item.detail(), item.checkedAt()))
            .toList();
        List<AdminImportJobRecord> recentImports = adminImportJobRepository.findAllByOrderByCreatedAtDesc().stream().limit(8).map(this::toImportJobRecord).toList();
        List<AdminAuditRecord> recentAudits = audit(principal, null, null, 12);
        return new AdminSystemOverviewRecord(metrics, healthChecks, recentImports, recentAudits);
    }

    public List<AdminSystemHealthRecord> systemHealth(JwtPrincipal principal) {
        requireAdmin(principal);
        return runtimeHealthChecks();
    }

    public List<AdminStorageTreeRecord> storageTree(JwtPrincipal principal) {
        requireAdmin(principal);
        Map<Long, List<TeamEntity>> teamsByCourse = teamRepository.findAll().stream()
            .collect(Collectors.groupingBy(team -> team.getCourse() != null ? team.getCourse().getId() : -1L));
        Map<Long, List<ProjectEntity>> projectsByCourse = projectRepository.findAll().stream()
            .collect(Collectors.groupingBy(project -> project.getCourse() != null ? project.getCourse().getId() : -1L));
        Map<Long, List<ProjectEntity>> projectsByTeam = projectRepository.findAll().stream()
            .filter(project -> project.getTeam() != null)
            .collect(Collectors.groupingBy(project -> project.getTeam().getId()));
        return courseRepository.findAll().stream()
            .sorted(Comparator.comparing(CourseEntity::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(course -> {
                List<TeamEntity> teams = teamsByCourse.getOrDefault(course.getId(), List.of());
                List<ProjectEntity> projects = projectsByCourse.getOrDefault(course.getId(), List.of());
                List<AdminStorageTreeRecord> children = new ArrayList<>();
                for (TeamEntity team : teams) {
                    List<ProjectEntity> teamProjects = projectsByTeam.getOrDefault(team.getId(), List.of());
                    children.add(new AdminStorageTreeRecord(
                        "TEAM",
                        "team-" + team.getId(),
                        course.getId(),
                        team.getId(),
                        null,
                        team.getName(),
                        "队长：" + Objects.requireNonNullElse(team.getLeader() != null ? team.getLeader().getName() : null, "未设置"),
                        countFilesForScope(course.getId(), team.getId(), null),
                        0,
                        countLogsForProjectIds(teamProjects.stream().map(ProjectEntity::getId).toList()),
                        teamProjects.stream()
                            .map(project -> new AdminStorageTreeRecord(
                                "PROJECT",
                                "project-" + project.getId(),
                                course.getId(),
                                team.getId(),
                                project.getId(),
                                project.getName(),
                                Objects.requireNonNullElse(project.getStatus(), ProjectStatus.ACTIVE).name(),
                                countFilesForScope(course.getId(), team.getId(), project.getId()),
                                gitRepositoryRepository.findByProjectId(project.getId()).isPresent() ? 1 : 0,
                                countLogsForProjectIds(List.of(project.getId())),
                                List.of()))
                            .toList()));
                }
                for (ProjectEntity project : projects.stream().filter(project -> project.getTeam() == null).toList()) {
                    children.add(new AdminStorageTreeRecord(
                        "PROJECT",
                        "project-" + project.getId(),
                        course.getId(),
                        null,
                        project.getId(),
                        project.getName(),
                        "未绑定团队",
                        countFilesForScope(course.getId(), null, project.getId()),
                        gitRepositoryRepository.findByProjectId(project.getId()).isPresent() ? 1 : 0,
                        countLogsForProjectIds(List.of(project.getId())),
                        List.of()));
                }
                return new AdminStorageTreeRecord(
                    "COURSE",
                    "course-" + course.getId(),
                    course.getId(),
                    null,
                    null,
                    course.getName(),
                    course.getClassCode(),
                    countFilesForScope(course.getId(), null, null),
                    (int) projects.stream().filter(project -> gitRepositoryRepository.findByProjectId(project.getId()).isPresent()).count(),
                    countLogsForProjectIds(projects.stream().map(ProjectEntity::getId).toList()),
                    children);
            })
            .toList();
    }

    public List<AdminStorageItemRecord> storageFiles(JwtPrincipal principal) {
        requireAdmin(principal);
        return fileAssetRepository.findAll().stream()
            .sorted(Comparator.comparing(FileAssetEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toStorageFileRecord)
            .toList();
    }

    public List<AdminStorageItemRecord> storageRepos(JwtPrincipal principal) {
        requireAdmin(principal);
        return gitRepositoryRepository.findAll().stream()
            .sorted(Comparator.comparing(GitRepositoryEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(this::toStorageRepoRecord)
            .toList();
    }

    public List<AdminStorageItemRecord> storageLogs(JwtPrincipal principal) {
        requireAdmin(principal);
        List<AdminStorageItemRecord> items = new ArrayList<>();
        for (ProjectEntity project : projectRepository.findAll()) {
            Path dir = storagePathService.projectActivityLogsRoot(project);
            if (!Files.exists(dir)) continue;
            try (var stream = Files.walk(dir)) {
                stream.filter(Files::isRegularFile)
                    .sorted(Comparator.reverseOrder())
                    .map(path -> toStorageLogRecord(path, project))
                    .forEach(items::add);
            } catch (IOException ignored) {
            }
        }
        return items;
    }

    public AdminStorageDirectoryRecord projectSystemEntries(JwtPrincipal principal, Long projectId, String path) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        Path root = storagePathService.projectSystemRoot(project);
        Path current = resolveSystemPath(root, path);
        if (!Files.exists(current)) {
            throw new ApiException("系统目录不存在");
        }
        if (!Files.isDirectory(current)) {
            throw new ApiException("当前路径不是目录");
        }
        List<AdminStorageDirectoryEntryRecord> entries = new ArrayList<>();
        try (var stream = Files.list(current)) {
            stream.sorted((left, right) -> {
                    boolean leftDir = Files.isDirectory(left);
                    boolean rightDir = Files.isDirectory(right);
                    if (leftDir != rightDir) return leftDir ? -1 : 1;
                    return left.getFileName().toString().compareToIgnoreCase(right.getFileName().toString());
                })
                .forEach(item -> entries.add(toDirectoryEntry(root, item)));
        } catch (IOException ex) {
            throw new ApiException("读取系统目录失败: " + ex.getMessage());
        }
        return new AdminStorageDirectoryRecord(
            project.getId(),
            project.getName(),
            relativizeSystemPath(root, current),
            true,
            systemBreadcrumbs(root, current),
            entries);
    }

    public AdminStorageFilePreviewRecord projectSystemFile(JwtPrincipal principal, Long projectId, String path) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        Path root = storagePathService.projectSystemRoot(project);
        Path file = resolveSystemPath(root, path);
        if (!Files.exists(file) || Files.isDirectory(file)) {
            throw new ApiException("系统文件不存在");
        }
        try {
            byte[] bytes = Files.readAllBytes(file);
            boolean binary = isBinary(bytes);
            long size = bytes.length;
            return new AdminStorageFilePreviewRecord(
                project.getId(),
                relativizeSystemPath(root, file),
                binary,
                binary ? "base64" : "utf-8",
                binary ? Base64.getEncoder().encodeToString(bytes) : new String(bytes, StandardCharsets.UTF_8),
                size);
        } catch (IOException ex) {
            throw new ApiException("读取系统文件失败: " + ex.getMessage());
        }
    }

    @Transactional
    public AdminActionResultRecord announce(JwtPrincipal principal, AdminAnnouncementRequest request) {
        requireAdmin(principal);
        if (request == null || request.title() == null || request.title().isBlank() || request.content() == null || request.content().isBlank()) {
            throw new ApiException("公告标题和内容不能为空");
        }
        List<UserEntity> users = userRepository.findAll();
        NotificationTarget target = NotificationTarget.of(
            NotificationSourceType.SYSTEM,
            null,
            request.sourcePath() == null || request.sourcePath().isBlank() ? "/app/notifications" : request.sourcePath(),
            request.sourceLabel() == null || request.sourceLabel().isBlank() ? "系统公告" : request.sourceLabel());
        for (UserEntity user : users) {
            notificationService.create(user, request.title(), request.content(), NotificationType.SYSTEM, target);
        }
        adminAuditService.record(principal, "SYSTEM", null, "系统公告", "SEND_ANNOUNCEMENT", "向全体用户发送公告「" + request.title() + "」");
        return new AdminActionResultRecord("系统公告已发送", users.size());
    }

    @Transactional
    public AdminActionResultRecord recomputeProgress(JwtPrincipal principal) {
        requireAdmin(principal);
        List<ProjectEntity> projects = projectRepository.findAll();
        for (ProjectEntity project : projects) {
            projectProgressService.recomputeProject(project.getId());
        }
        adminAuditService.record(principal, "SYSTEM", null, "项目进度", "RECOMPUTE_PROGRESS", "重算全部项目进度，共 " + projects.size() + " 个项目");
        return new AdminActionResultRecord("已完成全量项目进度重算", projects.size());
    }

    @Transactional
    public AdminActionResultRecord migrateStorage(JwtPrincipal principal) {
        requireAdmin(principal);
        int moved = storageService.migrateLegacyStorage();
        for (GitRepositoryEntity repo : gitRepositoryRepository.findAll()) {
            ProjectEntity project = repo.getProject();
            if (project == null) {
                continue;
            }
            String repoSlug = repo.getSlug() == null || repo.getSlug().isBlank() ? "project-" + project.getId() : repo.getSlug();
            Path target = storagePathService.projectRepositoryRoot(project).resolve(repoSlug + ".git");
            Path current = resolveExistingRepositoryPath(repo, project, target);
            if (current == null) {
                if (!Objects.equals(repo.getSlug(), repoSlug)) {
                    repo.setSlug(repoSlug);
                    moved++;
                }
                repo.setBarePath(target.toString());
                gitRepositoryRepository.save(repo);
                continue;
            }
            if (current.equals(target)) {
                boolean changed = false;
                if (!Objects.equals(repo.getSlug(), repoSlug)) {
                    repo.setSlug(repoSlug);
                    changed = true;
                }
                if (!Objects.equals(repo.getBarePath(), target.toString())) {
                    repo.setBarePath(target.toString());
                    changed = true;
                }
                if (changed) {
                    gitRepositoryRepository.save(repo);
                    moved++;
                }
                continue;
            }
            try {
                Files.createDirectories(target.getParent());
                Files.move(current, target, StandardCopyOption.REPLACE_EXISTING);
                repo.setSlug(repoSlug);
                repo.setBarePath(target.toString());
                gitRepositoryRepository.save(repo);
                moved++;
            } catch (IOException ignored) {
            }
        }
        for (ProjectEntity project : projectRepository.findAll()) {
            Path oldDir = logRoot.resolve("projects").resolve(String.valueOf(project.getId())).resolve("activity");
            Path newDir = storagePathService.projectActivityLogsRoot(project);
            if (!Files.exists(oldDir)) continue;
            try {
                Files.createDirectories(newDir);
                try (var stream = Files.list(oldDir)) {
                    for (Path file : stream.toList()) {
                        Path target = newDir.resolve(file.getFileName().toString());
                        if (!Files.exists(target)) {
                            Files.move(file, target, StandardCopyOption.REPLACE_EXISTING);
                            moved++;
                        }
                    }
                }
            } catch (IOException ignored) {
            }
        }
        for (ProjectEntity project : projectRepository.findAll()) {
            moved += rollupProjectActivityLogs(project);
        }
        adminAuditService.record(principal, "SYSTEM", null, "存储迁移", "MIGRATE_STORAGE", "迁移文件/仓库 " + moved + " 个实体");
        return new AdminActionResultRecord("已执行分层存储迁移", moved);
    }

    private Path resolveExistingRepositoryPath(GitRepositoryEntity repo, ProjectEntity project, Path target) {
        if (repo.getBarePath() != null && !repo.getBarePath().isBlank()) {
            Path configured = Path.of(repo.getBarePath());
            if (Files.exists(configured)) {
                return configured;
            }
        }
        Path repositoryRoot = storagePathService.projectRepositoryRoot(project);
        Path dotGit = repositoryRoot.resolve(".git");
        if (Files.exists(dotGit)) {
            return dotGit;
        }
        if (Files.exists(target)) {
            return target;
        }
        try (var stream = Files.list(repositoryRoot)) {
            return stream
                .filter(Files::isDirectory)
                .filter(path -> path.getFileName().toString().endsWith(".git"))
                .sorted(Comparator.comparing(path -> path.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
                .findFirst()
                .orElse(null);
        } catch (IOException ignored) {
            return null;
        }
    }

    public AdminBulkActionResultRecord scanStorage(JwtPrincipal principal) {
        requireAdmin(principal);
        int orphanFiles = (int) storageFiles(principal).stream().filter(AdminStorageItemRecord::orphaned).count();
        int orphanRepos = (int) storageRepos(principal).stream().filter(AdminStorageItemRecord::orphaned).count();
        List<String> warnings = new ArrayList<>();
        if (orphanFiles > 0) warnings.add("发现孤儿文件 " + orphanFiles + " 个");
        if (orphanRepos > 0) warnings.add("发现孤儿仓库 " + orphanRepos + " 个");
        if (warnings.isEmpty()) warnings.add("未发现明显孤儿文件或仓库");
        return new AdminBulkActionResultRecord("SCAN_STORAGE", orphanFiles + orphanRepos, warnings);
    }

    private UserSummary toUserSummary(UserEntity user) {
        int courseCount = classMemberRepository.findByUserId(user.getId()).size();
        int teamCount = teamMemberRepository.findByUserId(user.getId()).size();
        int projectCount = projectMemberRepository.findByUserId(user.getId()).size();
        String lastActiveAt = projectActivityEventRepository.findAll().stream()
            .filter(item -> item.getUser() != null && Objects.equals(item.getUser().getId(), user.getId()))
            .map(ProjectActivityEventEntity::getOccurredAt)
            .filter(Objects::nonNull)
            .max(LocalDateTime::compareTo)
            .map(this::format)
            .orElse(user.getUpdatedAt() != null ? format(user.getUpdatedAt()) : null);
        return new UserSummary(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            !Boolean.FALSE.equals(user.getActive()),
            user.getAvatar(),
            courseCount,
            teamCount,
            projectCount,
            lastActiveAt,
            user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate() : null);
    }

    private CourseSummary toCourseSummary(CourseEntity course) {
        return new CourseSummary(
            course.getId(),
            course.getName(),
            course.getClassCode(),
            course.getTeacher() != null ? course.getTeacher().getName() : null,
            course.getTeacher() != null ? course.getTeacher().getId() : null,
            classMemberRepository.findByCourseId(course.getId()).size(),
            teamRepository.findByCourseIdOrderByCreatedAtAsc(course.getId()).size(),
            projectRepository.findByCourseIdOrderByCreatedAtAsc(course.getId()).size(),
            assignmentRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()).size(),
            course.getCreatedAt() != null ? course.getCreatedAt().toLocalDate() : null);
    }

    private ProjectSummary toProjectSummary(ProjectEntity project) {
        String currentMilestoneTitle = projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(project.getId()).stream()
            .filter(milestone -> milestone.getStatus() == ProjectMilestoneStatus.ACTIVE)
            .map(ProjectMilestoneEntity::getTitle)
            .findFirst()
            .orElse(projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(project.getId()).stream().findFirst().map(ProjectMilestoneEntity::getTitle).orElse(null));
        String lastActiveAt = projectActivityEventRepository.findByProjectIdOrderByOccurredAtAsc(project.getId()).stream()
            .map(ProjectActivityEventEntity::getOccurredAt)
            .filter(Objects::nonNull)
            .max(LocalDateTime::compareTo)
            .map(this::format)
            .orElse(project.getUpdatedAt() != null ? format(project.getUpdatedAt()) : null);
        return new ProjectSummary(
            project.getId(),
            project.getName(),
            project.getType() != null ? project.getType().name() : null,
            project.getStatus() != null ? project.getStatus().name() : null,
            Objects.requireNonNullElse(project.getProgress(), 0),
            project.getCourse() != null ? project.getCourse().getId() : null,
            project.getCourse() != null ? project.getCourse().getName() : null,
            project.getTeam() != null ? project.getTeam().getId() : null,
            project.getTeam() != null ? project.getTeam().getName() : null,
            currentMilestoneTitle,
            projectMemberRepository.findByProjectId(project.getId()).size(),
            lastActiveAt,
            project.getCreatedAt() != null ? project.getCreatedAt().toLocalDate() : null);
    }

    private TeamSummary toTeamSummary(TeamEntity team) {
        ProjectEntity project = projectRepository.findByTeamId(team.getId()).orElse(null);
        return new TeamSummary(
            team.getId(),
            team.getName(),
            team.getCourse() != null ? team.getCourse().getId() : null,
            team.getCourse() != null ? team.getCourse().getName() : null,
            team.getGroupOrder(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : null,
            teamMemberRepository.findByTeamId(team.getId()).size(),
            project != null ? project.getId() : null,
            project != null ? project.getName() : null,
            team.getSource() != null ? team.getSource().name() : null,
            team.getStatus() != null ? team.getStatus().name() : null,
            team.getLeader() == null,
            project == null,
            team.getCreatedAt() != null ? team.getCreatedAt().toLocalDate() : null);
    }

    private AdminAuditRecord toAuditRecord(AdminAuditEventEntity entity) {
        return new AdminAuditRecord(
            entity.getId(),
            entity.getScopeType(),
            entity.getScopeId(),
            entity.getScopeTitle(),
            entity.getActionType(),
            entity.getDetailText(),
            entity.getAdminUser() != null ? entity.getAdminUser().getName() : null,
            format(entity.getCreatedAt()));
    }

    private AdminActivityRecord toActivityRecord(AdminAuditEventEntity entity) {
        String href = switch (Objects.requireNonNullElse(entity.getScopeType(), "")) {
            case "USER" -> entity.getScopeId() != null ? "/app/admin/users/" + entity.getScopeId() : "/app/admin/users";
            case "COURSE" -> entity.getScopeId() != null ? "/app/admin/courses/" + entity.getScopeId() + "/overview" : "/app/admin/courses";
            case "TEAM" -> entity.getScopeId() != null ? "/app/admin/teams/" + entity.getScopeId() + "/overview" : "/app/admin/teams";
            case "PROJECT" -> entity.getScopeId() != null ? "/app/admin/projects/" + entity.getScopeId() + "/overview" : "/app/admin/projects";
            default -> "/app/admin/system";
        };
        return new AdminActivityRecord(entity.getActionType(), Objects.requireNonNullElse(entity.getDetailText(), entity.getScopeTitle()), format(entity.getCreatedAt()), href);
    }

    private ProjectActivityEventRecord toProjectActivityRecord(ProjectActivityEventEntity entity) {
        double contributionScore = 0d;
        int metricCount = Objects.requireNonNullElse(entity.getEventCount(), 1);
        return new ProjectActivityEventRecord(
            entity.getId(),
            entity.getProject() != null ? entity.getProject().getId() : null,
            entity.getProject() != null ? entity.getProject().getName() : null,
            entity.getCourse() != null ? entity.getCourse().getId() : null,
            entity.getCourse() != null ? entity.getCourse().getName() : null,
            entity.getTeam() != null ? entity.getTeam().getId() : null,
            entity.getTeam() != null ? entity.getTeam().getName() : null,
            entity.getUser() != null ? entity.getUser().getId() : null,
            entity.getUser() != null ? entity.getUser().getName() : null,
            entity.getEventType() != null ? entity.getEventType().name() : null,
            entity.getTargetType(),
            entity.getTargetId(),
            entity.getTargetTitle(),
            metricCount,
            entity.getLinesAdded(),
            entity.getLinesDeleted(),
            contributionScore,
            entity.getDetailJson(),
            format(entity.getOccurredAt()));
    }

    private List<AdminAuditRecord> auditRecords(String scopeType, Long scopeId, int limit) {
        return adminAuditEventRepository.findByScopeTypeAndScopeIdOrderByCreatedAtDesc(scopeType, scopeId).stream().limit(limit).map(this::toAuditRecord).toList();
    }

    private AdminImportJobRecord toImportJobRecord(AdminImportJobEntity job) {
        return new AdminImportJobRecord(
            job.getId(),
            job.getCourse() != null ? job.getCourse().getId() : null,
            job.getCourse() != null ? job.getCourse().getName() : null,
            job.getFileName(),
            job.getStatus(),
            job.getTotalRows(),
            job.getImportedRows(),
            job.getSkippedRows(),
            job.getCreatedUsersCount(),
            job.getCreatedBy() != null ? job.getCreatedBy().getName() : null,
            format(job.getCreatedAt()),
            job.getReportJson());
    }


    private List<AdminSystemResourceRecord> buildOverviewResourceMetrics() {
        Path storageRoot = storagePathService.storageRoot();
        long systemBytes = sumDirectorySize(systemUsageRoot);
        long logBytes = sumDirectorySize(logRoot);
        ResourceSnapshot cpu = cpuSnapshot();
        ResourceSnapshot memory = memorySnapshot();
        DiskSnapshot disk = diskSnapshot(systemUsageRoot);
        return List.of(
            new AdminSystemResourceRecord("cpu", "CPU 占用", cpu.displayValue(), "%", cpu.used(), cpu.total(), cpu.usagePercent(), cpu.status(), "宿主机系统 CPU 使用率"),
            new AdminSystemResourceRecord("memory", "内存占用", memory.displayValue(), "B", memory.used(), memory.total(), memory.usagePercent(), memory.status(), "物理内存已用 / 总量"),
            new AdminSystemResourceRecord("disk", "磁盘占用", disk.displayValue(), "B", disk.used(), disk.total(), disk.usagePercent(), disk.status(), "系统目录所在磁盘分区已用 / 总量"),
            new AdminSystemResourceRecord("data", "系统存储占用", humanBytes(systemBytes), "B", systemBytes, null, null, "UP", systemUsageRoot.toAbsolutePath() + " 实际目录占用（含项目本体）"),
            new AdminSystemResourceRecord("logs", "日志占用", humanBytes(logBytes), "B", logBytes, null, null, "UP", "logs 实际目录占用"));
    }

    private ResourceSnapshot cpuSnapshot() {
        try {
            var bean = ManagementFactory.getPlatformMXBean(com.sun.management.OperatingSystemMXBean.class);
            if (bean == null) {
                return new ResourceSnapshot("N/A", null, null, null, "WARN");
            }
            double load = bean.getCpuLoad();
            if (Double.isNaN(load) || load <= 0.0001d) {
                double avg = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage();
                int processors = Math.max(Runtime.getRuntime().availableProcessors(), 1);
                if (!Double.isNaN(avg) && avg >= 0) {
                    load = Math.min(avg / processors, 1d);
                }
            }
            if (Double.isNaN(load) || load < 0) {
                return new ResourceSnapshot("N/A", null, null, null, "WARN");
            }
            int percent = (int) Math.round(Math.max(load, 0d) * 100);
            return new ResourceSnapshot(percent + "%", (long) percent, 100L, percent, percent >= 85 ? "WARN" : "UP");
        } catch (Exception ex) {
            return new ResourceSnapshot("N/A", null, null, null, "WARN");
        }
    }

    private ResourceSnapshot memorySnapshot() {
        try {
            var bean = ManagementFactory.getPlatformMXBean(com.sun.management.OperatingSystemMXBean.class);
            if (bean == null) {
                return new ResourceSnapshot("N/A", null, null, null, "WARN");
            }
            long total = bean.getTotalMemorySize();
            long free = bean.getFreeMemorySize();
            if (total <= 0) {
                return new ResourceSnapshot("N/A", null, null, null, "WARN");
            }
            long used = Math.max(total - free, 0L);
            int percent = (int) Math.round((used * 100d) / total);
            return new ResourceSnapshot(humanBytes(used) + " / " + humanBytes(total), used, total, percent, percent >= 85 ? "WARN" : "UP");
        } catch (Exception ex) {
            return new ResourceSnapshot("N/A", null, null, null, "WARN");
        }
    }

    private DiskSnapshot diskSnapshot(Path root) {
        try {
            Path base = Files.exists(root) ? root : root.toAbsolutePath().getParent();
            if (base == null) {
                return new DiskSnapshot("N/A", null, null, null, "WARN");
            }
            FileStore store = Files.getFileStore(base);
            long total = store.getTotalSpace();
            long usable = store.getUsableSpace();
            long used = Math.max(total - usable, 0L);
            int percent = total > 0 ? (int) Math.round((used * 100d) / total) : 0;
            return new DiskSnapshot(humanBytes(used) + " / " + humanBytes(total), used, total, percent, percent >= 90 ? "WARN" : "UP");
        } catch (Exception ex) {
            return new DiskSnapshot("N/A", null, null, null, "WARN");
        }
    }

    private Path resolveSystemUsageRoot(String configuredRoot) {
        if (configuredRoot != null && !configuredRoot.isBlank()) {
            return Path.of(configuredRoot).toAbsolutePath().normalize();
        }
        Path cwd = Path.of("").toAbsolutePath().normalize();
        if (cwd.getFileName() != null && "backend".equalsIgnoreCase(cwd.getFileName().toString()) && cwd.getParent() != null) {
            return cwd.getParent();
        }
        return cwd;
    }

    private List<AdminSystemHealthRecord> runtimeHealthChecks() {
        String checkedAt = format(LocalDateTime.now());
        return List.of(
            new AdminSystemHealthRecord("backend", "Backend", "UP", "管理员接口运行中", checkedAt),
            new AdminSystemHealthRecord("collab", "协同服务", isPortOpen("127.0.0.1", 1234) ? "UP" : "DOWN", "检查 127.0.0.1:1234", checkedAt),
            new AdminSystemHealthRecord("mysql", "MySQL", canQueryDatabase() ? "UP" : "DOWN", "检查数据库连接与简单查询", checkedAt),
            new AdminSystemHealthRecord("uploads", "文件存储", Files.exists(uploadRoot) ? "UP" : "WARN", uploadRoot.toAbsolutePath().toString(), checkedAt),
            new AdminSystemHealthRecord("repos", "仓库存储", Files.exists(repoRoot) ? "UP" : "WARN", repoRoot.toAbsolutePath().toString(), checkedAt),
            new AdminSystemHealthRecord("logs", "日志归档", Files.exists(logRoot) ? "UP" : "WARN", logRoot.toAbsolutePath().toString(), checkedAt));
    }

    private boolean isPortOpen(String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 400);
            return true;
        } catch (IOException ex) {
            return false;
        }
    }

    private boolean canQueryDatabase() {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private int countFilesForScope(Long courseId, Long teamId, Long projectId) {
        return (int) fileAssetRepository.findAll().stream()
            .filter(item -> {
                ScopeRef ref = resolveScope(item.getOwnerType(), item.getOwnerId());
                if (projectId != null) return Objects.equals(ref.projectId(), projectId);
                if (teamId != null) return Objects.equals(ref.teamId(), teamId);
                if (courseId != null) return Objects.equals(ref.courseId(), courseId);
                return true;
            })
            .count();
    }

    private int countLogsForProjectIds(List<Long> projectIds) {
        if (projectIds == null || projectIds.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (Long projectId : projectIds) {
            ProjectEntity project = projectRepository.findById(projectId).orElse(null);
            if (project == null) continue;
            Path dir = storagePathService.projectActivityLogsRoot(project);
            if (!Files.exists(dir)) continue;
            try (var stream = Files.walk(dir)) {
                count += (int) stream.filter(Files::isRegularFile).count();
            } catch (IOException ignored) {
            }
        }
        return count;
    }

    private AdminStorageItemRecord toStorageFileRecord(FileAssetEntity entity) {
        ScopeRef ref = resolveScope(entity.getOwnerType(), entity.getOwnerId());
        boolean orphaned = entity.getStoragePath() == null || entity.getStoragePath().isBlank() || !Files.exists(Path.of(entity.getStoragePath())) || ref.orphaned();
        return new AdminStorageItemRecord(
            "FILE",
            entity.getId(),
            entity.getFileName(),
            entity.getStoragePath(),
            entity.getSizeBytes(),
            ref.courseId(),
            ref.courseName(),
            ref.teamId(),
            ref.teamName(),
            ref.projectId(),
            ref.projectName(),
            entity.getOwnerType() != null ? entity.getOwnerType().name() : null,
            entity.getOwnerId(),
            format(entity.getUpdatedAt()),
            orphaned);
    }

    private AdminStorageItemRecord toStorageRepoRecord(GitRepositoryEntity repo) {
        ProjectEntity project = repo.getProject();
        TeamEntity team = project != null ? project.getTeam() : null;
        CourseEntity course = project != null ? project.getCourse() : null;
        boolean orphaned = project == null || repo.getBarePath() == null || !Files.exists(Path.of(repo.getBarePath()));
        return new AdminStorageItemRecord(
            "REPOSITORY",
            repo.getId(),
            repo.getSlug(),
            repo.getBarePath(),
            directorySize(repo.getBarePath()),
            course != null ? course.getId() : null,
            course != null ? course.getName() : null,
            team != null ? team.getId() : null,
            team != null ? team.getName() : null,
            project != null ? project.getId() : null,
            project != null ? project.getName() : null,
            "PROJECT",
            project != null ? project.getId() : null,
            format(repo.getUpdatedAt()),
            orphaned);
    }

    private AdminStorageItemRecord toStorageLogRecord(Path path, ProjectEntity project) {
        String pathText = path.toAbsolutePath().toString();
        Long projectId = project != null ? project.getId() : null;
        TeamEntity team = project != null ? project.getTeam() : null;
        CourseEntity course = project != null ? project.getCourse() : null;
        long size = 0L;
        try {
            size = Files.size(path);
        } catch (IOException ignored) {
        }
        return new AdminStorageItemRecord(
            "LOG",
            null,
            path.getFileName().toString(),
            pathText,
            size,
            course != null ? course.getId() : null,
            course != null ? course.getName() : null,
            team != null ? team.getId() : null,
            team != null ? team.getName() : null,
            project != null ? project.getId() : null,
            project != null ? project.getName() : null,
            "LOG",
            projectId,
            format(LocalDateTime.now()),
            false);
    }

    private int rollupProjectActivityLogs(ProjectEntity project) {
        Path dir = storagePathService.projectActivityLogsRoot(project);
        if (!Files.exists(dir)) {
            return 0;
        }
        int changed = 0;
        List<Path> files;
        try (var stream = Files.list(dir)) {
            files = stream.filter(Files::isRegularFile).toList();
        } catch (IOException ex) {
            return 0;
        }
        for (Path file : files) {
            String filename = file.getFileName().toString();
            if (filename.matches("\\d{4}-W\\d{2}\\.events\\.jsonl")) {
                continue;
            }
            String weekName = resolveWeekLogName(file);
            if (weekName == null) {
                continue;
            }
            Path target = dir.resolve(weekName);
            try {
                String content = Files.readString(file);
                Files.writeString(target, content, StandardCharsets.UTF_8, Files.exists(target) ? java.nio.file.StandardOpenOption.APPEND : java.nio.file.StandardOpenOption.CREATE);
                Files.deleteIfExists(file);
                changed++;
            } catch (IOException ignored) {
            }
        }
        return changed;
    }

    private String resolveWeekLogName(Path file) {
        String filename = file.getFileName().toString();
        try {
            if (filename.matches("\\d{4}-\\d{2}-\\d{2}\\.jsonl")) {
                LocalDate date = LocalDate.parse(filename.substring(0, 10));
                WeekFields fields = WeekFields.ISO;
                int weekBasedYear = date.get(fields.weekBasedYear());
                int week = date.get(fields.weekOfWeekBasedYear());
                return String.format("%d-W%02d.events.jsonl", weekBasedYear, week);
            }
            if ("events.jsonl".equals(filename)) {
                LocalDate date = Files.getLastModifiedTime(file).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                WeekFields fields = WeekFields.ISO;
                int weekBasedYear = date.get(fields.weekBasedYear());
                int week = date.get(fields.weekOfWeekBasedYear());
                return String.format("%d-W%02d.events.jsonl", weekBasedYear, week);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private Path resolveSystemPath(Path root, String path) {
        Path current = (path == null || path.isBlank()) ? root : root.resolve(path).normalize();
        if (!current.startsWith(root.normalize())) {
            throw new ApiException("非法系统路径");
        }
        return current;
    }

    private String relativizeSystemPath(Path root, Path target) {
        Path normalizedRoot = root.normalize();
        Path normalizedTarget = target.normalize();
        if (normalizedRoot.equals(normalizedTarget)) {
            return "";
        }
        return normalizedRoot.relativize(normalizedTarget).toString().replace('\\', '/');
    }

    private List<AdminStorageBreadcrumbRecord> systemBreadcrumbs(Path root, Path current) {
        List<AdminStorageBreadcrumbRecord> items = new ArrayList<>();
        items.add(new AdminStorageBreadcrumbRecord("system", ""));
        String relative = relativizeSystemPath(root, current);
        if (relative.isBlank()) {
            return items;
        }
        String[] segments = relative.split("/");
        StringBuilder cursor = new StringBuilder();
        for (String segment : segments) {
            if (cursor.length() > 0) cursor.append('/');
            cursor.append(segment);
            items.add(new AdminStorageBreadcrumbRecord(segment, cursor.toString()));
        }
        return items;
    }

    private AdminStorageDirectoryEntryRecord toDirectoryEntry(Path root, Path item) {
        String relative = relativizeSystemPath(root, item);
        Long size = null;
        try {
            if (Files.isRegularFile(item)) {
                size = Files.size(item);
            }
        } catch (IOException ignored) {
        }
        String updatedAt = null;
        try {
            updatedAt = format(LocalDateTime.ofInstant(Files.getLastModifiedTime(item).toInstant(), java.time.ZoneId.systemDefault()));
        } catch (IOException ignored) {
        }
        return new AdminStorageDirectoryEntryRecord(
            relative,
            item.getFileName().toString(),
            Files.isDirectory(item) ? "directory" : "file",
            size,
            updatedAt);
    }

    private boolean isBinary(byte[] bytes) {
        int max = Math.min(bytes.length, 4096);
        for (int i = 0; i < max; i++) {
            if (bytes[i] == 0) return true;
        }
        return false;
    }

    private ScopeRef resolveScope(FileOwnerType ownerType, Long ownerId) {
        if (ownerType == null || ownerId == null) {
            return ScopeRef.orphan();
        }
        return switch (ownerType) {
            case COURSE -> courseRepository.findById(ownerId)
                .map(course -> new ScopeRef(course.getId(), course.getName(), null, null, null, null, false))
                .orElseGet(ScopeRef::orphan);
            case TEAM -> teamRepository.findById(ownerId)
                .map(team -> new ScopeRef(
                    team.getCourse() != null ? team.getCourse().getId() : null,
                    team.getCourse() != null ? team.getCourse().getName() : null,
                    team.getId(),
                    team.getName(),
                    null,
                    null,
                    false))
                .orElseGet(ScopeRef::orphan);
            case PROJECT -> projectRepository.findById(ownerId).map(this::scopeFromProject).orElseGet(ScopeRef::orphan);
            case TASK -> taskRepository.findById(ownerId).map(TaskEntity::getProject).map(this::scopeFromProject).orElseGet(ScopeRef::orphan);
            case DOCUMENT -> documentRepository.findById(ownerId).map(DocumentEntity::getProject).map(this::scopeFromProject).orElseGet(ScopeRef::orphan);
            case DISCUSSION_POST -> discussionPostRepository.findById(ownerId).map(DiscussionPostEntity::getProject).map(this::scopeFromProject).orElseGet(ScopeRef::orphan);
            case ASSIGNMENT_SUBMISSION -> submissionRepository.findById(ownerId)
                .map(submission -> {
                    if (submission.getLinkedProject() != null) {
                        return scopeFromProject(submission.getLinkedProject());
                    }
                    CourseEntity course = submission.getAssignment() != null ? submission.getAssignment().getCourse() : null;
                    return new ScopeRef(course != null ? course.getId() : null, course != null ? course.getName() : null, null, null, null, null, course == null);
                })
                .orElseGet(ScopeRef::orphan);
            case CHAT_MESSAGE -> ScopeRef.orphan();
        };
    }

    private ScopeRef scopeFromProject(ProjectEntity project) {
        if (project == null) {
            return ScopeRef.orphan();
        }
        TeamEntity team = project.getTeam();
        CourseEntity course = project.getCourse();
        return new ScopeRef(
            course != null ? course.getId() : null,
            course != null ? course.getName() : null,
            team != null ? team.getId() : null,
            team != null ? team.getName() : null,
            project.getId(),
            project.getName(),
            false);
    }

    private void addTeamMemberInternal(TeamEntity team, Long userId) {
        if (team == null || userId == null) {
            return;
        }
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new ApiException("用户不存在"));
        if (team.getCourse() != null) {
            ensureClassMembership(team.getCourse(), user, user.getRole() == UserRole.TEACHER ? ClassMemberRole.TEACHER : ClassMemberRole.STUDENT, "ADMIN_TEAM");
        }
        if (teamMemberRepository.findByTeamIdAndUserId(team.getId(), userId).isEmpty()) {
            TeamMemberEntity entity = new TeamMemberEntity();
            entity.setTeam(team);
            entity.setUser(user);
            teamMemberRepository.save(entity);
        }
        if (team.getLeader() == null) {
            team.setLeader(user);
            teamRepository.save(team);
        }
    }

    private String generateCourseCode(String name) {
        String base = Objects.requireNonNullElse(name, "COURSE").replaceAll("[^A-Za-z0-9]+", "").toUpperCase(Locale.ROOT);
        if (base.isBlank()) {
            base = "COURSE";
        }
        base = base.substring(0, Math.min(base.length(), 8));
        String code = base + "-" + System.currentTimeMillis() % 10000;
        while (courseRepository.findByClassCode(code).isPresent()) {
            code = base + "-" + (1000 + (int) (Math.random() * 9000));
        }
        return code;
    }

    private Path resolveLayeredFilePath(FileOwnerType ownerType, Long ownerId, String fileName, Long fileId) {
        String safeName = Objects.requireNonNullElse(fileName, "file-" + fileId).replaceAll("[\\\\/:*?\"<>|]+", "_");
        ScopeRef ref = resolveScope(ownerType, ownerId);
        Path base;
        if (ref.courseId() != null) {
            base = uploadRoot.resolve("courses").resolve(String.valueOf(ref.courseId()));
            if (ref.teamId() != null) {
                base = base.resolve("teams").resolve(String.valueOf(ref.teamId()));
            }
            if (ref.projectId() != null) {
                base = base.resolve("projects").resolve(String.valueOf(ref.projectId()));
            }
        } else {
            base = uploadRoot.resolve("system").resolve("orphans");
        }
        String leaf = switch (ownerType) {
            case COURSE -> "course-files";
            case TEAM -> "team-files";
            case DOCUMENT -> "documents";
            case TASK -> "tasks";
            case DISCUSSION_POST -> "discussions";
            case ASSIGNMENT_SUBMISSION -> "assignments";
            case PROJECT -> "project-files";
            case CHAT_MESSAGE -> "chat";
        };
        return base.resolve(leaf).resolve(fileId + "-" + safeName);
    }

    private Path resolveLayeredRepoPath(ProjectEntity project, String slug) {
        Long courseId = project != null && project.getCourse() != null ? project.getCourse().getId() : 0L;
        String safeSlug = Objects.requireNonNullElse(slug, "project-" + (project != null ? project.getId() : "unknown"));
        return repoRoot.resolve("courses").resolve(String.valueOf(courseId)).resolve("projects")
            .resolve((project != null ? project.getId() : 0L) + "-" + safeSlug + ".git");
    }

    private long directorySize(String pathText) {
        if (pathText == null || pathText.isBlank()) {
            return 0L;
        }
        return sumDirectorySize(Path.of(pathText));
    }

    private ParsedImport parseImportFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("请上传要导入的文件");
        }
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        try {
            if (name.endsWith(".csv")) {
                return new ParsedImport(readCsv(file), name);
            }
            if (name.endsWith(".xlsx")) {
                return new ParsedImport(readXlsx(file), name);
            }
        } catch (IOException ex) {
            throw new ApiException("读取导入文件失败");
        }
        throw new ApiException("仅支持 CSV 或 XLSX 文件");
    }

    private List<ImportRow> readCsv(MultipartFile file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<ImportRow> rows = new ArrayList<>();
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return rows;
            }
            String[] headers = splitCsvLine(headerLine);
            Map<String, Integer> columns = new LinkedHashMap<>();
            for (int i = 0; i < headers.length; i++) {
                columns.put(headers[i].trim(), i);
            }
            String line;
            int rowNumber = 2;
            while ((line = reader.readLine()) != null) {
                String[] values = splitCsvLine(line);
                rows.add(new ImportRow(
                    rowNumber++,
                    valueAt(values, columns.get("name")),
                    valueAt(values, columns.get("email")),
                    valueAt(values, columns.get("groupName"))));
            }
            return rows;
        }
    }

    private List<ImportRow> readXlsx(MultipartFile file) throws IOException {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    entries.put(entry.getName(), zip.readAllBytes());
                }
            }
        }
        byte[] sheetXml = entries.get("xl/worksheets/sheet1.xml");
        if (sheetXml == null) {
            return List.of();
        }
        List<String> sharedStrings = readSharedStrings(entries.get("xl/sharedStrings.xml"));
        Document sheet = parseXml(sheetXml);
        NodeList rowNodes = sheet.getElementsByTagName("row");
        if (rowNodes.getLength() == 0) {
            return List.of();
        }
        Map<String, Integer> columns = new LinkedHashMap<>();
        List<ImportRow> rows = new ArrayList<>();
        for (int i = 0; i < rowNodes.getLength(); i++) {
            Element row = (Element) rowNodes.item(i);
            Map<String, String> cellValues = readRowValues(row, sharedStrings);
            if (i == 0) {
                int index = 0;
                for (String key : cellValues.values()) {
                    columns.put(key.trim(), index++);
                }
                continue;
            }
            rows.add(new ImportRow(
                Integer.parseInt(row.getAttribute("r")),
                cellValues.getOrDefault(columnKey(columns.get("name")), null),
                cellValues.getOrDefault(columnKey(columns.get("email")), null),
                cellValues.getOrDefault(columnKey(columns.get("groupName")), null)));
        }
        return rows;
    }

    private String[] splitCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '\"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '\"') {
                    current.append('\"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (ch == ',' && !quoted) {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        values.add(current.toString());
        return values.toArray(String[]::new);
    }

    private String valueAt(String[] values, Integer index) {
        if (index == null || index < 0 || index >= values.length) {
            return null;
        }
        return values[index];
    }

    private List<String> readSharedStrings(byte[] bytes) {
        if (bytes == null) {
            return List.of();
        }
        Document doc = parseXml(bytes);
        NodeList nodes = doc.getElementsByTagName("t");
        List<String> values = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            values.add(nodes.item(i).getTextContent());
        }
        return values;
    }

    private Document parseXml(byte[] bytes) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
        } catch (Exception ex) {
            throw new ApiException("解析导入文件失败");
        }
    }

    private Map<String, String> readRowValues(Element row, List<String> sharedStrings) {
        Map<String, String> values = new LinkedHashMap<>();
        NodeList cells = row.getElementsByTagName("c");
        for (int i = 0; i < cells.getLength(); i++) {
            Element cell = (Element) cells.item(i);
            String ref = cell.getAttribute("r");
            String column = ref.replaceAll("\\d", "");
            String type = cell.getAttribute("t");
            NodeList valueNodes = cell.getElementsByTagName("v");
            String value = valueNodes.getLength() > 0 ? valueNodes.item(0).getTextContent() : null;
            if ("s".equals(type) && value != null) {
                int index = Integer.parseInt(value);
                value = index >= 0 && index < sharedStrings.size() ? sharedStrings.get(index) : null;
            } else if ("inlineStr".equals(type)) {
                NodeList inlineNodes = cell.getElementsByTagName("t");
                value = inlineNodes.getLength() > 0 ? inlineNodes.item(0).getTextContent() : null;
            }
            values.put(column, value);
        }
        return values;
    }

    private String columnKey(Integer index) {
        if (index == null || index < 0) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        int value = index;
        do {
            builder.insert(0, (char) ('A' + (value % 26)));
            value = value / 26 - 1;
        } while (value >= 0);
        return builder.toString();
    }

    private List<AdminImportPreviewRowRecord> buildImportPreviewRows(CourseEntity course, List<ImportRow> rows) {
        Set<String> seenEmails = new LinkedHashSet<>();
        List<AdminImportPreviewRowRecord> preview = new ArrayList<>();
        for (ImportRow row : rows) {
            String name = row.name() == null ? "" : row.name().trim();
            String email = row.email() == null ? "" : row.email().trim().toLowerCase(Locale.ROOT);
            String groupName = row.groupName() == null ? null : row.groupName().trim();
            if (name.isBlank() || email.isBlank()) {
                preview.add(new AdminImportPreviewRowRecord(row.rowNumber(), name, email, groupName, "SKIP", "name 与 email 为必填项"));
                continue;
            }
            if (!seenEmails.add(email)) {
                preview.add(new AdminImportPreviewRowRecord(row.rowNumber(), name, email, groupName, "SKIP", "文件中存在重复邮箱，已自动跳过"));
                continue;
            }
            UserEntity existing = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (existing != null && classMemberRepository.findByCourseIdAndUserId(course.getId(), existing.getId()).isPresent()) {
                preview.add(new AdminImportPreviewRowRecord(row.rowNumber(), name, email, groupName, "SKIP", "该账号已在课程中"));
                continue;
            }
            if (existing == null) {
                preview.add(new AdminImportPreviewRowRecord(row.rowNumber(), name, email, groupName, "CREATE_USER", groupName == null || groupName.isBlank() ? "将自动创建账号并加入课程" : "将自动创建账号、加入课程并分配到团队"));
            } else {
                preview.add(new AdminImportPreviewRowRecord(row.rowNumber(), name, email, groupName, "JOIN_COURSE", groupName == null || groupName.isBlank() ? "将把现有账号加入课程" : "将把现有账号加入课程并分配到团队"));
            }
        }
        return preview;
    }

    private void ensureClassMembership(CourseEntity course, UserEntity user, ClassMemberRole role, String joinedVia) {
        if (classMemberRepository.findByCourseIdAndUserId(course.getId(), user.getId()).isPresent()) {
            return;
        }
        ClassMemberEntity entity = new ClassMemberEntity();
        entity.setCourse(course);
        entity.setUser(user);
        entity.setRole(role);
        entity.setJoinedVia(joinedVia);
        classMemberRepository.save(entity);
    }

    private void ensureTeamMembership(CourseEntity course, String teamName, UserEntity user) {
        TeamEntity team = teamRepository.findByCourseIdOrderByCreatedAtAsc(course.getId()).stream()
            .filter(item -> teamName.equalsIgnoreCase(item.getName()))
            .findFirst()
            .orElseGet(() -> {
                TeamEntity created = new TeamEntity();
                created.setName(teamName);
                created.setCourse(course);
                created.setSource(TeamSource.COURSE);
                created.setStatus(TeamStatus.FORMING);
                created.setGroupOrder(nextGroupOrder(course.getId()));
                created.setLeader(user);
                TeamEntity saved = teamRepository.save(created);
                if (course.getTeacher() != null) {
                    TeamMemberEntity teacherMember = new TeamMemberEntity();
                    teacherMember.setTeam(saved);
                    teacherMember.setUser(course.getTeacher());
                    teamMemberRepository.save(teacherMember);
                }
                return saved;
            });
        if (team.getLeader() == null) {
            team.setLeader(user);
            teamRepository.save(team);
        }
        if (teamMemberRepository.findByTeamIdAndUserId(team.getId(), user.getId()).isEmpty()) {
            TeamMemberEntity entity = new TeamMemberEntity();
            entity.setTeam(team);
            entity.setUser(user);
            teamMemberRepository.save(entity);
        }
    }

    private int nextGroupOrder(Long courseId) {
        return teamRepository.findByCourseIdOrderByCreatedAtAsc(courseId).stream()
            .map(TeamEntity::getGroupOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private long sumDirectorySize(Path root) {
        if (!Files.exists(root)) return 0L;
        try (var stream = Files.walk(root)) {
            return stream.filter(Files::isRegularFile).mapToLong(path -> {
                try {
                    return Files.size(path);
                } catch (IOException ignored) {
                    return 0L;
                }
            }).sum();
        } catch (IOException ex) {
            return 0L;
        }
    }

    private long safeCountDirectories(Path root) {
        if (!Files.exists(root)) return 0L;
        try (var stream = Files.list(root)) {
            return stream.filter(Files::isDirectory).count();
        } catch (IOException ex) {
            return 0L;
        }
    }

    private String humanBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        double kb = bytes / 1024d;
        if (kb < 1024) return String.format(Locale.US, "%.1f KB", kb);
        double mb = kb / 1024d;
        if (mb < 1024) return String.format(Locale.US, "%.1f MB", mb);
        return String.format(Locale.US, "%.1f GB", mb / 1024d);
    }

    private String format(LocalDateTime value) {
        return value == null ? null : formatter.format(value);
    }

    private record ResourceSnapshot(String displayValue, Long used, Long total, Integer usagePercent, String status) {}
    private record DiskSnapshot(String displayValue, Long used, Long total, Integer usagePercent, String status) {}

    private record ImportRow(int rowNumber, String name, String email, String groupName) {}
    private record ParsedImport(List<ImportRow> rows, String fileName) {}
    private record ScopeRef(
        Long courseId,
        String courseName,
        Long teamId,
        String teamName,
        Long projectId,
        String projectName,
        boolean orphaned
    ) {
        private static ScopeRef orphan() {
            return new ScopeRef(null, null, null, null, null, null, true);
        }
    }

    // AI Configuration
    public AiConfigDetail getAiConfig(JwtPrincipal principal) {
        requireAdmin(principal);
        AiConfigurationEntity config = aiConfigurationRepository.findTopByOrderByIdDesc().orElse(null);
        if (config == null) {
            return new AiConfigDetail(null, "doubao", "https://ark.cn-beijing.volces.com/api/v3", "", "doubao-pro-32k", true, null);
        }
        return new AiConfigDetail(
            config.getId(),
            config.getProvider(),
            config.getBaseUrl(),
            config.getApiKey(),
            config.getModel(),
            config.isEnabled(),
            config.getUpdatedAt() != null ? formatter.format(config.getUpdatedAt()) : null
        );
    }

    @Transactional
    public AiConfigDetail saveAiConfig(JwtPrincipal principal, SaveAiConfigRequest request) {
        requireAdmin(principal);
        System.out.println(">>> saveAiConfig called, request=" + request);
        try {
            AiConfigurationEntity config = aiConfigurationRepository.findTopByOrderByIdDesc().orElseGet(AiConfigurationEntity::new);
            System.out.println(">>> config found, id=" + config.getId() + ", provider=" + config.getProvider());
            if (request.provider() != null) config.setProvider(request.provider());
            if (request.baseUrl() != null) config.setBaseUrl(request.baseUrl());
            if (request.apiKey() != null) config.setApiKey(request.apiKey());
            if (request.model() != null) config.setModel(request.model());
            if (request.enabled() != null) config.setEnabled(request.enabled());
            System.out.println(">>> about to save, baseUrl=" + config.getBaseUrl());
            AiConfigurationEntity saved = aiConfigurationRepository.saveAndFlush(config);
            System.out.println(">>> saved, id=" + saved.getId());
            return new AiConfigDetail(
                saved.getId(),
                saved.getProvider(),
                saved.getBaseUrl(),
                saved.getApiKey(),
                saved.getModel(),
                saved.isEnabled(),
                saved.getUpdatedAt() != null ? formatter.format(saved.getUpdatedAt()) : null
            );
        } catch (Exception ex) {
            ex.printStackTrace();
            throw new ApiException("保存AI配置失败: " + ex.getMessage());
        }
    }

    public AiConfigTestResult testAiConfig(JwtPrincipal principal, SaveAiConfigRequest request) {
        requireAdmin(principal);
        String provider = request.provider() != null ? request.provider() : "doubao";
        String baseUrl = request.baseUrl() != null ? request.baseUrl() : "https://ark.cn-beijing.volces.com/api/v3";
        String apiKey = request.apiKey() != null ? request.apiKey() : "";
        String model = request.model() != null ? request.model() : "doubao-pro-32k";
        if (apiKey.isBlank()) {
            return new AiConfigTestResult(false, "API Key 不能为空", provider, model);
        }
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("model", model);
            root.put("max_tokens", 10);
            ArrayNode messages = objectMapper.createArrayNode();
            ObjectNode userMsg = objectMapper.createObjectNode();
            userMsg.put("role", "user");
            userMsg.put("content", "Hi");
            messages.add(userMsg);
            root.set("messages", messages);
            String body = root.toString();
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 300) {
                return new AiConfigTestResult(false, "AI 返回错误: " + response.statusCode(), provider, model);
            }
            return new AiConfigTestResult(true, "连接成功", provider, model);
        } catch (Exception ex) {
            return new AiConfigTestResult(false, "连接失败: " + ex.getMessage(), provider, model);
        }
    }
}
