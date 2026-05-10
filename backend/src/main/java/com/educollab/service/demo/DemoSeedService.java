package com.educollab.service.demo;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.model.AiUsageLogEntity;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.AssignmentStatus;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.AssignmentSubmissionStatus;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.ClassMemberRole;
import com.educollab.model.CourseEntity;
import com.educollab.model.DiscussionCategory;
import com.educollab.model.DiscussionPostEntity;
import com.educollab.model.DiscussionReplyEntity;
import com.educollab.model.DiscussionStatus;
import com.educollab.model.DiscussionTaskLinkEntity;
import com.educollab.model.DocumentEntity;
import com.educollab.model.DocumentKind;
import com.educollab.model.DocumentVersionEntity;
import com.educollab.model.FileAssetEntity;
import com.educollab.model.FileOwnerType;
import com.educollab.model.GitRepositoryEntity;
import com.educollab.model.GroupTaskEntity;
import com.educollab.model.GroupTaskTeamTaskEntity;
import com.educollab.model.MergeRequestEntity;
import com.educollab.model.MergeRequestStatus;
import com.educollab.model.NotificationEntity;
import com.educollab.model.NotificationSourceType;
import com.educollab.model.NotificationType;
import com.educollab.model.ProjectActivityEventType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.ProjectMilestoneEntity;
import com.educollab.model.ProjectMilestoneStatus;
import com.educollab.model.ProjectReleaseEntity;
import com.educollab.model.ProjectStatus;
import com.educollab.model.ProjectType;
import com.educollab.model.TaskCommentEntity;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskPriority;
import com.educollab.model.TaskStatus;
import com.educollab.model.TeacherFeedbackEntity;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.TeamSource;
import com.educollab.model.TeamStatus;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AiUsageLogRepository;
import com.educollab.repo.AssignmentRepository;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.ChatMessageRepository;
import com.educollab.repo.ChatRoomRepository;
import com.educollab.repo.ClassInvitationRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.DiscussionPostRepository;
import com.educollab.repo.DiscussionReplyRepository;
import com.educollab.repo.DiscussionTaskLinkRepository;
import com.educollab.repo.DocumentRepository;
import com.educollab.repo.DocumentVersionRepository;
import com.educollab.repo.FileAssetRepository;
import com.educollab.repo.GitAccessTokenRepository;
import com.educollab.repo.GitRepositoryRepository;
import com.educollab.repo.GroupTaskRepository;
import com.educollab.repo.GroupTaskTeamTaskRepository;
import com.educollab.repo.MergeRequestRepository;
import com.educollab.repo.NotificationRepository;
import com.educollab.repo.ProjectActivityEventRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectMilestoneRepository;
import com.educollab.repo.ProjectReleaseRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TaskCommentRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.TeacherFeedbackRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.repo.TeamRepository;
import com.educollab.repo.UserRepository;
import com.educollab.service.workspace.ProjectProgressService;
import com.educollab.service.StoragePathService;
import com.educollab.service.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import javax.sql.DataSource;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.revwalk.RevCommit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DemoSeedService {
  private static final List<String> BUSINESS_TABLES = List.of(
      "chat_messages",
      "chat_rooms",
      "task_comments",
      "discussion_task_links",
      "discussion_replies",
      "project_activity_events",
      "document_versions",
      "file_assets",
      "assignment_submissions",
      "notifications",
      "merge_requests",
      "project_releases",
      "git_access_tokens",
      "git_repositories",
      "teacher_feedback",
      "group_task_team_tasks",
      "project_members",
      "tasks",
      "documents",
      "discussion_posts",
      "project_milestones",
      "assignments",
      "projects",
      "team_members",
      "teams",
      "group_tasks",
      "class_invitations",
      "class_members",
      "ai_usage_logs",
      "courses",
      "users");

  private final UserRepository userRepository;
  private final CourseRepository courseRepository;
  private final ClassMemberRepository classMemberRepository;
  private final ClassInvitationRepository classInvitationRepository;
  private final GroupTaskRepository groupTaskRepository;
  private final TeamRepository teamRepository;
  private final TeamMemberRepository teamMemberRepository;
  private final GroupTaskTeamTaskRepository groupTaskTeamTaskRepository;
  private final ProjectRepository projectRepository;
  private final ProjectMilestoneRepository projectMilestoneRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final TaskRepository taskRepository;
  private final TaskCommentRepository taskCommentRepository;
  private final DiscussionPostRepository discussionPostRepository;
  private final DiscussionReplyRepository discussionReplyRepository;
  private final DiscussionTaskLinkRepository discussionTaskLinkRepository;
  private final DocumentRepository documentRepository;
  private final DocumentVersionRepository documentVersionRepository;
  private final FileAssetRepository fileAssetRepository;
  private final NotificationRepository notificationRepository;
  private final AssignmentRepository assignmentRepository;
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final TeacherFeedbackRepository teacherFeedbackRepository;
  private final GitRepositoryRepository gitRepositoryRepository;
  private final MergeRequestRepository mergeRequestRepository;
  private final ProjectReleaseRepository projectReleaseRepository;
  private final GitAccessTokenRepository gitAccessTokenRepository;
  private final ProjectActivityEventRepository projectActivityEventRepository;
  private final ChatRoomRepository chatRoomRepository;
  private final ChatMessageRepository chatMessageRepository;
  private final AiUsageLogRepository aiUsageLogRepository;
  private final PasswordEncoder passwordEncoder;
  private final ProjectProgressService projectProgressService;
  private final JdbcTemplate jdbcTemplate;
  private final DataSource dataSource;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;
  private final Environment environment;
  private final StorageService storageService;
  private final StoragePathService storagePathService;
  private final String datasourceUrl;
  private final Map<String, Map<String, Boolean>> tableColumnPresence = new LinkedHashMap<>();

  public DemoSeedService(
      UserRepository userRepository,
      CourseRepository courseRepository,
      ClassMemberRepository classMemberRepository,
      ClassInvitationRepository classInvitationRepository,
      GroupTaskRepository groupTaskRepository,
      TeamRepository teamRepository,
      TeamMemberRepository teamMemberRepository,
      GroupTaskTeamTaskRepository groupTaskTeamTaskRepository,
      ProjectRepository projectRepository,
      ProjectMilestoneRepository projectMilestoneRepository,
      ProjectMemberRepository projectMemberRepository,
      TaskRepository taskRepository,
      TaskCommentRepository taskCommentRepository,
      DiscussionPostRepository discussionPostRepository,
      DiscussionReplyRepository discussionReplyRepository,
      DiscussionTaskLinkRepository discussionTaskLinkRepository,
      DocumentRepository documentRepository,
      DocumentVersionRepository documentVersionRepository,
      FileAssetRepository fileAssetRepository,
      NotificationRepository notificationRepository,
      AssignmentRepository assignmentRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      TeacherFeedbackRepository teacherFeedbackRepository,
      GitRepositoryRepository gitRepositoryRepository,
      MergeRequestRepository mergeRequestRepository,
      ProjectReleaseRepository projectReleaseRepository,
      GitAccessTokenRepository gitAccessTokenRepository,
      ProjectActivityEventRepository projectActivityEventRepository,
      ChatRoomRepository chatRoomRepository,
      ChatMessageRepository chatMessageRepository,
      AiUsageLogRepository aiUsageLogRepository,
      PasswordEncoder passwordEncoder,
      ProjectProgressService projectProgressService,
      StorageService storageService,
      StoragePathService storagePathService,
      JdbcTemplate jdbcTemplate,
      DataSource dataSource,
      EntityManager entityManager,
      ObjectMapper objectMapper,
      Environment environment,
      @Value("${spring.datasource.url:}") String datasourceUrl) {
    this.userRepository = userRepository;
    this.courseRepository = courseRepository;
    this.classMemberRepository = classMemberRepository;
    this.classInvitationRepository = classInvitationRepository;
    this.groupTaskRepository = groupTaskRepository;
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.groupTaskTeamTaskRepository = groupTaskTeamTaskRepository;
    this.projectRepository = projectRepository;
    this.projectMilestoneRepository = projectMilestoneRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.taskRepository = taskRepository;
    this.taskCommentRepository = taskCommentRepository;
    this.discussionPostRepository = discussionPostRepository;
    this.discussionReplyRepository = discussionReplyRepository;
    this.discussionTaskLinkRepository = discussionTaskLinkRepository;
    this.documentRepository = documentRepository;
    this.documentVersionRepository = documentVersionRepository;
    this.fileAssetRepository = fileAssetRepository;
    this.notificationRepository = notificationRepository;
    this.assignmentRepository = assignmentRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.teacherFeedbackRepository = teacherFeedbackRepository;
    this.gitRepositoryRepository = gitRepositoryRepository;
    this.mergeRequestRepository = mergeRequestRepository;
    this.projectReleaseRepository = projectReleaseRepository;
    this.gitAccessTokenRepository = gitAccessTokenRepository;
    this.projectActivityEventRepository = projectActivityEventRepository;
    this.chatRoomRepository = chatRoomRepository;
    this.chatMessageRepository = chatMessageRepository;
    this.aiUsageLogRepository = aiUsageLogRepository;
    this.passwordEncoder = passwordEncoder;
    this.projectProgressService = projectProgressService;
    this.storageService = storageService;
    this.storagePathService = storagePathService;
    this.jdbcTemplate = jdbcTemplate;
    this.dataSource = dataSource;
    this.entityManager = entityManager;
    this.objectMapper = objectMapper;
    this.environment = environment;
    this.datasourceUrl = datasourceUrl == null ? "" : datasourceUrl;
  }

  @Transactional
  public void initialize(DemoSeedMode mode) {
    if (mode == DemoSeedMode.OFF) {
      return;
    }
    if (mode == DemoSeedMode.ENSURE_DEMO && !isDatabaseEffectivelyEmpty()) {
      return;
    }
    if (mode == DemoSeedMode.RESET_DEMO) {
      ensureResetAllowed();
      wipeGeneratedFiles();
      resetDatabase();
    }
    if (mode == DemoSeedMode.ENSURE_DEMO && !isDatabaseEffectivelyEmpty()) {
      return;
    }
    seedDemoWorld();
  }

  private boolean isDatabaseEffectivelyEmpty() {
    return userRepository.count() == 0
        && courseRepository.count() == 0
        && projectRepository.count() == 0
        && taskRepository.count() == 0;
  }

  private void ensureResetAllowed() {
    boolean localProfile = List.of(environment.getActiveProfiles()).stream()
        .map(item -> item.toLowerCase(Locale.ROOT))
        .anyMatch(item -> item.equals("local") || item.equals("dev"));
    boolean localDatasource = datasourceUrl.contains("jdbc:h2:")
        || datasourceUrl.contains("localhost")
        || datasourceUrl.contains("127.0.0.1");
    if (!localProfile && !localDatasource) {
      throw new ApiException("RESET_DEMO 仅允许在本地开发环境执行");
    }
  }

  private void wipeGeneratedFiles() {
    deleteRecursively(storagePathService.storageRoot());
    cleanupH2Artifacts();
  }

  private void cleanupH2Artifacts() {
    if (!datasourceUrl.startsWith("jdbc:h2:file:")) {
      return;
    }
    String raw = datasourceUrl.substring("jdbc:h2:file:".length());
    int end = raw.indexOf(';');
    String pathText = end >= 0 ? raw.substring(0, end) : raw;
    if (pathText.isBlank()) {
      return;
    }
    Path base = Path.of(pathText);
    deleteIfExists(base.resolveSibling(base.getFileName() + ".trace.db"));
    deleteIfExists(base.resolveSibling(base.getFileName() + ".lock.db"));
  }

  private void deleteRecursively(Path root) {
    try {
      if (root == null || !Files.exists(root)) {
        return;
      }
      try (var walk = Files.walk(root)) {
        walk.sorted((left, right) -> right.compareTo(left)).forEach(this::deleteIfExists);
      }
    } catch (IOException ex) {
      throw new ApiException("清理本地生成文件失败: " + ex.getMessage());
    }
  }

  private void deleteIfExists(Path path) {
    try {
      Files.deleteIfExists(path);
    } catch (IOException ex) {
      throw new ApiException("删除文件失败: " + ex.getMessage());
    }
  }

  private void resetDatabase() {
    entityManager.flush();
    entityManager.clear();
    String product = databaseProductName();
    if (product.contains("h2")) {
      jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
      for (String table : BUSINESS_TABLES) {
        executeBestEffort("TRUNCATE TABLE " + table);
      }
      jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
      return;
    }
    if (product.contains("mysql") || product.contains("mariadb")) {
      jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=0");
      for (String table : BUSINESS_TABLES) {
        executeBestEffort("TRUNCATE TABLE " + table);
      }
      jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=1");
      return;
    }
    for (String table : BUSINESS_TABLES) {
      executeBestEffort("DELETE FROM " + table);
    }
  }

  private String databaseProductName() {
    try (Connection connection = Objects.requireNonNull(dataSource.getConnection())) {
      return connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
    } catch (Exception ex) {
      throw new ApiException("读取数据库类型失败: " + ex.getMessage());
    }
  }

  private void executeBestEffort(String sql) {
    try {
      jdbcTemplate.execute(sql);
    } catch (Exception ignored) {
      // best effort for local reset
    }
  }

  private void seedDemoWorld() {
    DemoUsers users = createUsers();
    CourseEntity mainCourse = createCourse("软件工程项目实训 · 2026 春", "SE-2026-SPRING", users.teacher, weeksAgoAt(8, DayOfWeek.MONDAY, 9, 0));
    CourseEntity auxCourse = createCourse("交互设计专题 · 2026 春", "UX-2026-SPRING", users.teacher, weeksAgoAt(6, DayOfWeek.TUESDAY, 10, 0));

    List<UserEntity> mainStudents = List.of(users.alex, users.sarah, users.liam, users.yuki, users.chenhao, users.mia, users.noah, users.xulaoliu);
    for (UserEntity student : mainStudents) {
      createClassMember(mainCourse, student, ClassMemberRole.STUDENT, "SEED", weeksAgoAt(8, DayOfWeek.MONDAY, 11, 0));
    }
    createClassMember(mainCourse, users.teacher, ClassMemberRole.TEACHER, "CREATED", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 45));

    List<UserEntity> auxStudents = List.of(users.alex, users.yuki, users.mia, users.noah);
    for (UserEntity student : auxStudents) {
      createClassMember(auxCourse, student, ClassMemberRole.STUDENT, "SEED", weeksAgoAt(6, DayOfWeek.TUESDAY, 11, 0));
    }
    createClassMember(auxCourse, users.teacher, ClassMemberRole.TEACHER, "CREATED", weeksAgoAt(6, DayOfWeek.TUESDAY, 9, 30));

    GroupTaskEntity mainGroupTask = createGroupTask(
        mainCourse,
        users.teacher,
        "课程团队项目",
        "围绕课堂协作、项目管理与成果展示完成一套可演示项目。",
        3,
        5,
        LocalDate.now().plusWeeks(2),
        weeksAgoAt(7, DayOfWeek.MONDAY, 14, 0));
    GroupTaskEntity uxGroupTask = createGroupTask(
        auxCourse,
        users.teacher,
        "交互原型共创",
        "完成从研究到高保真原型的完整交互设计项目。",
        2,
        4,
        LocalDate.now().plusWeeks(1),
        weeksAgoAt(5, DayOfWeek.WEDNESDAY, 15, 0));

    TeamEntity mainTeam = createTeam(mainCourse, mainGroupTask, "探索一队", users.alex, 1, TeamStatus.LOCKED, weeksAgoAt(7, DayOfWeek.TUESDAY, 10, 0));
    TeamEntity completedTeam = createTeam(mainCourse, mainGroupTask, "北极星二队", users.liam, 2, TeamStatus.LOCKED, weeksAgoAt(7, DayOfWeek.TUESDAY, 10, 15));
    TeamEntity planningTeam = createTeam(mainCourse, mainGroupTask, "远航三队", users.mia, 3, TeamStatus.LOCKED, weeksAgoAt(7, DayOfWeek.TUESDAY, 10, 30));
    TeamEntity uxTeam = createTeam(auxCourse, uxGroupTask, "体验工坊", users.yuki, 1, TeamStatus.LOCKED, weeksAgoAt(5, DayOfWeek.THURSDAY, 11, 0));

    addTeamMembers(mainTeam, weeksAgoAt(7, DayOfWeek.TUESDAY, 11, 0), users.alex, users.sarah, users.xulaoliu);
    addTeamMembers(completedTeam, weeksAgoAt(7, DayOfWeek.TUESDAY, 11, 10), users.liam, users.yuki, users.chenhao);
    addTeamMembers(planningTeam, weeksAgoAt(7, DayOfWeek.TUESDAY, 11, 20), users.mia, users.noah);
    addTeamMembers(uxTeam, weeksAgoAt(5, DayOfWeek.THURSDAY, 11, 20), users.yuki, users.alex, users.mia);

    createGroupTaskTeamTask(mainTeam, users.alex, "提交选题说明", "完成项目方向与目标用户的简述。", TaskStatus.DONE, LocalDate.now().minusWeeks(5), weeksAgoAt(7, DayOfWeek.WEDNESDAY, 17, 0));
    createGroupTaskTeamTask(mainTeam, users.sarah, "确认团队分工表", "明确产品、前端、后端与资料负责人。", TaskStatus.DONE, LocalDate.now().minusWeeks(4), weeksAgoAt(7, DayOfWeek.THURSDAY, 18, 0));
    createGroupTaskTeamTask(completedTeam, users.liam, "整理阶段展示脚本", "输出中期汇报讲稿与 demo 流程。", TaskStatus.DONE, LocalDate.now().minusWeeks(4), weeksAgoAt(6, DayOfWeek.MONDAY, 16, 0));
    createGroupTaskTeamTask(planningTeam, users.mia, "补充研究问卷", "收集目标用户反馈并完成统计。", TaskStatus.IN_PROGRESS, LocalDate.now().plusDays(5), weeksAgoAt(1, DayOfWeek.TUESDAY, 11, 0));
    createGroupTaskTeamTask(uxTeam, users.yuki, "提交高保真原型链接", "同步 Figma 原型与演示脚本。", TaskStatus.REVIEW, LocalDate.now().plusDays(3), weeksAgoAt(1, DayOfWeek.WEDNESDAY, 14, 0));

    ProjectFixture mainProject = createMainProject(users, mainCourse, mainGroupTask, mainTeam);
    ProjectFixture completedProject = createCompletedProject(users, mainCourse, mainGroupTask, completedTeam);
    ProjectFixture planningProject = createPlanningProject(users, mainCourse, mainGroupTask, planningTeam);
    ProjectFixture uxProject = createAuxProject(users, auxCourse, uxGroupTask, uxTeam);

    createAssignmentsAndSubmissions(users, mainCourse, auxCourse, mainProject, completedProject, planningProject, uxProject);
    createTeacherFeedback(mainProject.project, users.teacher, 94, "阶段节奏非常稳定，总结工作台和任务树的结合已经具备课堂演示价值。", weeksAgoAt(1, DayOfWeek.FRIDAY, 18, 30));
    createTeacherFeedback(completedProject.project, users.teacher, 97, "交付质量完整，演示链路、材料与总结记录都做得很扎实。", weeksAgoAt(0, DayOfWeek.MONDAY, 9, 45));
    createTeacherFeedback(uxProject.project, users.teacher, 91, "交互方案表达清晰，建议再加强可用性验证与版本说明。", weeksAgoAt(0, DayOfWeek.TUESDAY, 10, 0));

    createNotifications(users, mainCourse, mainProject, completedProject, planningProject, uxProject);
    createAiUsageLog(users.alex, "project-summary", "gpt-4o-mini", true, "生成本周项目总结摘要", daysAgoAt(3, 20, 10));
    createAiUsageLog(users.teacher, "teacher-overview", "gpt-4o-mini", true, "汇总课程贡献排行榜", daysAgoAt(2, 9, 20));

    projectProgressService.recomputeProject(mainProject.project.getId());
    projectProgressService.recomputeProject(completedProject.project.getId());
    projectProgressService.recomputeProject(planningProject.project.getId());
    projectProgressService.recomputeProject(uxProject.project.getId());

    markProjectStatus(completedProject.project, ProjectStatus.COMPLETED, daysAgoAt(9, 18, 0));
    markProjectStatus(mainProject.project, ProjectStatus.ACTIVE, daysAgoAt(0, 12, 0));
    markProjectStatus(planningProject.project, ProjectStatus.ACTIVE, daysAgoAt(0, 9, 0));
    markProjectStatus(uxProject.project, ProjectStatus.ACTIVE, daysAgoAt(0, 10, 0));

    finalizeProjectStorage(mainProject.project, completedProject.project, planningProject.project, uxProject.project);
  }

  private DemoUsers createUsers() {
    UserEntity admin = createUser("系统管理员", "admin@educollab.local", UserRole.ADMIN, "admin", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 0));
    UserEntity teacher = createUser("王老师", "teacher@educollab.local", UserRole.TEACHER, "teacher", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 5));
    UserEntity xulaoliu = createUser("xulaoliu", "xulaoliu@educollab.local", UserRole.STUDENT, "xulaoliu", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 10));
    UserEntity alex = createUser("Alex Rivera", "alex@educollab.local", UserRole.STUDENT, "alex", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 15));
    UserEntity sarah = createUser("Sarah Chen", "sarah@educollab.local", UserRole.STUDENT, "sarah", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 20));
    UserEntity liam = createUser("Liam Smith", "liam@educollab.local", UserRole.STUDENT, "liam", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 25));
    UserEntity yuki = createUser("Yuki Lin", "yuki@educollab.local", UserRole.STUDENT, "yuki", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 30));
    UserEntity chenhao = createUser("陈浩", "chenhao@educollab.local", UserRole.STUDENT, "chenhao", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 35));
    UserEntity mia = createUser("Mia Zhao", "mia@educollab.local", UserRole.STUDENT, "mia", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 40));
    UserEntity noah = createUser("Noah Wu", "noah@educollab.local", UserRole.STUDENT, "noah", weeksAgoAt(8, DayOfWeek.MONDAY, 8, 45));
    return new DemoUsers(admin, teacher, xulaoliu, alex, sarah, liam, yuki, chenhao, mia, noah);
  }

  private ProjectFixture createMainProject(DemoUsers users, CourseEntity course, GroupTaskEntity groupTask, TeamEntity team) {
    ProjectEntity project = createProject(
        "EduCollab 总结工作台",
        "围绕课程协作系统，完成任务树、总结工作台、权限与演示数据闭环。",
        ProjectType.CODE,
        ProjectStatus.ACTIVE,
        course,
        groupTask,
        team,
        LocalDate.now().plusWeeks(2),
        weeksAgoAt(7, DayOfWeek.THURSDAY, 13, 30));
    addProjectMembers(project, users.alex, users.alex, users.sarah, users.xulaoliu, users.teacher);
    ProjectFixture fixture = new ProjectFixture(project, team, course);

    ProjectMilestoneEntity ideation = createMilestone(project, "构思阶段", "确认课程协作的痛点、目标与示范边界。", 0, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(7, DayOfWeek.THURSDAY, 14, 0), weeksAgoAt(6, DayOfWeek.MONDAY, 18, 0));
    ProjectMilestoneEntity blueprint = createMilestone(project, "蓝图搭建", "建立页面蓝图、信息架构和核心数据关系。", 1, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(6, DayOfWeek.TUESDAY, 9, 0), weeksAgoAt(5, DayOfWeek.THURSDAY, 19, 0));
    ProjectMilestoneEntity planning = createMilestone(project, "项目规划", "拆解里程碑、任务树、角色协同与验收方式。", 2, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(5, DayOfWeek.FRIDAY, 9, 30), weeksAgoAt(4, DayOfWeek.WEDNESDAY, 18, 30));
    ProjectMilestoneEntity development = createMilestone(project, "开发实现", "围绕总结工作台、任务树和教师总览推进主开发。", 3, 5, ProjectMilestoneStatus.ACTIVE, weeksAgoAt(4, DayOfWeek.THURSDAY, 10, 0), null);
    ProjectMilestoneEntity acceptance = createMilestone(project, "验收交付", "准备课程演示、交付说明与最终验收。", 4, 2, ProjectMilestoneStatus.LOCKED, null, null);
    fixture.milestones.addAll(List.of(ideation, blueprint, planning, development, acceptance));

    TaskEntity ideationRoot = createTask(project, ideation, null, 0, "构思课程协作主问题", "明确课堂项目协作中的关键断点。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusWeeks(6), weeksAgoAt(7, DayOfWeek.FRIDAY, 10, 0), weeksAgoAt(6, DayOfWeek.MONDAY, 17, 0));
    TaskEntity painPoint = createTask(project, ideation, ideationRoot, 0, "整理课堂协作痛点", "汇总任务管理、总结、作业与仓库使用中的痛点。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusWeeks(6), weeksAgoAt(7, DayOfWeek.FRIDAY, 11, 0), weeksAgoAt(6, DayOfWeek.MONDAY, 15, 0));
    TaskEntity interview = createTask(project, ideation, ideationRoot, 1, "形成关键用户场景", "抽出教师、组长、组员的关键使用场景。", TaskStatus.DONE, TaskPriority.MEDIUM, users.sarah, LocalDate.now().minusWeeks(6), weeksAgoAt(7, DayOfWeek.SATURDAY, 14, 0), weeksAgoAt(6, DayOfWeek.MONDAY, 16, 30));
    TaskEntity benchmark = createTask(project, ideation, null, 1, "竞品与参考产品梳理", "对 GitHub、Notion、Linear 类产品做结构参考。", TaskStatus.DONE, TaskPriority.MEDIUM, users.sarah, LocalDate.now().minusWeeks(6), weeksAgoAt(7, DayOfWeek.SUNDAY, 13, 0), weeksAgoAt(6, DayOfWeek.TUESDAY, 11, 30));

    TaskEntity blueprintRoot = createTask(project, blueprint, null, 0, "蓝图与信息架构输出", "完成项目页、团队页、课程页与总结页的主结构。", TaskStatus.DONE, TaskPriority.HIGH, users.sarah, LocalDate.now().minusWeeks(5), weeksAgoAt(6, DayOfWeek.WEDNESDAY, 9, 30), weeksAgoAt(5, DayOfWeek.WEDNESDAY, 18, 0));
    TaskEntity overviewWireframe = createTask(project, blueprint, blueprintRoot, 0, "概览与总结页框架", "明确 KPI、榜单、趋势与热力图的布局。", TaskStatus.DONE, TaskPriority.HIGH, users.sarah, LocalDate.now().minusWeeks(5), weeksAgoAt(6, DayOfWeek.WEDNESDAY, 10, 0), weeksAgoAt(5, DayOfWeek.TUESDAY, 17, 0));
    TaskEntity taskBlueprint = createTask(project, blueprint, blueprintRoot, 1, "任务树与里程碑结构图", "梳理阶段树、父任务与子任务层次。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusWeeks(5), weeksAgoAt(6, DayOfWeek.THURSDAY, 14, 0), weeksAgoAt(5, DayOfWeek.WEDNESDAY, 16, 0));
    TaskEntity dataModel = createTask(project, blueprint, null, 1, "数据模型蓝图", "确定里程碑、任务树、活动日志与作业的关系。", TaskStatus.DONE, TaskPriority.HIGH, users.xulaoliu, LocalDate.now().minusWeeks(5), weeksAgoAt(6, DayOfWeek.FRIDAY, 11, 0), weeksAgoAt(5, DayOfWeek.THURSDAY, 18, 30));

    TaskEntity planningRoot = createTask(project, planning, null, 0, "总结工作台实施规划", "规划图表、筛选、成员视图与教师驾驶舱的拆解。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusWeeks(4), weeksAgoAt(5, DayOfWeek.FRIDAY, 9, 0), weeksAgoAt(4, DayOfWeek.TUESDAY, 17, 45));
    TaskEntity planHeatmap = createTask(project, planning, planningRoot, 0, "热力图与趋势图拆解", "明确全部/本周/本月/自定义的数据聚合方式。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusWeeks(4), weeksAgoAt(5, DayOfWeek.FRIDAY, 10, 0), weeksAgoAt(4, DayOfWeek.MONDAY, 15, 20));
    TaskEntity planTeacher = createTask(project, planning, planningRoot, 1, "教师总结总览规划", "梳理课程 chips、项目榜和学生榜的结构。", TaskStatus.DONE, TaskPriority.MEDIUM, users.sarah, LocalDate.now().minusWeeks(4), weeksAgoAt(5, DayOfWeek.SATURDAY, 11, 0), weeksAgoAt(4, DayOfWeek.TUESDAY, 12, 0));
    TaskEntity planSeed = createTask(project, planning, planningRoot, 2, "演示数据重建设计", "确定需要真实补齐的课程、项目、里程碑、仓库与日志。", TaskStatus.DONE, TaskPriority.HIGH, users.xulaoliu, LocalDate.now().minusWeeks(4), weeksAgoAt(5, DayOfWeek.SUNDAY, 14, 0), weeksAgoAt(4, DayOfWeek.WEDNESDAY, 16, 30));

    TaskEntity frontendRoot = createTask(project, development, null, 0, "前端工作台重构", "把项目总结页、教师总结页和项目列表收敛为工作台体验。", TaskStatus.DONE, TaskPriority.HIGH, users.sarah, LocalDate.now().plusDays(4), weeksAgoAt(4, DayOfWeek.THURSDAY, 10, 30), daysAgoAt(6, 20, 15));
    TaskEntity frontendProject = createTask(project, development, frontendRoot, 0, "项目总结页图表布局", "完成 KPI、点阵图、趋势图、构成图和原始日志区。", TaskStatus.DONE, TaskPriority.HIGH, users.sarah, LocalDate.now().minusDays(6), weeksAgoAt(4, DayOfWeek.FRIDAY, 10, 0), daysAgoAt(8, 18, 40));
    TaskEntity frontendTeacher = createTask(project, development, frontendRoot, 1, "教师总结总览页面", "补齐课程筛选、项目榜与学生榜对比。", TaskStatus.DONE, TaskPriority.HIGH, users.sarah, LocalDate.now().minusDays(4), weeksAgoAt(3, DayOfWeek.MONDAY, 14, 0), daysAgoAt(7, 19, 10));

    TaskEntity workflowRoot = createTask(project, development, null, 1, "任务树与阶段推进联调", "打通父子任务、里程碑手动完成与项目进度重算。", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, users.alex, LocalDate.now().plusDays(6), weeksAgoAt(3, DayOfWeek.TUESDAY, 9, 30), null);
    TaskEntity workflowDone = createTask(project, development, workflowRoot, 0, "父任务完成按钮校验", "确保下级未完成时不能误完成父任务。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusDays(3), weeksAgoAt(3, DayOfWeek.TUESDAY, 10, 0), daysAgoAt(5, 17, 50));
    TaskEntity workflowCreate = createTask(project, development, workflowRoot, 1, "子任务创建链路修复", "从里程碑和任务节点新建时正确预填父节点。", TaskStatus.DONE, TaskPriority.HIGH, users.alex, LocalDate.now().minusDays(2), weeksAgoAt(3, DayOfWeek.WEDNESDAY, 10, 30), daysAgoAt(4, 16, 20));
    TaskEntity workflowProgress = createTask(project, development, workflowRoot, 2, "递归加权进度对账", "核对里程碑权重、节点自身份额与树形递归进度。", TaskStatus.REVIEW, TaskPriority.HIGH, users.xulaoliu, LocalDate.now().plusDays(2), weeksAgoAt(2, DayOfWeek.THURSDAY, 13, 0), null);

    TaskEntity demoRoot = createTask(project, development, null, 2, "演示数据重建", "把旧示例数据替换成真实课程/项目/总结演示数据。", TaskStatus.TODO, TaskPriority.HIGH, users.xulaoliu, LocalDate.now().plusDays(8), weeksAgoAt(1, DayOfWeek.MONDAY, 10, 20), null);
    TaskEntity demoReset = createTask(project, development, demoRoot, 0, "本地 reset seed 开关", "新增 OFF / ENSURE_DEMO / RESET_DEMO 三种模式。", TaskStatus.TODO, TaskPriority.HIGH, users.xulaoliu, LocalDate.now().plusDays(4), weeksAgoAt(1, DayOfWeek.MONDAY, 10, 40), null);
    TaskEntity demoHistory = createTask(project, development, demoRoot, 1, "回填总结历史日志", "按 6~8 周构建访问、任务、文件、作业与 Git 事件。", TaskStatus.TODO, TaskPriority.HIGH, users.alex, LocalDate.now().plusDays(7), weeksAgoAt(1, DayOfWeek.TUESDAY, 15, 30), null);

    TaskEntity acceptRoot = createTask(project, acceptance, null, 0, "课程验收与演示包", "整理最终演示、交付说明与复盘材料。", TaskStatus.TODO, TaskPriority.MEDIUM, users.alex, LocalDate.now().plusWeeks(2), daysAgoAt(1, 10, 0), null);

    fixture.tasks.addAll(List.of(
        ideationRoot, painPoint, interview, benchmark,
        blueprintRoot, overviewWireframe, taskBlueprint, dataModel,
        planningRoot, planHeatmap, planTeacher, planSeed,
        frontendRoot, frontendProject, frontendTeacher,
        workflowRoot, workflowDone, workflowCreate, workflowProgress,
        demoRoot, demoReset, demoHistory,
        acceptRoot));

    createTaskComment(workflowProgress, users.xulaoliu, "权重模型已经重新核对一遍，剩下需要把节点自身份额补进总进度。", daysAgoAt(3, 20, 0));
    createTaskComment(workflowProgress, users.alex, "我今天会再对一遍项目页和团队页显示出来的百分比。", daysAgoAt(2, 9, 30));
    createTaskComment(demoRoot, users.alex, "这次示例数据需要覆盖总结页和教师页两个视角，不能只是补几个任务。", daysAgoAt(1, 15, 10));

    DiscussionPostEntity postHeatmap = createDiscussionPost(project, users.sarah, "总结页点阵图按周还是按天展示？", "建议保留 GitHub 风格按天点阵，再配合本周/月趋势图。", DiscussionCategory.GENERAL, DiscussionStatus.OPEN, daysAgoAt(12, 13, 20));
    DiscussionReplyEntity replyHeatmap1 = createDiscussionReply(postHeatmap, users.alex, "按天更直观，时间筛选切换时再聚合。", daysAgoAt(11, 9, 15));
    DiscussionReplyEntity replyHeatmap2 = createDiscussionReply(postHeatmap, users.teacher, "课堂演示时按天更好讲，别做得太复杂。", daysAgoAt(10, 18, 0));
    linkDiscussionTask(postHeatmap, frontendProject, daysAgoAt(10, 18, 5));

    DiscussionPostEntity postProgress = createDiscussionPost(project, users.alex, "父任务完成规则需要手动还是自动？", "当前更倾向手动完成，但必须在所有子任务完成后才能点。", DiscussionCategory.TASK_ASSIGNMENT, DiscussionStatus.CLOSED, daysAgoAt(9, 14, 40));
    DiscussionReplyEntity replyProgress1 = createDiscussionReply(postProgress, users.xulaoliu, "同意手动完成，这样进度条才不会提前满。", daysAgoAt(9, 16, 10));
    linkDiscussionTask(postProgress, workflowRoot, daysAgoAt(9, 16, 30));
    fixture.discussionPosts.addAll(List.of(postHeatmap, postProgress));
    fixture.discussionReplies.addAll(List.of(replyHeatmap1, replyHeatmap2, replyProgress1));

    DocumentEntity brief = createNoteDocument(project, "需求澄清纪要", "# 需求澄清\n\n- 总结页改成图表工作台\n- 任务树支持父子层级\n- 贡献榜和成员视图同页切换", weeksAgoAt(4, DayOfWeek.FRIDAY, 18, 10));
    DocumentVersionEntity briefV1 = createDocumentVersion(brief, users.alex, "v1 需求纪要", "# 需求澄清\n\n- 初版把周报升级成总结\n- 增加图表和排行榜", weeksAgoAt(4, DayOfWeek.FRIDAY, 18, 20));
    DocumentVersionEntity briefV2 = createDocumentVersion(brief, users.sarah, "v2 结构收口", "# 需求澄清\n\n- 项目页、团队页、教师页统一成总结语义\n- 页面更像工作台而不是说明文档", daysAgoAt(13, 20, 10));

    DocumentEntity deck = createOfficeDocument(project, "阶段演示稿", "pptx", officeTemplate("pptx"), daysAgoAt(14, 10, 0));
    FileAssetEntity pptV1 = fileAssetRepository.findById(deck.getFileAssetId()).orElseThrow();
    FileAssetEntity pptV2 = createFileAsset(FileOwnerType.DOCUMENT, deck.getId(), "阶段演示稿-v2.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", officeTemplate("pptx"), daysAgoAt(3, 11, 0));
    deck.setFileAssetId(pptV2.getId());
    documentRepository.save(deck);
    touch("documents", deck.getId(), daysAgoAt(14, 10, 0), daysAgoAt(3, 11, 0));
    DocumentVersionEntity deckV1 = createDocumentVersion(deck, users.sarah, "中期演示版", null, pptV1.getId(), daysAgoAt(14, 10, 15));
    DocumentVersionEntity deckV2 = createDocumentVersion(deck, users.sarah, "课程彩排版", null, pptV2.getId(), daysAgoAt(3, 11, 15));
    fixture.documents.addAll(List.of(brief, deck));
    fixture.documentVersions.addAll(List.of(briefV1, briefV2, deckV1, deckV2));

    FileAssetEntity taskAttachment = createFileAsset(FileOwnerType.TASK, workflowProgress.getId(), "progress-reconciliation.md", "text/markdown", textBytes("# 进度对账\n\n- 里程碑权重 1/1/1/5/2\n- 节点自身也要占份额\n"), daysAgoAt(2, 16, 0));
    insertFileUploadedEvent(project, users.xulaoliu, taskAttachment, "TASK", workflowProgress.getId(), daysAgoAt(2, 16, 0));
    FileAssetEntity discussionAttachment = createFileAsset(FileOwnerType.DISCUSSION_POST, postHeatmap.getId(), "heatmap-sketch.png", "image/png", textBytes("fake-png-binary"), daysAgoAt(11, 9, 50));
    insertFileUploadedEvent(project, users.sarah, discussionAttachment, "DISCUSSION_POST", postHeatmap.getId(), daysAgoAt(11, 9, 50));

    fixture.gitCommits.addAll(createRepositoryHistory(project, users, List.of(
        new GitCommitSeed("main", users.alex, weeksAgoAt(4, DayOfWeek.THURSDAY, 16, 20), "feat: scaffold summary workbench shell", 180, 12, Map.of(
            "README.md", "# EduCollab 总结工作台\n\n用于课程协作项目的总结与任务演示。\n",
            "frontend/src/screens/projects/detail/ProjectReportsPage.tsx", "export function ProjectReportsPage() {\n  return 'summary';\n}\n",
            "docs/summary-workbench.md", "## Summary\n\n- heatmap\n- trend\n- leaderboard\n")),
        new GitCommitSeed("main", users.sarah, weeksAgoAt(3, DayOfWeek.MONDAY, 18, 0), "feat: add teacher summary overview shell", 220, 18, Map.of(
            "frontend/src/screens/teacher/TeacherContributionsPage.tsx", "export function TeacherContributionsPage() {\n  return 'teacher-summary';\n}\n",
            "frontend/src/components/summary/SummaryWidgets.tsx", "export function SummaryHeatmapCard() { return null }\nexport function SummaryTrendCard() { return null }\n")),
        new GitCommitSeed("main", users.alex, weeksAgoAt(2, DayOfWeek.WEDNESDAY, 20, 10), "feat: wire summary filters and member switch", 160, 24, Map.of(
            "frontend/src/lib/project-reporting.ts", "export const RANGES = ['ALL','WEEK','MONTH','CUSTOM']\n",
            "frontend/src/screens/projects/detail/ProjectReportsPage.tsx", "export function ProjectReportsPage() {\n  return 'member-switch';\n}\n")),
        new GitCommitSeed("main", users.xulaoliu, daysAgoAt(8, 21, 0), "fix: tighten milestone delete permissions", 90, 16, Map.of(
            "backend/src/main/java/com/educollab/service/WorkspaceService.java", "// milestone permission guard\n",
            "backend/src/main/java/com/educollab/controller/ProjectController.java", "// delete milestone\n")),
        new GitCommitSeed("main", users.alex, daysAgoAt(5, 18, 30), "feat: support deleting leaf tasks", 110, 22, Map.of(
            "backend/src/main/java/com/educollab/controller/TaskController.java", "// delete task endpoint\n",
            "frontend/src/components/ProjectDetail/Tasks.tsx", "// delete action button\n")),
        new GitCommitSeed("main", users.sarah, daysAgoAt(2, 22, 10), "feat: polish summary charts and weekly digest", 140, 20, Map.of(
            "frontend/src/components/summary/SummaryWidgets.tsx", "// heatmap + digest widgets\n",
            "frontend/src/screens/projects/detail/ProjectReportsPage.tsx", "// timeline and digest\n"))
    ), List.of(
        new BranchSeed("feat/teacher-summary-drilldown", users.sarah, daysAgoAt(4, 11, 30), "feat: prepare teacher drilldown branch", 70, 5, Map.of(
            "frontend/src/screens/teacher/TeacherContributionsPage.tsx", "// branch draft for drilldown\n")),
        new BranchSeed("fix/task-permission-guards", users.alex, daysAgoAt(3, 15, 20), "fix: harden task permission guards", 55, 7, Map.of(
            "backend/src/main/java/com/educollab/service/WorkspaceService.java", "// branch patch\n"))
    )));

    createMergeRequest(project, "feat: teacher summary drilldown", "feat/teacher-summary-drilldown", "main", MergeRequestStatus.OPEN, daysAgoAt(3, 16, 10));
    createMergeRequest(project, "fix: task permission guards", "fix/task-permission-guards", "main", MergeRequestStatus.MERGED, daysAgoAt(2, 10, 40));
    createRelease(project, "v0.3.0", "阶段联调包", "包含总结工作台、任务树联调与权限修正。", daysAgoAt(2, 19, 30));

    insertProjectVisitSeries(project, Map.of(
        users.alex, List.of(daysAgoAt(27, 10, 0), daysAgoAt(24, 14, 0), daysAgoAt(20, 20, 0), daysAgoAt(17, 10, 0), daysAgoAt(15, 16, 0), daysAgoAt(12, 11, 0), daysAgoAt(10, 9, 0), daysAgoAt(9, 21, 0), daysAgoAt(7, 10, 0), daysAgoAt(6, 14, 0), daysAgoAt(5, 20, 0), daysAgoAt(4, 9, 0), daysAgoAt(3, 11, 0), daysAgoAt(2, 16, 0), daysAgoAt(1, 21, 0), daysAgoAt(0, 9, 0), daysAgoAt(0, 15, 0), daysAgoAt(0, 21, 0)),
        users.sarah, List.of(daysAgoAt(26, 11, 0), daysAgoAt(23, 15, 0), daysAgoAt(18, 13, 0), daysAgoAt(14, 18, 0), daysAgoAt(11, 10, 0), daysAgoAt(8, 15, 0), daysAgoAt(5, 11, 0), daysAgoAt(2, 10, 0), daysAgoAt(0, 13, 0)),
        users.xulaoliu, List.of(daysAgoAt(21, 19, 0), daysAgoAt(16, 10, 0), daysAgoAt(13, 15, 0), daysAgoAt(9, 12, 0), daysAgoAt(4, 18, 0), daysAgoAt(1, 10, 0))),
        List.of("overview", "tasks", "discussions", "reports", "repository"));

    insertLeafTaskCompletionEvents(fixture);
    insertTaskStatusEvent(project, users.alex, workflowProgress, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, daysAgoAt(2, 21, 10));
    insertTaskStatusEvent(project, users.alex, workflowProgress, TaskStatus.REVIEW, TaskStatus.IN_PROGRESS, daysAgoAt(1, 9, 20));
    return fixture;
  }

  private ProjectFixture createCompletedProject(DemoUsers users, CourseEntity course, GroupTaskEntity groupTask, TeamEntity team) {
    ProjectEntity project = createProject(
        "智能批注助教",
        "面向课程点评场景的智能批注与反馈助手，已完成整体验收。",
        ProjectType.CODE,
        ProjectStatus.COMPLETED,
        course,
        groupTask,
        team,
        LocalDate.now().minusDays(7),
        weeksAgoAt(7, DayOfWeek.THURSDAY, 14, 0));
    addProjectMembers(project, users.liam, users.liam, users.yuki, users.chenhao, users.teacher);
    ProjectFixture fixture = new ProjectFixture(project, team, course);

    List<ProjectMilestoneEntity> milestones = List.of(
        createMilestone(project, "构思阶段", "确定课堂批注与反馈的核心场景。", 0, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(7, DayOfWeek.FRIDAY, 9, 0), weeksAgoAt(6, DayOfWeek.MONDAY, 17, 0)),
        createMilestone(project, "蓝图搭建", "梳理交互流与批注卡片结构。", 1, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(6, DayOfWeek.TUESDAY, 9, 0), weeksAgoAt(5, DayOfWeek.TUESDAY, 18, 0)),
        createMilestone(project, "项目规划", "明确模型策略、教师视图和交付结构。", 2, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(5, DayOfWeek.WEDNESDAY, 10, 0), weeksAgoAt(4, DayOfWeek.WEDNESDAY, 18, 30)),
        createMilestone(project, "开发实现", "完成批注面板、教师反馈和文档联动。", 3, 5, ProjectMilestoneStatus.DONE, weeksAgoAt(4, DayOfWeek.THURSDAY, 10, 30), daysAgoAt(15, 20, 30)),
        createMilestone(project, "验收交付", "完成课程验收、演示材料和复盘。", 4, 2, ProjectMilestoneStatus.DONE, daysAgoAt(14, 9, 0), daysAgoAt(9, 18, 0))
    );
    fixture.milestones.addAll(milestones);

    TaskEntity root = createTask(project, milestones.get(3), null, 0, "完成教师批注面板", "交付用于课堂点评的批注面板与意见整理视图。", TaskStatus.DONE, TaskPriority.HIGH, users.liam, LocalDate.now().minusDays(20), weeksAgoAt(4, DayOfWeek.THURSDAY, 11, 0), daysAgoAt(16, 16, 0));
    TaskEntity child1 = createTask(project, milestones.get(3), root, 0, "批注卡片与聚合摘要", "支持按学生和按文档汇总批注。", TaskStatus.DONE, TaskPriority.HIGH, users.yuki, LocalDate.now().minusDays(22), weeksAgoAt(4, DayOfWeek.FRIDAY, 10, 0), daysAgoAt(17, 17, 0));
    TaskEntity child2 = createTask(project, milestones.get(3), root, 1, "教师反馈模板", "支持一键套用课堂反馈模板。", TaskStatus.DONE, TaskPriority.MEDIUM, users.chenhao, LocalDate.now().minusDays(18), weeksAgoAt(3, DayOfWeek.MONDAY, 10, 0), daysAgoAt(15, 16, 20));
    TaskEntity accept = createTask(project, milestones.get(4), null, 0, "准备最终演示与交付", "输出最终演示稿、说明文档与录屏。", TaskStatus.DONE, TaskPriority.MEDIUM, users.liam, LocalDate.now().minusDays(9), daysAgoAt(12, 10, 0), daysAgoAt(9, 17, 0));
    fixture.tasks.addAll(List.of(root, child1, child2, accept));

    DiscussionPostEntity post = createDiscussionPost(project, users.liam, "验收前还需要补哪些材料？", "目前演示稿、录屏和交付清单都已齐全。", DiscussionCategory.RESOURCES, DiscussionStatus.CLOSED, daysAgoAt(11, 15, 0));
    fixture.discussionPosts.add(post);
    fixture.discussionReplies.add(createDiscussionReply(post, users.teacher, "材料已经完整，可以进入最终验收。", daysAgoAt(10, 10, 0)));

    DocumentEntity deliverable = createNoteDocument(project, "最终交付说明", "# 最终交付\n\n- 教师端批注面板\n- 课堂反馈模板\n- 演示录屏与使用说明", daysAgoAt(12, 11, 30));
    fixture.documents.add(deliverable);
    fixture.documentVersions.add(createDocumentVersion(deliverable, users.liam, "交付版", "# 最终交付\n\n全部材料已归档。", daysAgoAt(10, 9, 30)));

    FileAssetEntity zip = createFileAsset(FileOwnerType.PROJECT, project.getId(), "final-deliverables.zip", "application/zip", textBytes("zip-binary"), daysAgoAt(9, 18, 10));
    insertFileUploadedEvent(project, users.liam, zip, "PROJECT", project.getId(), daysAgoAt(9, 18, 10));

    fixture.gitCommits.addAll(createRepositoryHistory(project, users, List.of(
        new GitCommitSeed("main", users.liam, weeksAgoAt(5, DayOfWeek.THURSDAY, 16, 0), "feat: initialize annotation assistant", 140, 10, Map.of("README.md", "# 智能批注助教\n", "src/annotation.ts", "export const annotation = true\n")),
        new GitCommitSeed("main", users.yuki, weeksAgoAt(3, DayOfWeek.TUESDAY, 19, 0), "feat: add teacher feedback templates", 120, 14, Map.of("src/templates.ts", "export const templates = []\n")),
        new GitCommitSeed("main", users.liam, daysAgoAt(10, 20, 0), "chore: finalize delivery package", 60, 8, Map.of("docs/delivery.md", "done\n"))
    ), List.of()));
    createRelease(project, "v1.0.0", "最终交付", "课程验收通过后的最终交付版本。", daysAgoAt(9, 18, 20));
    insertProjectVisitSeries(project, Map.of(
        users.liam, List.of(daysAgoAt(20, 10, 0), daysAgoAt(16, 11, 0), daysAgoAt(12, 15, 0), daysAgoAt(9, 10, 0)),
        users.yuki, List.of(daysAgoAt(19, 14, 0), daysAgoAt(15, 16, 0), daysAgoAt(10, 9, 0))),
        List.of("overview", "tasks", "reports"));
    insertLeafTaskCompletionEvents(fixture);
    return fixture;
  }

  private ProjectFixture createPlanningProject(DemoUsers users, CourseEntity course, GroupTaskEntity groupTask, TeamEntity team) {
    ProjectEntity project = createProject(
        "课堂知识地图",
        "面向课程复盘的知识地图与阶段资料整理项目，当前处于早期规划。",
        ProjectType.NON_CODE,
        ProjectStatus.ACTIVE,
        course,
        groupTask,
        team,
        LocalDate.now().plusWeeks(3),
        weeksAgoAt(6, DayOfWeek.MONDAY, 15, 20));
    addProjectMembers(project, users.mia, users.mia, users.noah, users.teacher);
    ProjectFixture fixture = new ProjectFixture(project, team, course);
    ProjectMilestoneEntity ideation = createMilestone(project, "构思阶段", "明确知识地图的目标范围与展示层级。", 0, 1, ProjectMilestoneStatus.ACTIVE, weeksAgoAt(2, DayOfWeek.MONDAY, 9, 0), null);
    ProjectMilestoneEntity blueprint = createMilestone(project, "蓝图搭建", "建立内容模块与资料索引结构。", 1, 1, ProjectMilestoneStatus.LOCKED, null, null);
    fixture.milestones.addAll(List.of(ideation, blueprint));
    TaskEntity research = createTask(project, ideation, null, 0, "梳理课程知识点范围", "先确认课程知识点的章节粒度和展示顺序。", TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, users.mia, LocalDate.now().plusWeeks(1), daysAgoAt(12, 10, 0), null);
    TaskEntity collect = createTask(project, ideation, research, 0, "收集往届资料与课堂讲义", "先整理已有资料作为知识地图原料。", TaskStatus.TODO, TaskPriority.MEDIUM, users.noah, LocalDate.now().plusDays(6), daysAgoAt(11, 15, 0), null);
    fixture.tasks.addAll(List.of(research, collect));
    DiscussionPostEntity post = createDiscussionPost(project, users.mia, "知识地图展示先做网页还是文档？", "目前倾向先做文档版，再整理成网页。", DiscussionCategory.GENERAL, DiscussionStatus.OPEN, daysAgoAt(7, 13, 40));
    fixture.discussionPosts.add(post);
    fixture.documents.add(createNoteDocument(project, "前期研究清单", "# 前期研究\n\n- 课程章节结构\n- 资料来源\n- 展示方式", daysAgoAt(6, 17, 10)));
    insertProjectVisitSeries(project, Map.of(users.mia, List.of(daysAgoAt(6, 10, 0), daysAgoAt(2, 18, 0))), List.of("overview", "tasks"));
    return fixture;
  }

  private ProjectFixture createAuxProject(DemoUsers users, CourseEntity course, GroupTaskEntity groupTask, TeamEntity team) {
    ProjectEntity project = createProject(
        "移动端学习助手原型",
        "围绕课前预习与课后复盘，输出一套移动端交互原型与研究总结。",
        ProjectType.NON_CODE,
        ProjectStatus.ACTIVE,
        course,
        groupTask,
        team,
        LocalDate.now().plusWeeks(1),
        weeksAgoAt(5, DayOfWeek.THURSDAY, 14, 10));
    addProjectMembers(project, users.yuki, users.yuki, users.alex, users.mia, users.teacher);
    ProjectFixture fixture = new ProjectFixture(project, team, course);
    ProjectMilestoneEntity ideation = createMilestone(project, "构思阶段", "明确移动端学习助手的角色与主场景。", 0, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(5, DayOfWeek.THURSDAY, 15, 0), weeksAgoAt(4, DayOfWeek.MONDAY, 18, 0));
    ProjectMilestoneEntity blueprint = createMilestone(project, "蓝图搭建", "输出信息架构、线框图和交互流。", 1, 1, ProjectMilestoneStatus.DONE, weeksAgoAt(4, DayOfWeek.TUESDAY, 10, 0), weeksAgoAt(3, DayOfWeek.TUESDAY, 18, 0));
    ProjectMilestoneEntity planning = createMilestone(project, "项目规划", "进入原型迭代与可用性验证。", 2, 1, ProjectMilestoneStatus.ACTIVE, weeksAgoAt(3, DayOfWeek.WEDNESDAY, 9, 0), null);
    fixture.milestones.addAll(List.of(ideation, blueprint, planning));

    TaskEntity protoRoot = createTask(project, planning, null, 0, "移动端原型迭代", "围绕预习、任务提醒与复盘流程优化交互。", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, users.yuki, LocalDate.now().plusDays(5), weeksAgoAt(3, DayOfWeek.WEDNESDAY, 10, 0), null);
    TaskEntity protoFlow = createTask(project, planning, protoRoot, 0, "预习流线框图", "明确首页、课程页、任务提醒页之间的流转。", TaskStatus.DONE, TaskPriority.MEDIUM, users.mia, LocalDate.now().minusDays(4), weeksAgoAt(3, DayOfWeek.THURSDAY, 10, 30), daysAgoAt(6, 14, 0));
    TaskEntity protoUsability = createTask(project, planning, protoRoot, 1, "可用性访谈记录", "完成 3 位同学的试用访谈。", TaskStatus.REVIEW, TaskPriority.MEDIUM, users.alex, LocalDate.now().plusDays(2), weeksAgoAt(2, DayOfWeek.TUESDAY, 15, 30), null);
    fixture.tasks.addAll(List.of(protoRoot, protoFlow, protoUsability));

    DiscussionPostEntity post = createDiscussionPost(project, users.yuki, "原型首页信息量是不是太大？", "目前首屏包含课程、待办和复盘入口，担心过载。", DiscussionCategory.HELP_NEEDED, DiscussionStatus.OPEN, daysAgoAt(5, 16, 0));
    fixture.discussionPosts.add(post);
    fixture.discussionReplies.add(createDiscussionReply(post, users.alex, "建议先保留待办和课程卡，复盘入口放二级页。", daysAgoAt(4, 10, 10)));
    DocumentEntity protoDoc = createNoteDocument(project, "访谈与原型结论", "# 访谈结论\n\n- 首屏需要更聚焦\n- 任务提醒要更明确\n", daysAgoAt(5, 17, 10));
    fixture.documents.add(protoDoc);
    fixture.documentVersions.add(createDocumentVersion(protoDoc, users.alex, "首轮访谈总结", "# 访谈结论\n\n整理完成。", daysAgoAt(4, 10, 30)));

    insertProjectVisitSeries(project, Map.of(
        users.yuki, List.of(daysAgoAt(14, 10, 0), daysAgoAt(9, 10, 0), daysAgoAt(5, 16, 0), daysAgoAt(2, 11, 0)),
        users.alex, List.of(daysAgoAt(13, 15, 0), daysAgoAt(6, 17, 0), daysAgoAt(3, 14, 0))),
        List.of("overview", "reports", "tasks"));
    insertLeafTaskCompletionEvents(fixture);
    return fixture;
  }

  private void createAssignmentsAndSubmissions(
      DemoUsers users,
      CourseEntity mainCourse,
      CourseEntity auxCourse,
      ProjectFixture mainProject,
      ProjectFixture completedProject,
      ProjectFixture planningProject,
      ProjectFixture uxProject) {
    AssignmentEntity proposal = createAssignment(mainCourse, mainProject.project, "项目立项书", "提交选题背景、目标用户、核心价值与分工。", "https://educollab.local/submission/proposal", LocalDate.now().minusWeeks(5), AssignmentStatus.CLOSED, weeksAgoAt(7, DayOfWeek.MONDAY, 9, 0));
    AssignmentEntity midterm = createAssignment(mainCourse, mainProject.project, "中期演示", "提交当前演示包、项目链接与本周总结。", "https://educollab.local/submission/midterm", LocalDate.now().minusWeeks(2), AssignmentStatus.CLOSED, weeksAgoAt(4, DayOfWeek.MONDAY, 10, 0));
    AssignmentEntity finalPack = createAssignment(mainCourse, mainProject.project, "最终交付包", "提交最终代码、文档、录屏与项目总结。", "https://educollab.local/submission/final", LocalDate.now().plusDays(5), AssignmentStatus.OPEN, weeksAgoAt(1, DayOfWeek.MONDAY, 10, 0));
    AssignmentEntity uxReview = createAssignment(auxCourse, uxProject.project, "交互原型评审", "提交高保真原型链接、可用性结论与阶段总结。", "https://educollab.local/submission/ux-review", LocalDate.now().plusDays(4), AssignmentStatus.OPEN, weeksAgoAt(2, DayOfWeek.MONDAY, 11, 0));

    createAssignmentSubmission(proposal, users.alex, mainProject.project, null, "完成立项书初稿并附带调研结论。", "https://educollab.local/submission/proposal/alex", AssignmentSubmissionStatus.GRADED, 93, "问题定义清晰，后续请继续补充竞品拆解。", weeksAgoAt(6, DayOfWeek.MONDAY, 20, 0), weeksAgoAt(5, DayOfWeek.MONDAY, 10, 0), 1, List.of(
        new FileSeed("proposal-alex.pdf", "application/pdf", textBytes("proposal pdf"), weeksAgoAt(6, DayOfWeek.MONDAY, 20, 0))));
    createAssignmentSubmission(proposal, users.sarah, mainProject.project, null, "提交了结构草图与需求概览。", "https://educollab.local/submission/proposal/sarah", AssignmentSubmissionStatus.GRADED, 91, "结构思路不错，注意把角色视角再拆清楚。", weeksAgoAt(6, DayOfWeek.MONDAY, 20, 10), weeksAgoAt(5, DayOfWeek.MONDAY, 10, 10), 1, List.of());
    createAssignmentSubmission(proposal, users.liam, completedProject.project, null, "提交了智能批注项目立项书。", "https://educollab.local/submission/proposal/liam", AssignmentSubmissionStatus.GRADED, 95, "执行路径明确，继续保持。", weeksAgoAt(6, DayOfWeek.MONDAY, 20, 20), weeksAgoAt(5, DayOfWeek.MONDAY, 10, 20), 1, List.of());
    createAssignmentSubmission(proposal, users.mia, planningProject.project, null, "提交课堂知识地图的方向说明。", "https://educollab.local/submission/proposal/mia", AssignmentSubmissionStatus.RETURNED, null, "请把目标用户和展示形式再说得更具体。", weeksAgoAt(6, DayOfWeek.MONDAY, 20, 30), weeksAgoAt(5, DayOfWeek.TUESDAY, 9, 40), 1, List.of());

    createAssignmentSubmission(midterm, users.alex, mainProject.project, mainProject.documents.get(1), "附上当前总结页、任务树和演示稿。", "https://educollab.local/submission/midterm/alex", AssignmentSubmissionStatus.GRADED, 96, "中期完成度高，继续补齐防刷和教师总览。", daysAgoAt(12, 21, 10), daysAgoAt(10, 9, 10), 2, List.of(
        new FileSeed("midterm-demo-notes.md", "text/markdown", textBytes("midterm notes"), daysAgoAt(12, 21, 10))));
    createAssignmentSubmission(midterm, users.sarah, mainProject.project, mainProject.documents.get(1), "提交图表工作台演示与结构说明。", "https://educollab.local/submission/midterm/sarah", AssignmentSubmissionStatus.GRADED, 95, "图表信息层级很好，继续保持。", daysAgoAt(12, 21, 20), daysAgoAt(10, 9, 30), 2, List.of());
    createAssignmentSubmission(midterm, users.liam, completedProject.project, null, "提交批注助教的中期材料。", "https://educollab.local/submission/midterm/liam", AssignmentSubmissionStatus.GRADED, 94, "进度稳定，验收前再补交付文档。", daysAgoAt(18, 20, 0), daysAgoAt(16, 9, 0), 1, List.of());

    createAssignmentSubmission(finalPack, users.alex, mainProject.project, mainProject.documents.get(0), "正在准备最终交付包，已上传当前阶段材料。", "https://educollab.local/submission/final/alex", AssignmentSubmissionStatus.SUBMITTED, null, null, daysAgoAt(1, 20, 30), null, 1, List.of(
        new FileSeed("final-outline.txt", "text/plain", textBytes("final outline"), daysAgoAt(1, 20, 30))));
    createAssignmentSubmission(finalPack, users.sarah, mainProject.project, mainProject.documents.get(1), "提交了最终演示稿和页面说明。", "https://educollab.local/submission/final/sarah", AssignmentSubmissionStatus.SUBMITTED, null, null, daysAgoAt(1, 20, 45), null, 1, List.of());
    createAssignmentSubmission(uxReview, users.yuki, uxProject.project, uxProject.documents.get(0), "已附上原型链接和访谈摘要。", "https://educollab.local/submission/ux/yuki", AssignmentSubmissionStatus.SUBMITTED, null, null, daysAgoAt(2, 18, 10), null, 1, List.of());
    createAssignmentSubmission(uxReview, users.alex, uxProject.project, uxProject.documents.get(0), "提交移动端预习流程的说明。", "https://educollab.local/submission/ux/alex", AssignmentSubmissionStatus.GRADED, 92, "结构完整，建议把访谈结论再浓缩。", daysAgoAt(5, 20, 0), daysAgoAt(3, 9, 30), 1, List.of());
  }

  private void createNotifications(
      DemoUsers users,
      CourseEntity course,
      ProjectFixture mainProject,
      ProjectFixture completedProject,
      ProjectFixture planningProject,
      ProjectFixture uxProject) {
    createNotification(users.alex, "任务进入 Review", "任务【递归加权进度对账】已经进入 Review，请尽快处理反馈。", NotificationType.TASK, NotificationSourceType.TASK, findTaskId(mainProject, "递归加权进度对账"), "/app/projects/" + mainProject.project.getId() + "/tasks", mainProject.project.getName(), daysAgoAt(2, 21, 20), false);
    createNotification(users.sarah, "总结页图表已更新", "项目【EduCollab 总结工作台】的总结页图表组件已完成一轮更新。", NotificationType.DOCUMENT, NotificationSourceType.PROJECT, mainProject.project.getId(), "/app/projects/" + mainProject.project.getId() + "/reports", mainProject.project.getName(), daysAgoAt(1, 18, 0), false);
    createNotification(users.liam, "项目验收通过", "项目【智能批注助教】已完成最终验收，可归档交付材料。", NotificationType.SYSTEM, NotificationSourceType.PROJECT, completedProject.project.getId(), "/app/projects/" + completedProject.project.getId() + "/overview", completedProject.project.getName(), daysAgoAt(9, 18, 30), true);
    createNotification(users.mia, "研究任务即将到期", "任务【收集往届资料与课堂讲义】将在 6 天后到期。", NotificationType.TASK, NotificationSourceType.TASK, findTaskId(planningProject, "收集往届资料与课堂讲义"), "/app/projects/" + planningProject.project.getId() + "/tasks", planningProject.project.getName(), daysAgoAt(0, 9, 10), false);
    createNotification(users.yuki, "作业已发布", "课程【" + course.getName() + "】发布了新作业【最终交付包】。", NotificationType.SYSTEM, NotificationSourceType.ASSIGNMENT, null, "/app/classes/" + course.getId() + "/assignments", course.getName(), daysAgoAt(1, 8, 30), false);
    createNotification(users.teacher, "本周总结已生成", "课程总结总览已更新，可以查看项目榜和学生榜。", NotificationType.SYSTEM, NotificationSourceType.SYSTEM, null, "/app/teacher/contributions", "总结总览", daysAgoAt(0, 8, 45), false);
    createNotification(users.alex, "交互原型评审待查看", "项目【" + uxProject.project.getName() + "】有新的访谈结论与评审作业。", NotificationType.DISCUSSION, NotificationSourceType.PROJECT, uxProject.project.getId(), "/app/projects/" + uxProject.project.getId() + "/reports", uxProject.project.getName(), daysAgoAt(2, 18, 20), true);
  }

  private void markProjectStatus(ProjectEntity project, ProjectStatus status, LocalDateTime updatedAt) {
    project.setStatus(status);
    projectRepository.save(project);
    touch("projects", project.getId(), project.getCreatedAt(), updatedAt);
  }

  private UserEntity createUser(String name, String email, UserRole role, String avatarSeed, LocalDateTime createdAt) {
    UserEntity entity = new UserEntity();
    entity.setName(name);
    entity.setEmail(email);
    entity.setRole(role);
    entity.setAvatar("https://picsum.photos/seed/" + avatarSeed + "/100/100");
    entity.setPasswordHash(passwordEncoder.encode("Password123!"));
    userRepository.save(entity);
    touch("users", entity.getId(), createdAt, createdAt.plusMinutes(1));
    return entity;
  }

  private CourseEntity createCourse(String name, String classCode, UserEntity teacher, LocalDateTime createdAt) {
    CourseEntity entity = new CourseEntity();
    entity.setName(name);
    entity.setClassCode(classCode);
    entity.setTeacher(teacher);
    courseRepository.save(entity);
    touch("courses", entity.getId(), createdAt, createdAt.plusMinutes(2));
    return entity;
  }

  private ClassMemberEntity createClassMember(CourseEntity course, UserEntity user, ClassMemberRole role, String joinedVia, LocalDateTime createdAt) {
    ClassMemberEntity entity = new ClassMemberEntity();
    entity.setCourse(course);
    entity.setUser(user);
    entity.setRole(role);
    entity.setJoinedVia(joinedVia);
    classMemberRepository.save(entity);
    touch("class_members", entity.getId(), createdAt, createdAt.plusMinutes(1));
    return entity;
  }

  private GroupTaskEntity createGroupTask(CourseEntity course, UserEntity teacher, String title, String description, Integer minMembers, Integer maxMembers, LocalDate dueDate, LocalDateTime createdAt) {
    GroupTaskEntity entity = new GroupTaskEntity();
    entity.setCourse(course);
    entity.setCreatedBy(teacher);
    entity.setTitle(title);
    entity.setDescription(description);
    entity.setMinMembers(minMembers);
    entity.setMaxMembers(maxMembers);
    entity.setDueDate(dueDate);
    groupTaskRepository.save(entity);
    touch("group_tasks", entity.getId(), createdAt, createdAt.plusMinutes(2));
    return entity;
  }

  private TeamEntity createTeam(CourseEntity course, GroupTaskEntity groupTask, String name, UserEntity leader, Integer groupOrder, TeamStatus status, LocalDateTime createdAt) {
    TeamEntity entity = new TeamEntity();
    entity.setCourse(course);
    entity.setGroupTask(groupTask);
    entity.setName(name);
    entity.setLeader(leader);
    entity.setGroupOrder(groupOrder);
    entity.setSource(TeamSource.COURSE);
    entity.setStatus(status);
    entity.setInviteCode(UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT));
    teamRepository.save(entity);
    touch("teams", entity.getId(), createdAt, createdAt.plusMinutes(1));
    return entity;
  }

  private void addTeamMembers(TeamEntity team, LocalDateTime createdAt, UserEntity... members) {
    int index = 0;
    for (UserEntity member : members) {
      TeamMemberEntity entity = new TeamMemberEntity();
      entity.setTeam(team);
      entity.setUser(member);
      teamMemberRepository.save(entity);
      touch("team_members", entity.getId(), createdAt.plusMinutes(index), createdAt.plusMinutes(index));
      index++;
    }
  }

  private GroupTaskTeamTaskEntity createGroupTaskTeamTask(TeamEntity team, UserEntity assignee, String title, String description, TaskStatus status, LocalDate dueDate, LocalDateTime createdAt) {
    GroupTaskTeamTaskEntity entity = new GroupTaskTeamTaskEntity();
    entity.setTeam(team);
    entity.setAssignee(assignee);
    entity.setTitle(title);
    entity.setDescription(description);
    entity.setStatus(status);
    entity.setDueDate(dueDate);
    groupTaskTeamTaskRepository.save(entity);
    touch("group_task_team_tasks", entity.getId(), createdAt, createdAt.plusMinutes(2));
    return entity;
  }

  private ProjectEntity createProject(String name, String description, ProjectType type, ProjectStatus status, CourseEntity course, GroupTaskEntity groupTask, TeamEntity team, LocalDate dueDate, LocalDateTime createdAt) {
    ProjectEntity entity = new ProjectEntity();
    entity.setName(name);
    entity.setDescription(description);
    entity.setType(type);
    entity.setStatus(status);
    entity.setCourse(course);
    entity.setGroupTask(groupTask);
    entity.setTeam(team);
    entity.setDueDate(dueDate);
    entity.setProgress(0);
    projectRepository.save(entity);
    touch("projects", entity.getId(), createdAt, createdAt.plusMinutes(5));
    insertActivityEvent(entity, team.getLeader(), ProjectActivityEventType.PROJECT_CREATED, "PROJECT", entity.getId(), entity.getName(), 1, null, null, "project-created:" + entity.getId(), detail("status", status.name()), createdAt.plusMinutes(1));
    return entity;
  }

  private void addProjectMembers(ProjectEntity project, UserEntity owner, UserEntity... members) {
    LocalDateTime base = project.getCreatedAt().plusMinutes(10);
    int index = 0;
    for (UserEntity member : members) {
      ProjectMemberEntity entity = new ProjectMemberEntity();
      entity.setProject(project);
      entity.setUser(member);
      entity.setOwnerFlag(Objects.equals(member.getId(), owner.getId()));
      projectMemberRepository.save(entity);
      touch("project_members", entity.getId(), base.plusMinutes(index), base.plusMinutes(index));
      index++;
    }
  }

  private ProjectMilestoneEntity createMilestone(ProjectEntity project, String title, String description, int sortOrder, int weight, ProjectMilestoneStatus status, LocalDateTime activatedAt, LocalDateTime completedAt) {
    ProjectMilestoneEntity entity = new ProjectMilestoneEntity();
    entity.setProject(project);
    entity.setTitle(title);
    entity.setDescription(description);
    entity.setSortOrder(sortOrder);
    entity.setWeight(weight);
    entity.setStatus(status);
    entity.setActivatedAt(activatedAt);
    entity.setCompletedAt(completedAt);
    projectMilestoneRepository.save(entity);
    LocalDateTime createdAt = activatedAt != null ? activatedAt.minusHours(2) : project.getCreatedAt().plusDays(sortOrder + 1);
    touch("project_milestones", entity.getId(), createdAt, completedAt != null ? completedAt : createdAt.plusMinutes(1));
    insertActivityEvent(project, project.getTeam() != null ? project.getTeam().getLeader() : null, ProjectActivityEventType.MILESTONE_CREATED, "MILESTONE", entity.getId(), title, 1, null, null, "milestone-created:" + entity.getId(), detail("weight", weight, "seeded", true), createdAt.plusMinutes(5));
    if (completedAt != null) {
      insertActivityEvent(project, project.getTeam() != null ? project.getTeam().getLeader() : null, ProjectActivityEventType.MILESTONE_COMPLETED, "MILESTONE", entity.getId(), title, 1, null, null, "milestone-completed:" + entity.getId() + ":" + completedAt, detail("weight", weight, "seeded", true), completedAt);
    }
    return entity;
  }

  private TaskEntity createTask(ProjectEntity project, ProjectMilestoneEntity milestone, TaskEntity parentTask, int sortOrder, String title, String description, TaskStatus status, TaskPriority priority, UserEntity assignee, LocalDate dueDate, LocalDateTime createdAt, LocalDateTime completedAt) {
    TaskEntity entity = new TaskEntity();
    entity.setProject(project);
    entity.setMilestone(milestone);
    entity.setParentTask(parentTask);
    entity.setSortOrder(sortOrder);
    entity.setTitle(title);
    entity.setDescription(description);
    entity.setStatus(status);
    entity.setPriority(priority);
    entity.setAssignee(assignee);
    entity.setDueDate(dueDate);
    entity.setCompletedAt(completedAt);
    taskRepository.save(entity);
    touch("tasks", entity.getId(), createdAt, completedAt != null ? completedAt : createdAt.plusMinutes(2));
    insertActivityEvent(project, assignee, ProjectActivityEventType.TASK_CREATED, "TASK", entity.getId(), title, 1, null, null, "task-created:" + entity.getId(), detail("milestoneId", milestone != null ? milestone.getId() : null, "parentTaskId", parentTask != null ? parentTask.getId() : null), createdAt.plusMinutes(1));
    return entity;
  }

  private TaskCommentEntity createTaskComment(TaskEntity task, UserEntity author, String content, LocalDateTime createdAt) {
    TaskCommentEntity entity = new TaskCommentEntity();
    entity.setTask(task);
    entity.setAuthor(author);
    entity.setContent(content);
    taskCommentRepository.save(entity);
    touch("task_comments", entity.getId(), createdAt, createdAt);
    return entity;
  }

  private DiscussionPostEntity createDiscussionPost(ProjectEntity project, UserEntity author, String title, String content, DiscussionCategory category, DiscussionStatus status, LocalDateTime createdAt) {
    DiscussionPostEntity entity = new DiscussionPostEntity();
    entity.setProject(project);
    entity.setAuthor(author);
    entity.setTitle(title);
    entity.setContent(content);
    entity.setCategory(category);
    entity.setStatus(status);
    discussionPostRepository.save(entity);
    touch("discussion_posts", entity.getId(), createdAt, createdAt.plusMinutes(2));
    insertActivityEvent(project, author, ProjectActivityEventType.DISCUSSION_POST_CREATED, "DISCUSSION_POST", entity.getId(), title, 1, null, null, "discussion-post:" + entity.getId(), detail("category", category.name()), createdAt);
    return entity;
  }

  private DiscussionReplyEntity createDiscussionReply(DiscussionPostEntity post, UserEntity author, String content, LocalDateTime createdAt) {
    DiscussionReplyEntity entity = new DiscussionReplyEntity();
    entity.setPost(post);
    entity.setAuthor(author);
    entity.setContent(content);
    discussionReplyRepository.save(entity);
    touch("discussion_replies", entity.getId(), createdAt, createdAt);
    touch("discussion_posts", post.getId(), post.getCreatedAt(), createdAt);
    insertActivityEvent(post.getProject(), author, ProjectActivityEventType.DISCUSSION_REPLY_CREATED, "DISCUSSION_REPLY", entity.getId(), post.getTitle(), 1, null, null, "discussion-reply:" + entity.getId(), detail("postId", post.getId()), createdAt);
    return entity;
  }

  private void linkDiscussionTask(DiscussionPostEntity post, TaskEntity task, LocalDateTime createdAt) {
    DiscussionTaskLinkEntity entity = new DiscussionTaskLinkEntity();
    entity.setPost(post);
    entity.setTask(task);
    discussionTaskLinkRepository.save(entity);
    touch("discussion_task_links", entity.getId(), createdAt, createdAt);
  }

  private DocumentEntity createNoteDocument(ProjectEntity project, String title, String content, LocalDateTime createdAt) {
    DocumentEntity entity = new DocumentEntity();
    entity.setProject(project);
    entity.setTitle(title);
    entity.setExcerpt(excerpt(content));
    entity.setCurrentContent(content);
    entity.setCollabKey("doc-" + UUID.randomUUID());
    entity.setKind(DocumentKind.MARKDOWN);
    documentRepository.save(entity);
    touch("documents", entity.getId(), createdAt, createdAt.plusMinutes(5));
    storageService.syncProjectDocumentNodes(project.getId());
    insertActivityEvent(project, project.getTeam() != null ? project.getTeam().getLeader() : null, ProjectActivityEventType.DOCUMENT_CREATED, "DOCUMENT", entity.getId(), title, 1, null, null, "document-created:" + entity.getId(), detail(), createdAt.plusMinutes(1));
    return entity;
  }

  private DocumentEntity createOfficeDocument(ProjectEntity project, String title, String ext, byte[] initialBytes, LocalDateTime createdAt) {
    DocumentEntity entity = new DocumentEntity();
    entity.setProject(project);
    entity.setTitle(title);
    entity.setExcerpt("");
    entity.setCurrentContent(null);
    entity.setCollabKey("office-" + UUID.randomUUID());
    entity.setKind(DocumentKind.OFFICE);
    entity.setOfficeExt(ext);
    documentRepository.save(entity);
    touch("documents", entity.getId(), createdAt, createdAt.plusMinutes(3));
    FileAssetEntity primaryFile =
        createFileAsset(
            FileOwnerType.DOCUMENT,
            entity.getId(),
            title + "." + ext,
            mimeForOffice(ext),
            initialBytes,
            createdAt.plusMinutes(1));
    updateLong("documents", "file_asset_id", entity.getId(), primaryFile.getId());
    entity.setFileAssetId(primaryFile.getId());
    storageService.syncProjectDocumentNodes(project.getId());
    insertActivityEvent(project, project.getTeam() != null ? project.getTeam().getLeader() : null, ProjectActivityEventType.DOCUMENT_CREATED, "DOCUMENT", entity.getId(), title, 1, null, null, "document-created:" + entity.getId(), detail("kind", "OFFICE"), createdAt.plusMinutes(1));
    return entity;
  }

  private DocumentVersionEntity createDocumentVersion(DocumentEntity document, UserEntity author, String label, String snapshotContent, LocalDateTime createdAt) {
    return createDocumentVersion(document, author, label, snapshotContent, null, createdAt);
  }

  private DocumentVersionEntity createDocumentVersion(DocumentEntity document, UserEntity author, String label, String snapshotContent, Long fileAssetId, LocalDateTime createdAt) {
    DocumentVersionEntity entity = new DocumentVersionEntity();
    entity.setDocument(document);
    entity.setCreatedBy(author);
    entity.setLabel(label);
    entity.setSnapshotContent(snapshotContent);
    entity.setFileAssetId(fileAssetId);
    documentVersionRepository.save(entity);
    touch("document_versions", entity.getId(), createdAt, createdAt);
    insertActivityEvent(document.getProject(), author, ProjectActivityEventType.DOCUMENT_VERSION_SAVED, "DOCUMENT_VERSION", entity.getId(), document.getTitle(), 1, null, null, "document-version:" + entity.getId(), detail("documentId", document.getId(), "label", label), createdAt);
    return entity;
  }

  private FileAssetEntity createFileAsset(FileOwnerType ownerType, Long ownerId, String fileName, String mimeType, byte[] bytes, LocalDateTime createdAt) {
    var record =
        storageService.storeOwnedBytes(
            bytes,
            fileName,
            mimeType,
            ownerType,
            ownerId,
            new JwtPrincipal(0L, "demo-seed@educollab.local", UserRole.ADMIN));
    FileAssetEntity entity =
        fileAssetRepository.findById(record.id()).orElseThrow(() -> new ApiException("演示附件写入失败"));
    touch("file_assets", entity.getId(), createdAt, createdAt);
    return entity;
  }

  private void insertFileUploadedEvent(ProjectEntity project, UserEntity actor, FileAssetEntity file, String targetType, Long targetId, LocalDateTime occurredAt) {
    insertActivityEvent(project, actor, ProjectActivityEventType.FILE_UPLOADED, targetType, targetId, file.getFileName(), 1, null, null, "file-upload:" + file.getId(), detail("fileId", file.getId(), "fileName", file.getFileName(), "ownerType", targetType, "ownerId", targetId), occurredAt);
  }

  private AssignmentEntity createAssignment(CourseEntity course, ProjectEntity project, String title, String summary, String submissionUrl, LocalDate dueDate, AssignmentStatus status, LocalDateTime createdAt) {
    AssignmentEntity entity = new AssignmentEntity();
    entity.setCourse(course);
    entity.setProject(project);
    entity.setTitle(title);
    entity.setSummary(summary);
    entity.setSubmissionUrl(submissionUrl);
    entity.setDueDate(dueDate);
    entity.setStatus(status);
    assignmentRepository.save(entity);
    touch("assignments", entity.getId(), createdAt, createdAt.plusMinutes(1));
    return entity;
  }

  private AssignmentSubmissionEntity createAssignmentSubmission(
      AssignmentEntity assignment,
      UserEntity student,
      ProjectEntity linkedProject,
      DocumentEntity linkedDocument,
      String content,
      String submissionUrl,
      AssignmentSubmissionStatus status,
      Integer score,
      String teacherFeedback,
      LocalDateTime submittedAt,
      LocalDateTime reviewedAt,
      int attemptCount,
      List<FileSeed> files) {
    AssignmentSubmissionEntity entity = new AssignmentSubmissionEntity();
    entity.setAssignment(assignment);
    entity.setStudent(student);
    entity.setLinkedProject(linkedProject);
    entity.setLinkedDocument(linkedDocument);
    entity.setContent(content);
    entity.setSubmissionUrl(submissionUrl);
    entity.setStatus(status);
    entity.setScore(score);
    entity.setTeacherFeedback(teacherFeedback);
    entity.setSubmittedAt(submittedAt);
    entity.setReviewedAt(reviewedAt);
    entity.setAttemptCount(attemptCount);
    assignmentSubmissionRepository.save(entity);
    touch("assignment_submissions", entity.getId(), submittedAt != null ? submittedAt : assignment.getCreatedAt(), reviewedAt != null ? reviewedAt : (submittedAt != null ? submittedAt : assignment.getCreatedAt()));
    if (submittedAt != null && linkedProject != null) {
      insertActivityEvent(linkedProject, student, ProjectActivityEventType.ASSIGNMENT_SUBMITTED, "ASSIGNMENT_SUBMISSION", entity.getId(), assignment.getTitle(), 1, null, null, "assignment-submit:" + entity.getId() + ":" + attemptCount, detail("assignmentId", assignment.getId(), "attemptCount", attemptCount), submittedAt);
    }
    if (files != null) {
      for (FileSeed file : files) {
        FileAssetEntity asset = createFileAsset(FileOwnerType.ASSIGNMENT_SUBMISSION, entity.getId(), file.fileName(), file.mimeType(), file.content(), file.createdAt());
        if (linkedProject != null) {
          insertFileUploadedEvent(linkedProject, student, asset, "ASSIGNMENT_SUBMISSION", entity.getId(), file.createdAt());
        }
      }
    }
    return entity;
  }

  private TeacherFeedbackEntity createTeacherFeedback(ProjectEntity project, UserEntity teacher, Integer score, String content, LocalDateTime createdAt) {
    TeacherFeedbackEntity entity = new TeacherFeedbackEntity();
    entity.setProject(project);
    entity.setTeacher(teacher);
    entity.setScore(score);
    entity.setContent(content);
    teacherFeedbackRepository.save(entity);
    touch("teacher_feedback", entity.getId(), createdAt, createdAt);
    return entity;
  }

  private void createNotification(UserEntity user, String title, String content, NotificationType type, NotificationSourceType sourceType, Long sourceId, String sourcePath, String sourceLabel, LocalDateTime createdAt, boolean read) {
    NotificationEntity entity = new NotificationEntity();
    entity.setUser(user);
    entity.setTitle(title);
    entity.setContent(content);
    entity.setType(type);
    entity.setSourceType(sourceType);
    entity.setSourceId(sourceId);
    entity.setSourcePath(sourcePath);
    entity.setSourceLabel(sourceLabel);
    entity.setRead(read);
    notificationRepository.save(entity);
    touch("notifications", entity.getId(), createdAt, createdAt);
  }

  private void createAiUsageLog(UserEntity user, String scenario, String modelName, boolean success, String promptPreview, LocalDateTime createdAt) {
    AiUsageLogEntity entity = new AiUsageLogEntity();
    entity.setUser(user);
    entity.setScenario(scenario);
    entity.setModelName(modelName);
    entity.setSuccess(success);
    entity.setPromptPreview(promptPreview);
    aiUsageLogRepository.save(entity);
    touch("ai_usage_logs", entity.getId(), createdAt, createdAt);
  }

  private void createRelease(ProjectEntity project, String version, String title, String description, LocalDateTime createdAt) {
    ProjectReleaseEntity entity = new ProjectReleaseEntity();
    entity.setProject(project);
    entity.setVersion(version);
    entity.setTitle(title);
    entity.setDescription(description);
    projectReleaseRepository.save(entity);
    touch("project_releases", entity.getId(), createdAt, createdAt);
  }

  private void createMergeRequest(ProjectEntity project, String title, String sourceBranch, String targetBranch, MergeRequestStatus status, LocalDateTime createdAt) {
    MergeRequestEntity entity = new MergeRequestEntity();
    entity.setProject(project);
    entity.setTitle(title);
    entity.setSourceBranch(sourceBranch);
    entity.setTargetBranch(targetBranch);
    entity.setStatus(status);
    mergeRequestRepository.save(entity);
    touch("merge_requests", entity.getId(), createdAt, createdAt);
  }

  private List<GitCommitRecorded> createRepositoryHistory(ProjectEntity project, DemoUsers users, List<GitCommitSeed> mainCommits, List<BranchSeed> branches) {
    try {
      String slug = slugify(project.getName());
      Path repoDir = storagePathService.projectRepositoryRoot(project);
      Files.createDirectories(repoDir);
      Path bareDir = repoDir.resolve(project.getId() + "-" + slug + ".git");
      try (Git bare = Git.init().setBare(true).setInitialBranch("main").setDirectory(bareDir.toFile()).call()) {
        // bare repository created
      }
      GitRepositoryEntity gitRepository = new GitRepositoryEntity();
      gitRepository.setProject(project);
      gitRepository.setSlug(slug);
      gitRepository.setBarePath(bareDir.toString());
      gitRepositoryRepository.save(gitRepository);
      touch("git_repositories", gitRepository.getId(), project.getCreatedAt().plusHours(1), project.getCreatedAt().plusHours(1));

      List<GitCommitRecorded> recorded = new ArrayList<>();
      Path workDir = Files.createTempDirectory("educollab-demo-git-");
      try (Git git = Git.init().setDirectory(workDir.toFile()).setInitialBranch("main").call()) {
        String repoUri = "file:///" + bareDir.toFile().getAbsolutePath().replace("\\", "/");
        git.remoteAdd().setName("origin").setUri(new org.eclipse.jgit.transport.URIish(repoUri)).call();
        for (GitCommitSeed seed : mainCommits) {
          writeFiles(workDir, seed.files());
          git.add().addFilepattern(".").call();
          PersonIdent ident = person(seed.author(), seed.occurredAt());
          RevCommit commit = git.commit().setAuthor(ident).setCommitter(ident).setMessage(seed.message()).call();
          git.push().setRemote("origin").add("main").call();
          recorded.add(new GitCommitRecorded(project, seed.author(), seed.branch(), commit.getName(), seed.message(), seed.linesAdded(), seed.linesDeleted(), seed.occurredAt()));
        }
        for (BranchSeed branch : branches) {
          checkoutBranch(git, branch.name(), true);
          writeFiles(workDir, branch.files());
          git.add().addFilepattern(".").call();
          PersonIdent ident = person(branch.author(), branch.occurredAt());
          RevCommit commit = git.commit().setAuthor(ident).setCommitter(ident).setMessage(branch.message()).call();
          git.push().setRemote("origin").add(branch.name()).call();
          recorded.add(new GitCommitRecorded(project, branch.author(), branch.name(), commit.getName(), branch.message(), branch.linesAdded(), branch.linesDeleted(), branch.occurredAt()));
          checkoutBranch(git, "main", false);
        }
      } finally {
        try { deleteRecursively(workDir); } catch (Exception ignored) {}
      }

      for (GitCommitRecorded commit : recorded) {
        insertActivityEvent(commit.project(), commit.author(), ProjectActivityEventType.GIT_COMMIT_PUSHED, "GIT_COMMIT", null, commit.message(), 1, commit.linesAdded(), commit.linesDeleted(), "git-commit:" + project.getId() + ":" + commit.hash(), detail("hash", commit.hash(), "branch", commit.branch(), "authorName", commit.author().getName()), commit.occurredAt());
      }
      return recorded;
    } catch (Exception ex) {
      throw new ApiException("创建演示仓库失败: " + ex.getMessage());
    }
  }

  private void checkoutBranch(Git git, String branch, boolean create) throws GitAPIException {
    if (create) {
      git.checkout().setCreateBranch(true).setName(branch).call();
    } else {
      git.checkout().setName(branch).call();
    }
  }

  private void writeFiles(Path workDir, Map<String, String> files) throws IOException {
    for (Map.Entry<String, String> entry : files.entrySet()) {
      Path target = workDir.resolve(entry.getKey());
      Files.createDirectories(target.getParent());
      Files.writeString(target, entry.getValue(), StandardCharsets.UTF_8);
    }
  }

  private PersonIdent person(UserEntity author, LocalDateTime occurredAt) {
    return new PersonIdent(
        author.getName(),
        author.getEmail(),
        occurredAt.atZone(ZoneId.systemDefault()).toInstant(),
        ZoneId.systemDefault());
  }

  private void insertProjectVisitSeries(ProjectEntity project, Map<UserEntity, List<LocalDateTime>> visits, List<String> pages) {
    int pageIndex = 0;
    for (Map.Entry<UserEntity, List<LocalDateTime>> entry : visits.entrySet()) {
      for (LocalDateTime occurredAt : entry.getValue()) {
        String page = pages.get(pageIndex % pages.size());
        insertActivityEvent(project, entry.getKey(), ProjectActivityEventType.PROJECT_VISIT, "PAGE", null, page, 1, null, null, "visit:" + project.getId() + ":" + entry.getKey().getId() + ":" + page + ":" + occurredAt, detail("pageKey", page), occurredAt);
        pageIndex++;
      }
    }
  }

  private void insertLeafTaskCompletionEvents(ProjectFixture fixture) {
    Map<Long, Integer> childCount = new LinkedHashMap<>();
    for (TaskEntity task : fixture.tasks) {
      if (task.getParentTask() != null) {
        childCount.merge(task.getParentTask().getId(), 1, Integer::sum);
      }
    }
    for (TaskEntity task : fixture.tasks) {
      if (task.getStatus() == TaskStatus.DONE && childCount.getOrDefault(task.getId(), 0) == 0 && task.getCompletedAt() != null) {
        insertActivityEvent(fixture.project, task.getAssignee(), ProjectActivityEventType.TASK_COMPLETED, "TASK", task.getId(), task.getTitle(), 1, null, null, "task-completed:" + task.getId() + ":" + task.getCompletedAt(), detail("assigneeId", task.getAssignee() != null ? task.getAssignee().getId() : null), task.getCompletedAt());
      }
    }
  }

  private void insertTaskStatusEvent(ProjectEntity project, UserEntity actor, TaskEntity task, TaskStatus from, TaskStatus to, LocalDateTime occurredAt) {
    insertActivityEvent(project, actor, ProjectActivityEventType.TASK_STATUS_CHANGED, "TASK", task.getId(), task.getTitle(), 1, null, null, "task-status:" + task.getId() + ":" + occurredAt, detail("from", from.name(), "to", to.name()), occurredAt);
  }

  private void insertActivityEvent(ProjectEntity project, UserEntity actor, ProjectActivityEventType type, String targetType, Long targetId, String targetTitle, Integer eventCount, Integer linesAdded, Integer linesDeleted, String dedupeKey, Map<String, Object> detail, LocalDateTime occurredAt) {
    jdbcTemplate.update(
        """
        INSERT INTO project_activity_events (
          project_id, course_id, team_id, user_id, event_type, target_type, target_id, target_title,
          event_count, lines_added, lines_deleted, detail_json, dedupe_key, occurred_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        project.getId(),
        project.getCourse() != null ? project.getCourse().getId() : null,
        project.getTeam() != null ? project.getTeam().getId() : null,
        actor != null ? actor.getId() : null,
        type.name(),
        targetType,
        targetId,
        targetTitle,
        eventCount,
        linesAdded,
        linesDeleted,
        json(detail),
        dedupeKey,
        Timestamp.valueOf(occurredAt),
        Timestamp.valueOf(occurredAt),
        Timestamp.valueOf(occurredAt));
    appendActivityLogFile(project, actor, type, targetType, targetId, targetTitle, eventCount, linesAdded, linesDeleted, dedupeKey, detail, occurredAt);
  }

  private void appendActivityLogFile(
      ProjectEntity project,
      UserEntity actor,
      ProjectActivityEventType type,
      String targetType,
      Long targetId,
      String targetTitle,
      Integer eventCount,
      Integer linesAdded,
      Integer linesDeleted,
      String dedupeKey,
      Map<String, Object> detail,
      LocalDateTime occurredAt) {
    try {
      Path dir = storagePathService.projectActivityLogsRoot(project);
      Files.createDirectories(dir);
      Path file = storagePathService.projectWeeklyActivityLogFile(project, occurredAt);
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("projectId", project.getId());
      payload.put("courseId", project.getCourse() != null ? project.getCourse().getId() : null);
      payload.put("teamId", project.getTeam() != null ? project.getTeam().getId() : null);
      payload.put("userId", actor != null ? actor.getId() : null);
      payload.put("eventType", type.name());
      payload.put("targetType", targetType);
      payload.put("targetId", targetId);
      payload.put("targetTitle", targetTitle);
      payload.put("eventCount", eventCount);
      payload.put("linesAdded", linesAdded);
      payload.put("linesDeleted", linesDeleted);
      payload.put("detail", detail == null ? Map.of() : detail);
      payload.put("dedupeKey", dedupeKey);
      payload.put("occurredAt", occurredAt.toString());
      Files.writeString(
          file,
          objectMapper.writeValueAsString(payload) + System.lineSeparator(),
          StandardCharsets.UTF_8,
          java.nio.file.StandardOpenOption.CREATE,
          java.nio.file.StandardOpenOption.APPEND);
    } catch (Exception ex) {
      throw new ApiException("写入演示活动日志失败: " + ex.getMessage());
    }
  }

  private void finalizeProjectStorage(ProjectEntity... projects) {
    for (ProjectEntity project : projects) {
      storageService.syncProjectDocumentNodes(project.getId());
      try {
        Files.createDirectories(storagePathService.projectSummaryCacheRoot(project));
        Files.createDirectories(storagePathService.projectAuditRoot(project));
        Files.writeString(
            storagePathService.projectSummaryCacheRoot(project).resolve("latest-summary.json"),
            objectMapper.writeValueAsString(
                Map.of(
                    "projectId", project.getId(),
                    "projectName", project.getName(),
                    "generatedAt", LocalDateTime.now().toString(),
                    "status", Objects.requireNonNullElse(project.getStatus(), ProjectStatus.ACTIVE).name())),
            StandardCharsets.UTF_8);
      } catch (Exception ex) {
        throw new ApiException("写入演示总结缓存失败: " + ex.getMessage());
      }
    }
  }

  private Map<String, Object> detail(Object... args) {
    Map<String, Object> detail = new LinkedHashMap<>();
    for (int i = 0; i + 1 < args.length; i += 2) {
      detail.put(String.valueOf(args[i]), args[i + 1]);
    }
    return detail;
  }

  private String json(Map<String, Object> detail) {
    try {
      return objectMapper.writeValueAsString(detail == null ? Map.of() : detail);
    } catch (Exception ex) {
      throw new ApiException("序列化演示日志失败: " + ex.getMessage());
    }
  }

  private void touch(String table, Long id, LocalDateTime createdAt, LocalDateTime updatedAt) {
    List<String> assignments = new ArrayList<>();
    List<Object> args = new ArrayList<>();
    if (createdAt != null && hasColumn(table, "created_at")) {
      assignments.add("created_at = ?");
      args.add(Timestamp.valueOf(createdAt));
    }
    if (updatedAt != null && hasColumn(table, "updated_at")) {
      assignments.add("updated_at = ?");
      args.add(Timestamp.valueOf(updatedAt));
    }
    if (assignments.isEmpty()) {
      return;
    }
    args.add(id);
    jdbcTemplate.update("UPDATE " + table + " SET " + String.join(", ", assignments) + " WHERE id = ?", args.toArray());
  }

  private void updateLong(String table, String column, Long id, Long value) {
    jdbcTemplate.update("UPDATE " + table + " SET " + column + " = ? WHERE id = ?", value, id);
  }

  private String excerpt(String content) {
    if (content == null || content.isBlank()) {
      return "";
    }
    String plain = content.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    return plain.substring(0, Math.min(plain.length(), 90));
  }

  private String mimeForOffice(String ext) {
    return switch (Objects.requireNonNullElse(ext, "").toLowerCase(Locale.ROOT)) {
      case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      default -> "application/octet-stream";
    };
  }

  private String slugify(String input) {
    return input.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
  }

  private byte[] officeTemplate(String ext) {
    try {
      return new ClassPathResource("office-templates/blank." + ext).getInputStream().readAllBytes();
    } catch (IOException ex) {
      throw new ApiException("读取 Office 模板失败: " + ex.getMessage());
    }
  }

  private byte[] textBytes(String text) {
    return text.getBytes(StandardCharsets.UTF_8);
  }

  private boolean hasColumn(String table, String column) {
    Map<String, Boolean> columns = tableColumnPresence.computeIfAbsent(table, ignored -> new LinkedHashMap<>());
    return columns.computeIfAbsent(column, ignored ->
        Boolean.TRUE.equals(
            jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
                Boolean.class,
                table,
                column)));
  }

  private Long findTaskId(ProjectFixture fixture, String title) {
    return fixture.tasks.stream().filter(item -> item.getTitle().equals(title)).findFirst().map(TaskEntity::getId).orElse(null);
  }

  private LocalDateTime weeksAgoAt(int weeksAgo, DayOfWeek day, int hour, int minute) {
    LocalDate base = LocalDate.now().minusWeeks(weeksAgo).with(day);
    return LocalDateTime.of(base, LocalTime.of(hour, minute));
  }

  private LocalDateTime daysAgoAt(int daysAgo, int hour, int minute) {
    return LocalDateTime.of(LocalDate.now().minusDays(daysAgo), LocalTime.of(hour, minute));
  }

  private record DemoUsers(
      UserEntity admin,
      UserEntity teacher,
      UserEntity xulaoliu,
      UserEntity alex,
      UserEntity sarah,
      UserEntity liam,
      UserEntity yuki,
      UserEntity chenhao,
      UserEntity mia,
      UserEntity noah) {}

  private static class ProjectFixture {
    private final ProjectEntity project;
    private final TeamEntity team;
    private final CourseEntity course;
    private final List<ProjectMilestoneEntity> milestones = new ArrayList<>();
    private final List<TaskEntity> tasks = new ArrayList<>();
    private final List<DiscussionPostEntity> discussionPosts = new ArrayList<>();
    private final List<DiscussionReplyEntity> discussionReplies = new ArrayList<>();
    private final List<DocumentEntity> documents = new ArrayList<>();
    private final List<DocumentVersionEntity> documentVersions = new ArrayList<>();
    private final List<GitCommitRecorded> gitCommits = new ArrayList<>();

    private ProjectFixture(ProjectEntity project, TeamEntity team, CourseEntity course) {
      this.project = project;
      this.team = team;
      this.course = course;
    }
  }

  private record GitCommitSeed(String branch, UserEntity author, LocalDateTime occurredAt, String message, int linesAdded, int linesDeleted, Map<String, String> files) {}

  private record BranchSeed(String name, UserEntity author, LocalDateTime occurredAt, String message, int linesAdded, int linesDeleted, Map<String, String> files) {}

  private record GitCommitRecorded(ProjectEntity project, UserEntity author, String branch, String hash, String message, int linesAdded, int linesDeleted, LocalDateTime occurredAt) {}

  private record FileSeed(String fileName, String mimeType, byte[] content, LocalDateTime createdAt) {}
}
