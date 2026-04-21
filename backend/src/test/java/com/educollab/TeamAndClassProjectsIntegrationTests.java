package com.educollab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.educollab.common.security.JwtService;
import com.educollab.dto.WorkspaceDtos.TaskSaveRequest;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.ClassMemberRole;
import com.educollab.model.CourseEntity;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.ProjectStatus;
import com.educollab.model.ProjectType;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskPriority;
import com.educollab.model.TaskStatus;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.TeamSource;
import com.educollab.model.TeamStatus;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectMilestoneRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.repo.TeamRepository;
import com.educollab.repo.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = EduCollabApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TeamAndClassProjectsIntegrationTests {
  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JwtService jwtService;
  @Autowired private UserRepository userRepository;
  @Autowired private CourseRepository courseRepository;
  @Autowired private ClassMemberRepository classMemberRepository;
  @Autowired private TeamRepository teamRepository;
  @Autowired private TeamMemberRepository teamMemberRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private ProjectMilestoneRepository projectMilestoneRepository;
  @Autowired private ProjectMemberRepository projectMemberRepository;
  @Autowired private TaskRepository taskRepository;

  @Test
  void sameCourseStudentCanOpenCourseTeamDetailAndReadProjectBoard() throws Exception {
    UserEntity teacher = createUser("teacher-team@example.com", "Teacher", UserRole.TEACHER);
    UserEntity leader = createUser("leader-team@example.com", "Leader", UserRole.STUDENT);
    UserEntity classmate = createUser("classmate-team@example.com", "Classmate", UserRole.STUDENT);

    CourseEntity course = createCourse("软件工程实践", "SE-PRACTICE", teacher);
    addClassMember(course, leader, ClassMemberRole.STUDENT);
    addClassMember(course, classmate, ClassMemberRole.STUDENT);

    TeamEntity team = createCourseTeam(course, leader, "第1组", 1);
    addTeamMember(team, leader);

    ProjectEntity project = createProject(course, team, "课程协作平台", 50);
    addProjectMember(project, leader, true);
    createTask(project, leader, "完成首页", TaskStatus.DONE);
    createTask(project, leader, "完成团队页", TaskStatus.IN_PROGRESS);

    String teamPayload =
        mockMvc
            .perform(get("/api/teams/{id}", team.getId()).header(HttpHeaders.AUTHORIZATION, bearer(classmate)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode teamRoot = objectMapper.readTree(teamPayload);
    assertThat(teamRoot.get("name").asText()).isEqualTo("第1组");
    assertThat(teamRoot.get("courseName").asText()).isEqualTo(course.getName());
    assertThat(teamRoot.get("teacherView").asBoolean()).isFalse();
    assertThat(teamRoot.get("currentUserMember").asBoolean()).isFalse();
    assertThat(teamRoot.get("project").get("projectName").asText()).isEqualTo(project.getName());
    assertThat(teamRoot.get("project").get("completedTaskCount").asInt()).isEqualTo(1);
    assertThat(teamRoot.get("project").get("taskCount").asInt()).isEqualTo(2);

    String classProjectsPayload =
        mockMvc
            .perform(get("/api/classes/{id}/projects", course.getId()).header(HttpHeaders.AUTHORIZATION, bearer(classmate)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode projectsRoot = objectMapper.readTree(classProjectsPayload);
    assertThat(projectsRoot).hasSize(1);
    JsonNode row = projectsRoot.get(0);
    assertThat(row.get("teamId").asLong()).isEqualTo(team.getId());
    assertThat(row.get("groupOrder").asInt()).isEqualTo(1);
    assertThat(row.get("projectId").asLong()).isEqualTo(project.getId());
    assertThat(row.get("completedTaskCount").asInt()).isEqualTo(1);
    assertThat(row.get("totalTaskCount").asInt()).isEqualTo(2);
    assertThat(row.get("progress").asInt()).isEqualTo(50);
  }


  @Test
  void studentCannotReadOtherTeamProjectInSameCourseWithoutMembership() throws Exception {
    UserEntity teacher = createUser("teacher-project-access@example.com", "Teacher", UserRole.TEACHER);
    UserEntity student = createUser("student-project-access@example.com", "Student", UserRole.STUDENT);
    UserEntity otherLeader = createUser("other-leader-project-access@example.com", "OtherLeader", UserRole.STUDENT);

    CourseEntity course = createCourse("软件工程二", "SE2", teacher);

    TeamEntity ownTeam = createCourseTeam(course, student, "第1组", 1);
    addTeamMember(ownTeam, student);
    ProjectEntity ownProject = createProject(course, ownTeam, "我的项目", 0);
    addProjectMember(ownProject, student, true);

    TeamEntity otherTeam = createCourseTeam(course, otherLeader, "第2组", 2);
    addTeamMember(otherTeam, otherLeader);
    ProjectEntity otherProject = createProject(course, otherTeam, "其他小组项目", 100);
    addProjectMember(otherProject, otherLeader, true);
    createTask(otherProject, otherLeader, "完成演示", TaskStatus.DONE);

    mockMvc
        .perform(get("/api/projects/{id}", otherProject.getId()).header(HttpHeaders.AUTHORIZATION, bearer(student)))
        .andExpect(status().isBadRequest());

    String projectsPayload =
        mockMvc
            .perform(get("/api/projects").header(HttpHeaders.AUTHORIZATION, bearer(student)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode projectsRoot = objectMapper.readTree(projectsPayload);
    assertThat(projectsRoot).hasSize(1);
    assertThat(projectsRoot.get(0).get("id").asLong()).isEqualTo(ownProject.getId());
  }

  @Test
  void updatingTaskFromTodoToInProgressAutoAssignsOperator() throws Exception {
    UserEntity teacher = createUser("teacher-task-claim@example.com", "Teacher", UserRole.TEACHER);
    UserEntity leader = createUser("leader-task-claim@example.com", "Leader", UserRole.STUDENT);
    UserEntity teammate = createUser("teammate-task-claim@example.com", "Teammate", UserRole.STUDENT);

    CourseEntity course = createCourse("协同开发", "CO-DEV", teacher);
    addClassMember(course, leader, ClassMemberRole.STUDENT);
    addClassMember(course, teammate, ClassMemberRole.STUDENT);

    TeamEntity team = createCourseTeam(course, leader, "第3组", 3);
    addTeamMember(team, leader);
    addTeamMember(team, teammate);

    ProjectEntity project = createProject(course, team, "任务认领项目", 0);
    addProjectMember(project, leader, true);
    addProjectMember(project, teammate, false);

    TaskEntity task = createTask(project, null, "待认领任务", TaskStatus.TODO);

    mockMvc
        .perform(
            put("/api/tasks/{id}", task.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(teammate))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        new TaskSaveRequest(
                            project.getId(),
                            null,
                            task.getTitle(),
                            task.getDescription(),
                            "IN_PROGRESS",
                            null,
                            null,
                            "MEDIUM"))))
        .andExpect(status().isOk());

    TaskEntity updated = taskRepository.findById(task.getId()).orElseThrow();
    assertThat(updated.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
    assertThat(updated.getAssignee()).isNotNull();
    assertThat(updated.getAssignee().getId()).isEqualTo(teammate.getId());
  }


  @Test
  void creatingProjectSeedsMilestonesAndTaskCompletionTracksCompletedAt() throws Exception {
    UserEntity teacher = createUser("teacher-milestones@example.com", "Teacher", UserRole.TEACHER);
    UserEntity leader = createUser("leader-milestones@example.com", "Leader", UserRole.STUDENT);

    CourseEntity course = createCourse("项目管理", "PM-101", teacher);
    addClassMember(course, leader, ClassMemberRole.STUDENT);

    TeamEntity team = createCourseTeam(course, leader, "第4组", 4);
    addTeamMember(team, leader);

    String payload =
        mockMvc
            .perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/teams/{id}/project", team.getId())
                    .header(HttpHeaders.AUTHORIZATION, bearer(leader))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            new com.educollab.dto.WorkspaceDtos.TeamProjectSaveRequest(
                                "里程碑项目",
                                "课程项目",
                                "NON_CODE",
                                LocalDate.now().plusDays(14).toString(),
                                false))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    Long projectId = objectMapper.readTree(payload).get("id").asLong();

    ProjectEntity createdProject = projectRepository.findById(projectId).orElseThrow();
    var milestones = projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(createdProject.getId());
    assertThat(milestones).hasSize(5);
    assertThat(milestones).extracting(item -> item.getTitle())
        .containsExactly("构思阶段", "蓝图搭建", "项目规划", "开发实现", "验收交付");

    TaskRecordResponse created =
        objectMapper.readValue(
            mockMvc
                .perform(
                    org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(leader))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            objectMapper.writeValueAsString(
                                new TaskSaveRequest(
                                    createdProject.getId(),
                                    milestones.get(0).getId(),
                                    "阶段任务",
                                    "完成立项说明",
                                    "DONE",
                                    leader.getId(),
                                    null,
                                    "HIGH"))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(),
            TaskRecordResponse.class);

    TaskEntity doneTask = taskRepository.findById(created.id()).orElseThrow();
    assertThat(doneTask.getMilestone()).isNotNull();
    assertThat(doneTask.getMilestone().getId()).isEqualTo(milestones.get(0).getId());
    assertThat(doneTask.getCompletedAt()).isNotNull();

    mockMvc
        .perform(
            put("/api/tasks/{id}", doneTask.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(leader))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        new TaskSaveRequest(
                            createdProject.getId(),
                            milestones.get(1).getId(),
                            doneTask.getTitle(),
                            doneTask.getDescription(),
                            "IN_PROGRESS",
                            leader.getId(),
                            null,
                            "HIGH"))))
        .andExpect(status().isOk());

    TaskEntity reopened = taskRepository.findById(doneTask.getId()).orElseThrow();
    assertThat(reopened.getMilestone()).isNotNull();
    assertThat(reopened.getMilestone().getId()).isEqualTo(milestones.get(1).getId());
    assertThat(reopened.getCompletedAt()).isNull();
  }

  private record TaskRecordResponse(Long id) {}

  private UserEntity createUser(String email, String name, UserRole role) {
    UserEntity user = new UserEntity();
    user.setEmail(email);
    user.setName(name);
    user.setPasswordHash("test-password");
    user.setRole(role);
    return userRepository.save(user);
  }

  private CourseEntity createCourse(String name, String code, UserEntity teacher) {
    CourseEntity course = new CourseEntity();
    course.setName(name);
    course.setClassCode(code);
    course.setTeacher(teacher);
    return courseRepository.save(course);
  }

  private void addClassMember(CourseEntity course, UserEntity user, ClassMemberRole role) {
    ClassMemberEntity member = new ClassMemberEntity();
    member.setCourse(course);
    member.setUser(user);
    member.setRole(role);
    member.setJoinedVia("INVITE");
    classMemberRepository.save(member);
  }

  private TeamEntity createCourseTeam(CourseEntity course, UserEntity leader, String name, int groupOrder) {
    TeamEntity team = new TeamEntity();
    team.setCourse(course);
    team.setLeader(leader);
    team.setName(name);
    team.setSource(TeamSource.COURSE);
    team.setStatus(TeamStatus.FORMING);
    team.setGroupOrder(groupOrder);
    return teamRepository.save(team);
  }

  private void addTeamMember(TeamEntity team, UserEntity user) {
    TeamMemberEntity member = new TeamMemberEntity();
    member.setTeam(team);
    member.setUser(user);
    teamMemberRepository.save(member);
  }

  private ProjectEntity createProject(CourseEntity course, TeamEntity team, String name, int progress) {
    ProjectEntity project = new ProjectEntity();
    project.setCourse(course);
    project.setTeam(team);
    project.setName(name);
    project.setDescription("课程项目");
    project.setType(ProjectType.NON_CODE);
    project.setStatus(ProjectStatus.ACTIVE);
    project.setProgress(progress);
    project.setDueDate(LocalDate.now().plusDays(14));
    return projectRepository.save(project);
  }

  private void addProjectMember(ProjectEntity project, UserEntity user, boolean ownerFlag) {
    ProjectMemberEntity member = new ProjectMemberEntity();
    member.setProject(project);
    member.setUser(user);
    member.setOwnerFlag(ownerFlag);
    projectMemberRepository.save(member);
  }

  private TaskEntity createTask(ProjectEntity project, UserEntity assignee, String title, TaskStatus status) {
    TaskEntity task = new TaskEntity();
    task.setProject(project);
    task.setTitle(title);
    task.setDescription("任务描述");
    task.setStatus(status);
    task.setPriority(TaskPriority.MEDIUM);
    task.setAssignee(assignee);
    return taskRepository.save(task);
  }

  private String bearer(UserEntity user) {
    return "Bearer " + jwtService.generate(user.getId(), user.getEmail(), user.getRole());
  }
}
