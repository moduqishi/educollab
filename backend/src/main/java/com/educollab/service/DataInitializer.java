package com.educollab.service;

import com.educollab.model.AssignmentEntity;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.ClassMemberRole;
import com.educollab.model.CourseEntity;
import com.educollab.model.NotificationEntity;
import com.educollab.model.NotificationSourceType;
import com.educollab.model.NotificationType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.ProjectStatus;
import com.educollab.model.ProjectType;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskPriority;
import com.educollab.model.TaskStatus;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamSource;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.TeamStatus;
import com.educollab.model.TeacherFeedbackEntity;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.NotificationRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.repo.TeamRepository;
import com.educollab.repo.TeacherFeedbackRepository;
import com.educollab.repo.UserRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(100)
public class DataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ClassMemberRepository classMemberRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeacherFeedbackRepository teacherFeedbackRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final GitService gitService;

    public DataInitializer(
        UserRepository userRepository,
        CourseRepository courseRepository,
        ClassMemberRepository classMemberRepository,
        TeamRepository teamRepository,
        TeamMemberRepository teamMemberRepository,
        ProjectRepository projectRepository,
        ProjectMemberRepository projectMemberRepository,
        TaskRepository taskRepository,
        AssignmentRepository assignmentRepository,
        TeacherFeedbackRepository teacherFeedbackRepository,
        NotificationRepository notificationRepository,
        PasswordEncoder passwordEncoder,
        GitService gitService
    ) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.classMemberRepository = classMemberRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.taskRepository = taskRepository;
        this.assignmentRepository = assignmentRepository;
        this.teacherFeedbackRepository = teacherFeedbackRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.gitService = gitService;
    }

    @Override
    public void run(String... args) {
        UserEntity admin = ensureUser("系统管理员", "admin@educollab.local", UserRole.ADMIN, "admin");
        UserEntity teacher = ensureUser("王老师", "teacher@educollab.local", UserRole.TEACHER, "teacher");
        UserEntity xulaoliu = ensureUser("xulaoliu", "xulaoliu@educollab.local", UserRole.STUDENT, "xulaoliu");
        UserEntity alex = ensureUser("Alex Rivera", "alex@educollab.local", UserRole.STUDENT, "alex");
        UserEntity sarah = ensureUser("Sarah Chen", "sarah@educollab.local", UserRole.STUDENT, "sarah");
        UserEntity liam = ensureUser("Liam Smith", "liam@educollab.local", UserRole.STUDENT, "liam");
        UserEntity yuki = ensureUser("Yuki Lin", "yuki@educollab.local", UserRole.STUDENT, "yuki");
        UserEntity chenhao = ensureUser("陈浩", "chenhao@educollab.local", UserRole.STUDENT, "chenhao");

        CourseEntity course = ensureCourse(teacher);
        ensureClassMember(course, teacher, ClassMemberRole.TEACHER, "CREATED");
        for (UserEntity student : List.of(xulaoliu, alex, sarah, liam, yuki, chenhao)) {
            ensureClassMember(course, student, ClassMemberRole.STUDENT, "SEED");
        }

        TeamEntity aiTeam = ensureTeam("探索一队", course, xulaoliu);
        TeamEntity campusTeam = ensureTeam("创想二队", course, xulaoliu);

        ensureTeamMember(aiTeam, xulaoliu);
        ensureTeamMember(aiTeam, alex);
        ensureTeamMember(aiTeam, sarah);
        ensureTeamMember(campusTeam, xulaoliu);
        ensureTeamMember(campusTeam, liam);
        ensureTeamMember(campusTeam, yuki);
        ensureTeamMember(campusTeam, chenhao);

        ProjectEntity aiProject = ensureProject(
            "AI Research Assistant",
            "面向课程协作场景的 AI 作业协作平台开发。",
            ProjectType.CODE,
            aiTeam,
            course,
            68
        );
        ProjectEntity campusProject = ensureProject(
            "Sustainable Campus Initiative",
            "零废弃校园提案与执行计划。",
            ProjectType.NON_CODE,
            campusTeam,
            course,
            100
        );

        ensureProjectMember(aiProject, xulaoliu, true);
        ensureProjectMember(aiProject, alex, false);
        ensureProjectMember(aiProject, sarah, false);
        ensureProjectMember(campusProject, xulaoliu, true);
        ensureProjectMember(campusProject, liam, false);
        ensureProjectMember(campusProject, yuki, false);
        ensureProjectMember(campusProject, chenhao, false);

        ensureTask(aiProject, xulaoliu, "负责成员邀请与权限治理", "完善项目成员邀请、移除和队长权限控制。", TaskStatus.IN_PROGRESS, TaskPriority.HIGH);
        ensureTask(aiProject, alex, "修复仓库克隆弹窗", "整理克隆地址、认证说明和访问令牌交互。", TaskStatus.TODO, TaskPriority.MEDIUM);
        ensureTask(campusProject, liam, "整理班级展示资料", "完善成员资料和展示文案。", TaskStatus.DONE, TaskPriority.MEDIUM);
        refreshProjectProgress(aiProject);
        refreshProjectProgress(campusProject);

        ensureAssignment(course, aiProject);
        ensureFeedback(aiProject, teacher);

        // 创建通知
        TaskEntity task1 = taskRepository.findByProjectId(aiProject.getId()).stream()
            .filter(t -> t.getTitle().contains("成员邀请")).findFirst().orElse(null);
        if (task1 != null) {
            ensureNotification(xulaoliu, "任务即将截止",
                "任务【负责成员邀请与权限治理】将于明天截止，请及时完成。",
                NotificationType.TASK, NotificationSourceType.TASK, task1.getId(), "/app/projects/" + aiProject.getId() + "/tasks", "AI Research Assistant");
        }

        TaskEntity task2 = taskRepository.findByProjectId(campusProject.getId()).stream()
            .filter(t -> t.getStatus() == TaskStatus.TODO).findFirst().orElse(null);
        if (task2 != null) {
            ensureNotification(liam, "新任务已分配",
                "你被分配了新任务【" + task2.getTitle() + "】，请前往项目查看。",
                NotificationType.TASK, NotificationSourceType.TASK, task2.getId(), "/app/projects/" + campusProject.getId() + "/tasks", "Sustainable Campus Initiative");
        }

        ensureNotification(xulaoliu, "作业已发布",
            "新课程作业【阶段演示包】已发布，请于截止日期前提交。",
            NotificationType.SYSTEM, NotificationSourceType.ASSIGNMENT, null, "/app/classes/" + course.getId() + "/assignments", "软件工程");

        ensureNotification(alex, "作业已发布",
            "新课程作业【阶段演示包】已发布，请于截止日期前提交。",
            NotificationType.SYSTEM, NotificationSourceType.ASSIGNMENT, null, "/app/classes/" + course.getId() + "/assignments", "软件工程");

        if (aiProject.getType() == ProjectType.CODE) {
            gitService.ensureRepository(aiProject);
        }
    }

    private void ensureNotification(UserEntity user, String title, String content,
            NotificationType type, NotificationSourceType sourceType, Long sourceId, String sourcePath, String sourceLabel) {
        NotificationEntity n = new NotificationEntity();
        n.setUser(user);
        n.setTitle(title);
        n.setContent(content);
        n.setType(type);
        n.setSourceType(sourceType);
        n.setSourceId(sourceId);
        n.setSourcePath(sourcePath);
        n.setSourceLabel(sourceLabel);
        n.setRead(false);
        notificationRepository.save(n);
    }

    private UserEntity ensureUser(String name, String email, UserRole role, String seed) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email).orElseGet(UserEntity::new);
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        if (user.getAvatar() == null || user.getAvatar().isBlank()) {
            user.setAvatar("https://picsum.photos/seed/" + seed + "/100/100");
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode("Password123!"));
        }
        return userRepository.save(user);
    }

    private CourseEntity ensureCourse(UserEntity teacher) {
        CourseEntity course = courseRepository.findByTeacherId(teacher.getId()).stream().findFirst().orElseGet(CourseEntity::new);
        course.setName("软件工程");
        course.setTeacher(teacher);
        if (course.getClassCode() == null || course.getClassCode().isBlank()) {
            course.setClassCode("CLASS1");
        }
        return courseRepository.save(course);
    }

    private void ensureClassMember(CourseEntity course, UserEntity user, ClassMemberRole role, String joinedVia) {
        ClassMemberEntity member = classMemberRepository.findByCourseIdAndUserId(course.getId(), user.getId()).orElseGet(ClassMemberEntity::new);
        member.setCourse(course);
        member.setUser(user);
        member.setRole(role);
        member.setJoinedVia(joinedVia);
        classMemberRepository.save(member);
    }

    private TeamEntity ensureTeam(String name, CourseEntity course, UserEntity leader) {
        TeamEntity team = teamRepository.findAll().stream()
            .filter(item -> Objects.equals(item.getName(), name) && item.getCourse() != null && Objects.equals(item.getCourse().getId(), course.getId()))
            .findFirst()
            .orElseGet(TeamEntity::new);
        team.setName(name);
        team.setCourse(course);
        team.setLeader(leader);
        team.setSource(TeamSource.COURSE);
        team.setStatus(TeamStatus.FORMING);
        if (team.getGroupOrder() == null || team.getGroupOrder() <= 0) {
            team.setGroupOrder(nextCourseTeamOrder(course.getId()));
        }
        return teamRepository.save(team);
    }

    private void ensureTeamMember(TeamEntity team, UserEntity user) {
        if (teamMemberRepository.findByTeamIdAndUserId(team.getId(), user.getId()).isPresent()) return;
        TeamMemberEntity teamMember = new TeamMemberEntity();
        teamMember.setTeam(team);
        teamMember.setUser(user);
        teamMemberRepository.save(teamMember);
    }

    private ProjectEntity ensureProject(String name, String description, ProjectType type, TeamEntity team, CourseEntity course, int progress) {
        ProjectEntity project = projectRepository.findAll().stream()
            .filter(item -> Objects.equals(item.getName(), name))
            .findFirst()
            .orElseGet(ProjectEntity::new);
        project.setName(name);
        project.setDescription(description);
        project.setType(type);
        project.setStatus(ProjectStatus.ACTIVE);
        project.setProgress(progress);
        project.setTeam(team);
        project.setCourse(course);
        return projectRepository.save(project);
    }

    private void ensureProjectMember(ProjectEntity project, UserEntity user, boolean owner) {
        ProjectMemberEntity member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), user.getId()).orElseGet(ProjectMemberEntity::new);
        member.setProject(project);
        member.setUser(user);
        member.setOwnerFlag(owner);
        projectMemberRepository.save(member);
    }

    private void ensureTask(ProjectEntity project, UserEntity assignee, String title, String description, TaskStatus status, TaskPriority priority) {
        boolean exists = taskRepository.findByProjectId(project.getId()).stream().anyMatch(task -> Objects.equals(task.getTitle(), title));
        if (exists) return;
        TaskEntity task = new TaskEntity();
        task.setProject(project);
        task.setAssignee(assignee);
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setPriority(priority);
        taskRepository.save(task);
    }

    private int nextCourseTeamOrder(Long courseId) {
        return teamRepository.findByCourseIdOrderByCreatedAtAsc(courseId).stream()
            .map(TeamEntity::getGroupOrder)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0) + 1;
    }

    private void refreshProjectProgress(ProjectEntity project) {
        List<TaskEntity> tasks = taskRepository.findByProjectId(project.getId());
        int progress = tasks.isEmpty() ? 0 : (int) Math.round(tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count() * 100.0 / tasks.size());
        project.setProgress(progress);
        projectRepository.save(project);
    }

    private void ensureAssignment(CourseEntity course, ProjectEntity project) {
        boolean exists = assignmentRepository.findByCourseTeacherIdOrderByCreatedAtDesc(course.getTeacher().getId()).stream()
            .anyMatch(item -> Objects.equals(item.getTitle(), "阶段演示包"));
        if (exists) return;
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setCourse(course);
        assignment.setProject(project);
        assignment.setTitle("阶段演示包");
        assignment.setSummary("提交原型说明、代码仓库与演示视频。");
        assignment.setSubmissionUrl("https://educollab.local/submission/demo");
        assignmentRepository.save(assignment);
    }

    private void ensureFeedback(ProjectEntity project, UserEntity teacher) {
        boolean exists = teacherFeedbackRepository.findByProjectCourseTeacherId(teacher.getId()).stream()
            .anyMatch(item -> item.getProject() != null && Objects.equals(item.getProject().getId(), project.getId()));
        if (exists) return;
        TeacherFeedbackEntity feedback = new TeacherFeedbackEntity();
        feedback.setProject(project);
        feedback.setTeacher(teacher);
        feedback.setScore(90);
        feedback.setContent("当前示例数据已补齐，可直接验证班级、团队、项目成员和仓库流程。");
        teacherFeedbackRepository.save(feedback);
    }
}
