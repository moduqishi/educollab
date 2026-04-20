package com.educollab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.educollab.common.security.JwtService;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.AssignmentSubmissionStatus;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.ClassMemberRole;
import com.educollab.model.CourseEntity;
import com.educollab.model.GroupTaskEntity;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.ProjectStatus;
import com.educollab.model.ProjectType;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskPriority;
import com.educollab.model.TaskStatus;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentRepository;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.GroupTaskRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.repo.TeamRepository;
import com.educollab.repo.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = EduCollabApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TeacherControllerIntegrationTests {
  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JwtService jwtService;
  @Autowired private UserRepository userRepository;
  @Autowired private CourseRepository courseRepository;
  @Autowired private ClassMemberRepository classMemberRepository;
  @Autowired private AssignmentRepository assignmentRepository;
  @Autowired private AssignmentSubmissionRepository assignmentSubmissionRepository;
  @Autowired private GroupTaskRepository groupTaskRepository;
  @Autowired private TeamRepository teamRepository;
  @Autowired private TeamMemberRepository teamMemberRepository;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private ProjectMemberRepository projectMemberRepository;
  @Autowired private TaskRepository taskRepository;

  @Test
  void teacherOverviewReturnsClassAssignmentAndGroupTaskSummaries() throws Exception {
    UserEntity teacher = createUser("teacher-overview@example.com", "Teacher", UserRole.TEACHER);
    UserEntity student = createUser("student-overview@example.com", "Student", UserRole.STUDENT);

    CourseEntity course = createCourse("软件工程 2026 春", "SE2026", teacher);
    addClassMember(course, student, ClassMemberRole.STUDENT);

    GroupTaskEntity groupTask = createGroupTask(course, teacher, "课程大作业");
    TeamEntity team = createTeam(course, groupTask, student, "第一组");
    addTeamMember(team, student);

    ProjectEntity project = createProject(course, groupTask, team, "教学闭环项目", 68);
    addProjectMember(project, student, true);
    createDoneTask(project, student, "完成原型");

    AssignmentEntity assignmentA = createAssignment(course, "第一次作业");
    AssignmentEntity assignmentB = createAssignment(course, "第二次作业");
    createSubmission(assignmentA, student, AssignmentSubmissionStatus.SUBMITTED);
    createSubmission(assignmentB, student, AssignmentSubmissionStatus.GRADED);

    String payload =
        mockMvc
            .perform(get("/api/teacher/overview").header(HttpHeaders.AUTHORIZATION, bearer(teacher)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode root = objectMapper.readTree(payload);
    assertThat(root.get("classCount").asInt()).isEqualTo(1);
    assertThat(root.get("activeStudents").asInt()).isEqualTo(1);
    assertThat(root.get("pendingReviews").asInt()).isEqualTo(1);

    JsonNode classSummary = root.get("classes").get(0);
    assertThat(classSummary.get("id").asLong()).isEqualTo(course.getId());
    assertThat(classSummary.get("assignmentCount").asInt()).isEqualTo(2);
    assertThat(classSummary.get("groupTaskCount").asInt()).isEqualTo(1);
    assertThat(classSummary.get("pendingReviews").asInt()).isEqualTo(1);

    JsonNode assignmentNode = findById(root.get("recentAssignments"), assignmentA.getId(), assignmentB.getId());
    assertThat(assignmentNode.get("classId").asLong()).isEqualTo(course.getId());

    JsonNode groupTaskNode = root.get("recentGroupTasks").get(0);
    assertThat(groupTaskNode.get("id").asLong()).isEqualTo(groupTask.getId());
    assertThat(groupTaskNode.get("teamCount").asInt()).isEqualTo(1);
    assertThat(groupTaskNode.get("projectCount").asInt()).isEqualTo(1);

    JsonNode contributionNode = root.get("contributionRows").get(0);
    assertThat(contributionNode.get("projectId").asLong()).isEqualTo(project.getId());
    assertThat(contributionNode.get("teamId").asLong()).isEqualTo(team.getId());
    assertThat(contributionNode.get("classId").asLong()).isEqualTo(course.getId());
    assertThat(contributionNode.get("className").asText()).isEqualTo(course.getName());
  }

  @Test
  void teacherOverviewRejectsStudentAccess() throws Exception {
    UserEntity student = createUser("student-no-access@example.com", "Student", UserRole.STUDENT);

    mockMvc
        .perform(get("/api/teacher/overview").header(HttpHeaders.AUTHORIZATION, bearer(student)))
        .andExpect(status().isBadRequest());
  }

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

  private GroupTaskEntity createGroupTask(CourseEntity course, UserEntity teacher, String title) {
    GroupTaskEntity entity = new GroupTaskEntity();
    entity.setCourse(course);
    entity.setCreatedBy(teacher);
    entity.setTitle(title);
    entity.setDescription("分组完成课程项目");
    entity.setMinMembers(2);
    entity.setMaxMembers(4);
    entity.setDueDate(LocalDate.now().plusDays(14));
    return groupTaskRepository.save(entity);
  }

  private TeamEntity createTeam(CourseEntity course, GroupTaskEntity groupTask, UserEntity leader, String name) {
    TeamEntity team = new TeamEntity();
    team.setCourse(course);
    team.setGroupTask(groupTask);
    team.setLeader(leader);
    team.setName(name);
    return teamRepository.save(team);
  }

  private void addTeamMember(TeamEntity team, UserEntity user) {
    TeamMemberEntity member = new TeamMemberEntity();
    member.setTeam(team);
    member.setUser(user);
    teamMemberRepository.save(member);
  }

  private ProjectEntity createProject(
      CourseEntity course, GroupTaskEntity groupTask, TeamEntity team, String name, int progress) {
    ProjectEntity project = new ProjectEntity();
    project.setCourse(course);
    project.setGroupTask(groupTask);
    project.setTeam(team);
    project.setName(name);
    project.setDescription("老师端聚合测试项目");
    project.setType(ProjectType.NON_CODE);
    project.setStatus(ProjectStatus.ACTIVE);
    project.setProgress(progress);
    project.setDueDate(LocalDate.now().plusDays(21));
    return projectRepository.save(project);
  }

  private void addProjectMember(ProjectEntity project, UserEntity user, boolean ownerFlag) {
    ProjectMemberEntity member = new ProjectMemberEntity();
    member.setProject(project);
    member.setUser(user);
    member.setOwnerFlag(ownerFlag);
    projectMemberRepository.save(member);
  }

  private void createDoneTask(ProjectEntity project, UserEntity assignee, String title) {
    TaskEntity task = new TaskEntity();
    task.setProject(project);
    task.setTitle(title);
    task.setDescription("已完成的任务");
    task.setStatus(TaskStatus.DONE);
    task.setPriority(TaskPriority.HIGH);
    task.setAssignee(assignee);
    taskRepository.save(task);
  }

  private AssignmentEntity createAssignment(CourseEntity course, String title) {
    AssignmentEntity assignment = new AssignmentEntity();
    assignment.setCourse(course);
    assignment.setTitle(title);
    assignment.setSummary("请提交课堂阶段成果");
    assignment.setDueDate(LocalDate.now().plusDays(7));
    return assignmentRepository.save(assignment);
  }

  private void createSubmission(
      AssignmentEntity assignment, UserEntity student, AssignmentSubmissionStatus status) {
    AssignmentSubmissionEntity submission = new AssignmentSubmissionEntity();
    submission.setAssignment(assignment);
    submission.setStudent(student);
    submission.setStatus(status);
    submission.setContent("提交说明");
    submission.setSubmissionUrl("https://example.com/submission");
    submission.setAttemptCount(1);
    submission.setSubmittedAt(LocalDateTime.now());
    if (status == AssignmentSubmissionStatus.GRADED) {
      submission.setScore(95);
      submission.setTeacherFeedback("完成得不错");
      submission.setReviewedAt(LocalDateTime.now());
    }
    assignmentSubmissionRepository.save(submission);
  }

  private JsonNode findById(JsonNode arrayNode, long firstId, long secondId) {
    for (JsonNode node : arrayNode) {
      long current = node.get("id").asLong();
      if (current == firstId || current == secondId) {
        return node;
      }
    }
    throw new AssertionError("Expected record not found");
  }

  private String bearer(UserEntity user) {
    return "Bearer " + jwtService.generate(user.getId(), user.getEmail(), user.getRole());
  }
}
