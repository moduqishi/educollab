package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import com.educollab.service.classroom.AssignmentSubmissionRecordMapper;
import com.educollab.service.classroom.ClassroomRecordMapper;
import com.educollab.service.team.TeamRecordMapper;
import com.educollab.service.workspace.ProjectProgressService;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ClassroomService {
  private final CourseRepository courseRepository;
  private final ClassMemberRepository classMemberRepository;
  private final ClassInvitationRepository classInvitationRepository;
  private final AssignmentRepository assignmentRepository;
  private final GroupTaskRepository groupTaskRepository;
  private final TeamRepository teamRepository;
  private final TeamMemberRepository teamMemberRepository;
  private final GroupTaskTeamTaskRepository groupTaskTeamTaskRepository;
  private final TaskRepository taskRepository;
  private final UserRepository userRepository;
  private final AuthService authService;
  private final NotificationService notificationService;
  private final ProjectRepository projectRepository;
  private final ProjectMilestoneRepository projectMilestoneRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final GitService gitService;
  private final ProjectProgressService projectProgressService;
  private final ProjectActivityService projectActivityService;
  private final ClassroomRecordMapper recordMapper;
  private final AssignmentSubmissionRecordMapper assignmentSubmissionRecordMapper;
  private final TeamRecordMapper teamRecordMapper;
  private final Random random = new Random();
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  private static final List<ProjectMilestoneSeed> DEFAULT_MILESTONES = List.of(
      new ProjectMilestoneSeed("构思阶段", "明确目标、问题边界和核心价值。", 1),
      new ProjectMilestoneSeed("蓝图搭建", "整理整体结构、页面草图与技术蓝图。", 1),
      new ProjectMilestoneSeed("项目规划", "拆分任务、确认优先级、资源和验收方式。", 1),
      new ProjectMilestoneSeed("开发实现", "进入主要实现、联调与阶段迭代。", 5),
      new ProjectMilestoneSeed("验收交付", "完成测试、演示、文档和最终交付。", 2));

  public ClassroomService(
      CourseRepository courseRepository,
      ClassMemberRepository classMemberRepository,
      ClassInvitationRepository classInvitationRepository,
      AssignmentRepository assignmentRepository,
      GroupTaskRepository groupTaskRepository,
      TeamRepository teamRepository,
      TeamMemberRepository teamMemberRepository,
      GroupTaskTeamTaskRepository groupTaskTeamTaskRepository,
      TaskRepository taskRepository,
      UserRepository userRepository,
      AuthService authService,
      NotificationService notificationService,
      ProjectRepository projectRepository,
      ProjectMilestoneRepository projectMilestoneRepository,
      ProjectMemberRepository projectMemberRepository,
      GitService gitService,
      ProjectProgressService projectProgressService,
      ProjectActivityService projectActivityService,
      ClassroomRecordMapper recordMapper,
      AssignmentSubmissionRecordMapper assignmentSubmissionRecordMapper,
      TeamRecordMapper teamRecordMapper) {
    this.courseRepository = courseRepository;
    this.classMemberRepository = classMemberRepository;
    this.classInvitationRepository = classInvitationRepository;
    this.assignmentRepository = assignmentRepository;
    this.groupTaskRepository = groupTaskRepository;
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.groupTaskTeamTaskRepository = groupTaskTeamTaskRepository;
    this.taskRepository = taskRepository;
    this.userRepository = userRepository;
    this.authService = authService;
    this.notificationService = notificationService;
    this.projectRepository = projectRepository;
    this.projectMilestoneRepository = projectMilestoneRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.gitService = gitService;
    this.projectProgressService = projectProgressService;
    this.projectActivityService = projectActivityService;
    this.recordMapper = recordMapper;
    this.assignmentSubmissionRecordMapper = assignmentSubmissionRecordMapper;
    this.teamRecordMapper = teamRecordMapper;
  }

  public List<ClassRecord> classes(JwtPrincipal principal) {
    List<CourseEntity> courses = principal.role() == UserRole.ADMIN
        ? courseRepository.findAll()
        : principal.role() == UserRole.TEACHER
            ? courseRepository.findByTeacherId(principal.userId())
            : classMemberRepository.findByUserId(principal.userId()).stream().map(ClassMemberEntity::getCourse).distinct().toList();
    return courses.stream().map(recordMapper::toClassRecord).toList();
  }

  public ClassDetail classDetail(Long classId, JwtPrincipal principal) {
    CourseEntity course = requireClassVisible(classId, principal);
    return new ClassDetail(
        recordMapper.toClassRecord(course),
        classMemberRepository.findByCourseId(classId).stream().map(recordMapper::toClassMemberRecord).toList(),
        classInvitationRepository.findByCourseIdOrderByCreatedAtDesc(classId).stream().map(recordMapper::toClassInvitationRecord).toList(),
        assignmentRepository.findByCourseIdOrderByCreatedAtDesc(classId).stream()
            .map(item -> assignmentSubmissionRecordMapper.toAssignmentRecord(item, principal))
            .toList(),
        groupTaskRepository.findByCourseIdOrderByCreatedAtDesc(classId).stream().map(task -> recordMapper.toGroupTaskRecord(task, principal)).toList()
    );
  }

  @Transactional
  public ClassRecord createClass(ClassSaveRequest request, JwtPrincipal principal) {
    if (principal.role() != UserRole.TEACHER) throw new ApiException("只有教师可以创建班级");
    CourseEntity course = new CourseEntity();
    course.setName(request.name());
    course.setTeacher(authService.getUser(principal.userId()));
    course.setClassCode(generateClassCode());
    courseRepository.save(course);
    ensureClassMember(course, course.getTeacher(), ClassMemberRole.TEACHER, "CREATED");
    return recordMapper.toClassRecord(course);
  }

  @Transactional
  public ClassRecord joinByCode(JoinClassByCodeRequest request, JwtPrincipal principal) {
    CourseEntity course = courseRepository.findByClassCode(request.classCode().trim().toUpperCase(Locale.ROOT))
        .orElseThrow(() -> new ApiException("班级码无效"));
    UserEntity user = authService.getUser(principal.userId());
    if (classMemberRepository.findByCourseIdAndUserId(course.getId(), user.getId()).isPresent()) {
      throw new ApiException("你已经加入该班级");
    }
    ensureClassMember(course, user, ClassMemberRole.STUDENT, "CODE");
    if (course.getTeacher() != null) {
      notificationService.create(
          course.getTeacher(),
          "新学生加入班级",
          user.getName() + " 通过班级码加入了 " + course.getName(),
          NotificationType.SYSTEM,
          classMembersTarget(course.getId()));
    }
    return recordMapper.toClassRecord(course);
  }

  @Transactional
  public ClassRecord resetCode(Long classId, JwtPrincipal principal) {
    CourseEntity course = requireTeacherClass(classId, principal);
    course.setClassCode(generateClassCode());
    courseRepository.save(course);
    return recordMapper.toClassRecord(course);
  }

  public List<ClassInvitationRecord> pendingInvitations(JwtPrincipal principal) {
    return classInvitationRepository.findByInvitedUserIdAndStatusOrderByCreatedAtDesc(principal.userId(), ClassInvitationStatus.PENDING)
        .stream()
        .map(recordMapper::toClassInvitationRecord)
        .toList();
  }

  @Transactional
  public ClassInvitationRecord invite(Long classId, ClassInvitationCreateRequest request, JwtPrincipal principal) {
    CourseEntity course = requireTeacherClass(classId, principal);
    UserEntity invitedUser = userRepository.findByEmailIgnoreCase(request.email())
        .orElseThrow(() -> new ApiException("未找到该账号"));
    if (invitedUser.getRole() != UserRole.STUDENT) throw new ApiException("只能邀请学生加入班级");
    if (classMemberRepository.findByCourseIdAndUserId(classId, invitedUser.getId()).isPresent()) {
      throw new ApiException("该学生已在班级中");
    }
    classInvitationRepository.findByCourseIdAndInvitedUserIdAndStatus(classId, invitedUser.getId(), ClassInvitationStatus.PENDING)
        .ifPresent(invitation -> {
          throw new ApiException("该学生已收到邀请");
        });
    ClassInvitationEntity invitation = new ClassInvitationEntity();
    invitation.setCourse(course);
    invitation.setInvitedUser(invitedUser);
    invitation.setInvitedByUser(authService.getUser(principal.userId()));
    classInvitationRepository.save(invitation);
    notificationService.create(
        invitedUser,
        "收到班级邀请",
        "教师邀请你加入班级 " + course.getName(),
        NotificationType.SYSTEM,
        NotificationTarget.of(NotificationSourceType.CLASS, course.getId(), "/app/classes", "班级邀请"));
    return recordMapper.toClassInvitationRecord(invitation);
  }

  @Transactional
  public void acceptInvitation(Long invitationId, JwtPrincipal principal) {
    ClassInvitationEntity invitation = classInvitationRepository.findById(invitationId)
        .orElseThrow(() -> new ApiException("邀请不存在"));
    if (!invitation.getInvitedUser().getId().equals(principal.userId())) throw new ApiException("无权处理该邀请");
    if (invitation.getStatus() != ClassInvitationStatus.PENDING) throw new ApiException("该邀请已处理");
    invitation.setStatus(ClassInvitationStatus.ACCEPTED);
    classInvitationRepository.save(invitation);
    ensureClassMember(invitation.getCourse(), invitation.getInvitedUser(), ClassMemberRole.STUDENT, "INVITE");
    notificationService.create(
        invitation.getInvitedByUser(),
        "学生已接受邀请",
        invitation.getInvitedUser().getName() + " 已加入班级 " + invitation.getCourse().getName(),
        NotificationType.SYSTEM,
        classMembersTarget(invitation.getCourse().getId()));
  }

  @Transactional
  public void rejectInvitation(Long invitationId, JwtPrincipal principal) {
    ClassInvitationEntity invitation = classInvitationRepository.findById(invitationId)
        .orElseThrow(() -> new ApiException("邀请不存在"));
    if (!invitation.getInvitedUser().getId().equals(principal.userId())) throw new ApiException("无权处理该邀请");
    if (invitation.getStatus() != ClassInvitationStatus.PENDING) throw new ApiException("该邀请已处理");
    invitation.setStatus(ClassInvitationStatus.REJECTED);
    classInvitationRepository.save(invitation);
  }

  public List<AssignmentRecord> assignments(Long classId, JwtPrincipal principal) {
    requireClassVisible(classId, principal);
    return assignmentRepository.findByCourseIdOrderByCreatedAtDesc(classId).stream()
        .map(item -> assignmentSubmissionRecordMapper.toAssignmentRecord(item, principal))
        .toList();
  }

  public List<TeamRecord> teams(Long classId, JwtPrincipal principal) {
    requireClassVisible(classId, principal);
    return teamRepository.findByCourseIdOrderByCreatedAtAsc(classId).stream()
        .filter(team -> teamRecordMapper.resolveSource(team) != TeamSource.STANDALONE)
        .map(teamRecordMapper::toRecord)
        .sorted(
            java.util.Comparator
                .comparing((TeamRecord item) -> item.groupOrder() == null ? Integer.MAX_VALUE : item.groupOrder())
                .thenComparing(item -> java.util.Objects.requireNonNullElse(item.name(), "")))
        .toList();
  }

  public List<ClassProjectRecord> classProjects(Long classId, JwtPrincipal principal) {
    requireClassVisible(classId, principal);
    return teamRepository.findByCourseIdOrderByCreatedAtAsc(classId).stream()
        .filter(team -> teamRecordMapper.resolveSource(team) == TeamSource.COURSE)
        .sorted(
            java.util.Comparator
                .comparing((TeamEntity item) -> item.getGroupOrder() == null ? Integer.MAX_VALUE : item.getGroupOrder())
                .thenComparing(TeamEntity::getCreatedAt))
        .map(team -> {
          ProjectEntity project = projectRepository.findByTeamId(team.getId()).orElse(null);
          List<TaskEntity> tasks = project != null ? taskRepository.findByProjectId(project.getId()) : List.of();
          int completedTaskCount = (int) tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
          return new ClassProjectRecord(
              team.getId(),
              team.getName(),
              team.getGroupOrder(),
              team.getStatus() != null ? team.getStatus().name() : null,
              project != null ? project.getId() : null,
              project != null ? project.getName() : null,
              project != null && project.getType() != null ? project.getType().name() : null,
              project != null && project.getStatus() != null ? project.getStatus().name() : null,
              project != null ? project.getProgress() : 0,
              tasks.size(),
              completedTaskCount);
        })
        .toList();
  }

  @Transactional
  public AssignmentRecord createAssignment(Long classId, AssignmentSaveRequest request, JwtPrincipal principal) {
    CourseEntity course = requireTeacherClass(classId, principal);
    AssignmentEntity entity = new AssignmentEntity();
    entity.setCourse(course);
    entity.setTitle(request.title());
    entity.setSummary(request.summary());
    entity.setSubmissionUrl(request.submissionUrl());
    entity.setDueDate(parseDate(request.dueDate()));
    entity.setStatus(AssignmentStatus.OPEN);
    assignmentRepository.save(entity);
    classMemberRepository.findByCourseId(classId).stream()
        .filter(member -> member.getRole() == ClassMemberRole.STUDENT)
        .forEach(member -> notificationService.create(
            member.getUser(),
            "新作业发布",
            "班级 " + course.getName() + " 发布了作业：" + entity.getTitle(),
            NotificationType.TASK,
            assignmentTarget(classId, entity.getId())));
    return assignmentSubmissionRecordMapper.toAssignmentRecord(entity, principal);
  }

  @Transactional
  public AssignmentRecord updateAssignment(
      Long classId, Long assignmentId, AssignmentSaveRequest request, JwtPrincipal principal) {
    AssignmentEntity entity = requireAssignmentInClass(classId, assignmentId);
    requireTeacherClass(classId, principal);
    entity.setTitle(request.title());
    entity.setSummary(request.summary());
    entity.setSubmissionUrl(request.submissionUrl());
    entity.setDueDate(parseDate(request.dueDate()));
    assignmentRepository.save(entity);
    return assignmentSubmissionRecordMapper.toAssignmentRecord(entity, principal);
  }

  @Transactional
  public void deleteAssignment(Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity entity = requireAssignmentInClass(classId, assignmentId);
    requireTeacherClass(classId, principal);
    assignmentRepository.delete(entity);
  }

  @Transactional
  public AssignmentRecord closeAssignment(Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity entity = requireAssignmentInClass(classId, assignmentId);
    requireTeacherClass(classId, principal);
    entity.setStatus(AssignmentStatus.CLOSED);
    assignmentRepository.save(entity);
    return assignmentSubmissionRecordMapper.toAssignmentRecord(entity, principal);
  }

  @Transactional
  public AssignmentRecord reopenAssignment(Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity entity = requireAssignmentInClass(classId, assignmentId);
    requireTeacherClass(classId, principal);
    entity.setStatus(AssignmentStatus.OPEN);
    assignmentRepository.save(entity);
    return assignmentSubmissionRecordMapper.toAssignmentRecord(entity, principal);
  }

  public List<GroupTaskRecord> groupTasks(Long classId, JwtPrincipal principal) {
    requireClassVisible(classId, principal);
    return groupTaskRepository.findByCourseIdOrderByCreatedAtDesc(classId).stream().map(task -> recordMapper.toGroupTaskRecord(task, principal)).toList();
  }

  public GroupTaskRecord groupTaskDetail(Long groupTaskId, JwtPrincipal principal) {
    GroupTaskEntity task = groupTaskRepository.findById(groupTaskId)
        .orElseThrow(() -> new ApiException("组队任务不存在"));
    requireClassVisible(task.getCourse().getId(), principal);
    return recordMapper.toGroupTaskRecord(task, principal);
  }

  public GroupTaskTeamDetail groupTaskTeamDetail(Long teamId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    boolean teacherView = canTeacherViewTeam(team, principal);
    if (!teacherView) requireTeamMember(teamId, principal.userId());
    return recordMapper.toGroupTaskTeamDetail(team, principal, teacherView);
  }

  @Transactional
  public GroupTaskRecord createGroupTask(Long classId, GroupTaskSaveRequest request, JwtPrincipal principal) {
    CourseEntity course = requireTeacherClass(classId, principal);
    GroupTaskEntity entity = new GroupTaskEntity();
    entity.setCourse(course);
    entity.setCreatedBy(authService.getUser(principal.userId()));
    entity.setTitle(request.title());
    entity.setDescription(request.description());
    entity.setMinMembers(request.minMembers());
    entity.setMaxMembers(request.maxMembers());
    entity.setDueDate(parseDate(request.dueDate()));
    groupTaskRepository.save(entity);
    classMemberRepository.findByCourseId(classId).stream()
        .filter(member -> member.getRole() == ClassMemberRole.STUDENT)
        .forEach(member -> notificationService.create(
            member.getUser(),
            "新组队任务发布",
            "班级 " + course.getName() + " 发布了组队任务：" + entity.getTitle(),
            NotificationType.TASK,
            groupTaskTarget(classId, entity.getId())));
    return recordMapper.toGroupTaskRecord(entity, principal);
  }

  @Transactional
  public GroupTaskTeamRecord createGroupTaskTeam(Long groupTaskId, GroupTaskTeamSaveRequest request, JwtPrincipal principal) {
    GroupTaskEntity task = groupTaskRepository.findById(groupTaskId)
        .orElseThrow(() -> new ApiException("组队任务不存在"));
    requireStudentInClass(task.getCourse().getId(), principal);
    if (findCurrentTeam(groupTaskId, principal.userId()) != null) {
      throw new ApiException("你已经加入该组队任务中的队伍");
    }
    TeamEntity team = new TeamEntity();
    team.setName(request.name());
    team.setCourse(task.getCourse());
    team.setGroupTask(task);
    team.setLeader(authService.getUser(principal.userId()));
    team.setSource(TeamSource.COURSE);
    team.setStatus(TeamStatus.FORMING);
    teamRepository.save(team);

    TeamMemberEntity member = new TeamMemberEntity();
    member.setTeam(team);
    member.setUser(team.getLeader());
    teamMemberRepository.save(member);

    // 将课程老师加入团队
    if (task.getCourse().getTeacher() != null) {
      TeamMemberEntity teacherMember = new TeamMemberEntity();
      teacherMember.setTeam(team);
      teacherMember.setUser(task.getCourse().getTeacher());
      teamMemberRepository.save(teacherMember);
    }

    return recordMapper.toGroupTaskTeamRecord(team, principal);
  }

  @Transactional
  public GroupTaskTeamRecord joinGroupTaskTeam(Long teamId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    requireStudentInClass(team.getCourse().getId(), principal);
    if (teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId()).isPresent()) {
      throw new ApiException("你已经加入该队伍");
    }
    GroupTaskEntity task = team.getGroupTask();
    if (findCurrentTeam(task.getId(), principal.userId()) != null) {
      throw new ApiException("你已经加入该组队任务中的其他队伍");
    }
    Integer maxMembers = task.getMaxMembers();
    if (maxMembers != null && teamMemberRepository.findByTeamId(teamId).size() >= maxMembers) {
      throw new ApiException("该队伍人数已满");
    }
    TeamMemberEntity member = new TeamMemberEntity();
    member.setTeam(team);
    member.setUser(authService.getUser(principal.userId()));
    teamMemberRepository.save(member);
    return recordMapper.toGroupTaskTeamRecord(team, principal);
  }

  @Transactional
  public GroupTaskTeamRecord leaveGroupTaskTeam(Long teamId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    TeamMemberEntity membership = teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId())
        .orElseThrow(() -> new ApiException("你不在该队伍中"));
    if (team.getLeader() != null && team.getLeader().getId().equals(principal.userId())) {
      throw new ApiException("队长退出前请先转让队长");
    }
    teamMemberRepository.delete(membership);
    cleanupEmptyTeam(team);
    return teamRepository.findById(teamId).map(entity -> recordMapper.toGroupTaskTeamRecord(entity, principal)).orElse(null);
  }

  @Transactional
  public GroupTaskTeamRecord transferLeader(Long teamId, GroupTaskTransferLeaderRequest request, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
      throw new ApiException("只有队长可以转让队长");
    }
    TeamMemberEntity target = teamMemberRepository.findByTeamIdAndUserId(teamId, request.leaderUserId())
        .orElseThrow(() -> new ApiException("目标成员不在队伍中"));
    team.setLeader(target.getUser());
    teamRepository.save(team);
    return recordMapper.toGroupTaskTeamRecord(team, principal);
  }

  @Transactional
  public void removeGroupTaskTeamMember(Long teamId, Long userId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
      throw new ApiException("只有队长可以移除成员");
    }
    if (team.getLeader().getId().equals(userId)) {
      throw new ApiException("不能移除自己，请先转让队长");
    }
    TeamMemberEntity membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
        .orElseThrow(() -> new ApiException("该成员不在队伍中"));
    teamMemberRepository.delete(membership);
    cleanupEmptyTeam(team);
  }

  public List<GroupTaskSubTaskRecord> teamTasks(Long teamId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    if (!canTeacherViewTeam(team, principal)) requireTeamMember(teamId, principal.userId());
    return groupTaskTeamTaskRepository.findByTeamIdOrderByCreatedAtDesc(teamId).stream().map(recordMapper::toGroupTaskSubTaskRecord).toList();
  }

  @Transactional
  public GroupTaskSubTaskRecord saveTeamTask(Long teamId, GroupTaskSubTaskSaveRequest request, Long taskId, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
      throw new ApiException("只有队长可以分配队内任务");
    }
    GroupTaskTeamTaskEntity entity = taskId == null
        ? new GroupTaskTeamTaskEntity()
        : groupTaskTeamTaskRepository.findById(taskId).orElseThrow(() -> new ApiException("任务不存在"));
    entity.setTeam(team);
    entity.setTitle(request.title());
    entity.setDescription(request.description());
    entity.setStatus(request.status() == null || request.status().isBlank() ? TaskStatus.TODO : TaskStatus.valueOf(request.status()));
    entity.setDueDate(parseDate(request.dueDate()));
    entity.setAssignee(resolveTeamAssignee(teamId, request.assigneeId()));
    groupTaskTeamTaskRepository.save(entity);
    if (entity.getAssignee() != null) {
      notificationService.create(
          entity.getAssignee(),
          "收到队内任务",
          "队长给你分配了任务：" + entity.getTitle(),
          NotificationType.TASK,
          teamTaskTarget(teamId, entity.getId()));
    }
    return recordMapper.toGroupTaskSubTaskRecord(entity);
  }

  @Transactional
  public GroupTaskSubTaskRecord updateTeamTask(Long taskId, GroupTaskSubTaskSaveRequest request, JwtPrincipal principal) {
    GroupTaskTeamTaskEntity entity = groupTaskTeamTaskRepository.findById(taskId)
        .orElseThrow(() -> new ApiException("任务不存在"));
    return saveTeamTask(entity.getTeam().getId(), request, taskId, principal);
  }

  @Transactional
  public ProjectRecord createProjectForTeam(Long teamId, ProjectSaveRequest request, JwtPrincipal principal) {
    TeamEntity team = requireGroupTaskTeam(teamId);
    if (team.getLeader() == null || !team.getLeader().getId().equals(principal.userId())) {
      throw new ApiException("只有队长可以创建项目");
    }
    projectRepository.findByTeamId(teamId).ifPresent(project -> {
      throw new ApiException("该队伍已创建项目");
    });
    ProjectEntity project = new ProjectEntity();
    project.setTeam(team);
    project.setCourse(team.getCourse());
    project.setGroupTask(team.getGroupTask());
    project.setName(request.name());
    project.setDescription(request.description());
    project.setType(ProjectType.valueOf(request.type()));
    project.setStatus(ProjectStatus.ACTIVE);
    project.setDueDate(parseDate(request.dueDate()));
    projectRepository.saveAndFlush(project);
    List<ProjectMilestoneEntity> milestones = createDefaultMilestones(project);
    projectProgressService.recomputeProject(project.getId());
    projectActivityService.recordProjectCreated(project, principal.userId());
    milestones.forEach(milestone -> projectActivityService.recordMilestoneCreated(milestone, principal.userId(), true));
    for (TeamMemberEntity member : teamMemberRepository.findByTeamId(teamId)) {
      ProjectMemberEntity projectMember = new ProjectMemberEntity();
      projectMember.setProject(project);
      projectMember.setUser(member.getUser());
      projectMember.setOwnerFlag(team.getLeader() != null && member.getUser().getId().equals(team.getLeader().getId()));
      projectMemberRepository.save(projectMember);
    }
    if (request.initRepository() && project.getType() == ProjectType.CODE) gitService.ensureRepository(project);
    return new ProjectRecord(
        project.getId(),
        project.getName(),
        project.getDescription(),
        project.getType().name(),
        project.getStatus().name(),
        project.getProgress(),
        project.getCourse() != null ? project.getCourse().getId() : null,
        project.getCourse().getName(),
        project.getTeam() != null ? project.getTeam().getId() : null,
        project.getTeam().getName(),
        project.getDueDate() != null ? project.getDueDate().toString() : null,
        formatter.format(project.getCreatedAt()),
        projectMemberRepository.findByProjectId(project.getId()).stream().map(pm -> pm.getUser().getAvatar()).toList()
    );
  }

  public CourseEntity requireClassVisible(Long classId, JwtPrincipal principal) {
    CourseEntity course = courseRepository.findById(classId).orElseThrow(() -> new ApiException("班级不存在"));
    if (principal.role() == UserRole.ADMIN) return course;
    if (principal.role() == UserRole.TEACHER && course.getTeacher() != null && course.getTeacher().getId().equals(principal.userId())) return course;
    if (classMemberRepository.findByCourseIdAndUserId(classId, principal.userId()).isPresent()) return course;
    throw new ApiException("无权访问该班级");
  }

  public CourseEntity requireTeacherClass(Long classId, JwtPrincipal principal) {
    CourseEntity course = requireClassVisible(classId, principal);
    if (principal.role() == UserRole.ADMIN) {
      return course;
    }
    if (principal.role() != UserRole.TEACHER || course.getTeacher() == null || !course.getTeacher().getId().equals(principal.userId())) {
      throw new ApiException("只有教师可以管理该班级");
    }
    return course;
  }

  public void requireStudentInClass(Long classId, JwtPrincipal principal) {
    CourseEntity course = requireClassVisible(classId, principal);
    if (principal.role() != UserRole.STUDENT) throw new ApiException("只有学生可以操作组队");
    classMemberRepository.findByCourseIdAndUserId(course.getId(), principal.userId())
        .orElseThrow(() -> new ApiException("你不在该班级中"));
  }

  private void requireTeamMember(Long teamId, Long userId) {
    teamMemberRepository.findByTeamIdAndUserId(teamId, userId).orElseThrow(() -> new ApiException("无权访问该队伍"));
  }

  private UserEntity resolveTeamAssignee(Long teamId, Long assigneeId) {
    if (assigneeId == null) return null;
    return teamMemberRepository.findByTeamIdAndUserId(teamId, assigneeId)
        .map(TeamMemberEntity::getUser)
        .orElseThrow(() -> new ApiException("任务负责人必须是当前队伍成员"));
  }

  private TeamEntity requireGroupTaskTeam(Long teamId) {
    TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("队伍不存在"));
    if (team.getGroupTask() == null) throw new ApiException("该队伍不是组队任务队伍");
    return team;
  }

  private boolean canTeacherViewTeam(TeamEntity team, JwtPrincipal principal) {
    return principal.role() == UserRole.TEACHER
        && team.getCourse() != null
        && team.getCourse().getTeacher() != null
        && team.getCourse().getTeacher().getId().equals(principal.userId());
  }

  private TeamEntity findCurrentTeam(Long groupTaskId, Long userId) {
    return teamMemberRepository.findByUserId(userId).stream()
        .map(TeamMemberEntity::getTeam)
        .filter(team -> team.getGroupTask() != null && team.getGroupTask().getId().equals(groupTaskId))
        .findFirst()
        .orElse(null);
  }

  private void cleanupEmptyTeam(TeamEntity team) {
    if (teamMemberRepository.findByTeamId(team.getId()).isEmpty()) {
      projectRepository.findByTeamId(team.getId()).ifPresent(projectRepository::delete);
      teamRepository.delete(team);
    }
  }

  @Transactional
  protected void ensureClassMember(CourseEntity course, UserEntity user, ClassMemberRole role, String joinedVia) {
    if (classMemberRepository.findByCourseIdAndUserId(course.getId(), user.getId()).isPresent()) return;
    ClassMemberEntity member = new ClassMemberEntity();
    member.setCourse(course);
    member.setUser(user);
    member.setRole(role);
    member.setJoinedVia(joinedVia);
    classMemberRepository.save(member);
  }

  private String generateClassCode() {
    String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    String code;
    do {
      StringBuilder builder = new StringBuilder();
      for (int i = 0; i < 6; i++) builder.append(alphabet.charAt(random.nextInt(alphabet.length())));
      code = builder.toString();
    } while (courseRepository.findByClassCode(code).isPresent());
    return code;
  }

  private LocalDate parseDate(String raw) {
    return raw == null || raw.isBlank() ? null : LocalDate.parse(raw);
  }

  private List<ProjectMilestoneEntity> createDefaultMilestones(ProjectEntity project) {
    List<ProjectMilestoneEntity> existing =
        projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(project.getId());
    if (!existing.isEmpty()) {
      return existing;
    }
    java.util.ArrayList<ProjectMilestoneEntity> created = new java.util.ArrayList<>();
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

  private NotificationTarget classMembersTarget(Long classId) {
    return NotificationTarget.of(
        NotificationSourceType.CLASS,
        classId,
        "/app/classes?classId=" + classId + "&tab=members",
        "班级成员");
  }

  private NotificationTarget assignmentTarget(Long classId, Long assignmentId) {
    return NotificationTarget.of(
        NotificationSourceType.ASSIGNMENT,
        assignmentId,
        "/app/classes/" + classId + "/assignments/" + assignmentId,
        "班级作业");
  }

  public AssignmentEntity requireAssignmentInClass(Long classId, Long assignmentId) {
    AssignmentEntity assignment =
        assignmentRepository.findById(assignmentId).orElseThrow(() -> new ApiException("作业不存在"));
    if (assignment.getCourse() == null || !assignment.getCourse().getId().equals(classId)) {
      throw new ApiException("作业不属于当前班级");
    }
    return assignment;
  }

  private NotificationTarget groupTaskTarget(Long classId, Long groupTaskId) {
    return NotificationTarget.of(
        NotificationSourceType.GROUP_TASK,
        groupTaskId,
        "/app/classes?classId=" + classId + "&tab=groupTasks",
        "组队任务");
  }

  private NotificationTarget teamTaskTarget(Long teamId, Long taskId) {
    return NotificationTarget.of(
        NotificationSourceType.TASK,
        taskId,
        "/app/teams?teamId=" + teamId,
        "团队任务");
  }

  private record ProjectMilestoneSeed(String title, String description, int weight) {}
}
