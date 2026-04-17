package com.educollab;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.common.security.JwtService;
import com.educollab.dto.WorkspaceDtos.AssignmentSaveRequest;
import com.educollab.dto.WorkspaceDtos.DiscussionSaveRequest;
import com.educollab.dto.WorkspaceDtos.DocumentAutosaveRequest;
import com.educollab.dto.WorkspaceDtos.DocumentSaveRequest;
import com.educollab.dto.WorkspaceDtos.TaskSaveRequest;
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
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.NotificationRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.UserRepository;
import com.educollab.service.ClassroomService;
import com.educollab.service.DocumentService;
import com.educollab.service.NotificationService;
import com.educollab.service.NotificationTarget;
import com.educollab.service.WorkspaceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(classes = EduCollabApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationControllerIntegrationTests {
  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JwtService jwtService;
  @Autowired private UserRepository userRepository;
  @Autowired private NotificationRepository notificationRepository;
  @Autowired private NotificationService notificationService;
  @Autowired private ProjectRepository projectRepository;
  @Autowired private ProjectMemberRepository projectMemberRepository;
  @Autowired private WorkspaceService workspaceService;
  @Autowired private DocumentService documentService;
  @Autowired private CourseRepository courseRepository;
  @Autowired private ClassMemberRepository classMemberRepository;
  @Autowired private ClassroomService classroomService;

  @Test
  void notificationEndpointsRespectOwnershipAndBatchRead() throws Exception {
    UserEntity owner = createUser("owner@example.com", "Owner", UserRole.STUDENT);
    UserEntity other = createUser("other@example.com", "Other", UserRole.STUDENT);

    notificationService.create(
        owner,
        "任务通知",
        "你有一条新的任务通知",
        NotificationType.TASK,
        NotificationTarget.of(
            NotificationSourceType.TASK,
            42L,
            "/app/tasks/42",
            "任务详情"));
    notificationService.create(
        owner,
        "系统通知",
        "这是一条没有来源信息的旧通知",
        NotificationType.SYSTEM,
        NotificationTarget.none());
    notificationService.create(
        other,
        "其他人的通知",
        "不应该被当前用户读到",
        NotificationType.SYSTEM,
        NotificationTarget.none());

    List<NotificationEntity> ownerNotifications =
        notificationRepository.findByUserIdOrderByCreatedAtDesc(owner.getId());
    NotificationEntity targetNotification = ownerNotifications.stream()
        .filter(item -> "任务通知".equals(item.getTitle()))
        .findFirst()
        .orElseThrow();
    NotificationEntity legacyNotification = ownerNotifications.stream()
        .filter(item -> "系统通知".equals(item.getTitle()))
        .findFirst()
        .orElseThrow();
    NotificationEntity otherNotification = notificationRepository.findByUserIdOrderByCreatedAtDesc(other.getId()).getFirst();

    String listPayload = mockMvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(owner)))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
    JsonNode listNode = objectMapper.readTree(listPayload);
    assertThat(listNode).hasSize(2);

    JsonNode targetNode = findById(listNode, targetNotification.getId());
    assertThat(targetNode.get("sourceType").asText()).isEqualTo("TASK");
    assertThat(targetNode.get("sourcePath").asText()).isEqualTo("/app/tasks/42");
    assertThat(targetNode.get("sourceLabel").asText()).isEqualTo("任务详情");

    JsonNode legacyNode = findById(listNode, legacyNotification.getId());
    assertThat(legacyNode.get("sourceType").isNull()).isTrue();
    assertThat(legacyNode.get("sourcePath").isNull()).isTrue();
    assertThat(legacyNode.get("sourceLabel").isNull()).isTrue();

    String detailPayload =
        mockMvc
            .perform(
                get("/api/notifications/{id}", targetNotification.getId())
                    .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode detailNode = objectMapper.readTree(detailPayload);
    assertThat(detailNode.get("id").asLong()).isEqualTo(targetNotification.getId());
    assertThat(detailNode.get("sourcePath").asText()).isEqualTo("/app/tasks/42");

    mockMvc
        .perform(
            get("/api/notifications/{id}", targetNotification.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(other)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            post("/api/notifications/{id}/read", targetNotification.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
        .andExpect(status().isOk());
    assertThat(notificationRepository.findById(targetNotification.getId()).orElseThrow().isRead()).isTrue();

    mockMvc
        .perform(post("/api/notifications/read-all").header(HttpHeaders.AUTHORIZATION, bearer(owner)))
        .andExpect(status().isOk());

    assertThat(notificationRepository.findById(legacyNotification.getId()).orElseThrow().isRead()).isTrue();
    assertThat(notificationRepository.findById(otherNotification.getId()).orElseThrow().isRead()).isFalse();
  }

  @Test
  void businessServicesPopulateNotificationTargets() {
    UserEntity author = createUser("author@example.com", "Author", UserRole.STUDENT);
    UserEntity teammate = createUser("teammate@example.com", "Teammate", UserRole.STUDENT);
    UserEntity teacher = createUser("teacher@example.com", "Teacher", UserRole.TEACHER);

    ProjectEntity project = createProject("通知项目");
    addProjectMember(project, author, true);
    addProjectMember(project, teammate, false);

    workspaceService.saveTask(
        new TaskSaveRequest(project.getId(), "实现通知详情", "补齐路由", "TODO", teammate.getId(), null, "HIGH"),
        null,
        principal(author));
    NotificationEntity taskNotification = latestNotificationFor(teammate);
    assertThat(taskNotification.getSourceType()).isEqualTo(NotificationSourceType.TASK);
    assertThat(taskNotification.getSourcePath()).isEqualTo("/app/tasks/" + taskNotification.getSourceId());
    assertThat(taskNotification.getSourceLabel()).isEqualTo("任务详情");

    runAs(
        author,
        () ->
            workspaceService.createDiscussion(
                new DiscussionSaveRequest(project.getId(), "通知详情方案", "请大家确认下实现范围", "GENERAL"),
                principal(author)));
    NotificationEntity discussionNotification = latestNotificationFor(teammate);
    assertThat(discussionNotification.getSourceType()).isEqualTo(NotificationSourceType.DISCUSSION);
    assertThat(discussionNotification.getSourcePath())
        .isEqualTo("/app/projects/" + project.getId() + "/discussions/" + discussionNotification.getSourceId());
    assertThat(discussionNotification.getSourceLabel()).isEqualTo("项目讨论");

    var document =
        documentService.create(
            new DocumentSaveRequest(project.getId(), "通知设计稿", "<p>初始内容</p>"),
            principal(author));
    documentService.autosave(
        document.id(),
        new DocumentAutosaveRequest("<p>更新后的内容</p>", "更新后的内容", false, null),
        principal(author));
    NotificationEntity documentNotification = latestNotificationFor(teammate);
    assertThat(documentNotification.getSourceType()).isEqualTo(NotificationSourceType.DOCUMENT);
    assertThat(documentNotification.getSourcePath())
        .isEqualTo("/app/projects/" + project.getId() + "/documents/" + document.id());
    assertThat(documentNotification.getSourceLabel()).isEqualTo("项目文档");

    CourseEntity course = createCourse("软件工程", teacher);
    addClassMember(course, teammate, ClassMemberRole.STUDENT, "INVITE");
    classroomService.createAssignment(
        course.getId(),
        new AssignmentSaveRequest("第一次作业", "提交原型图", null, null),
        principal(teacher));
    NotificationEntity assignmentNotification = latestNotificationFor(teammate);
    assertThat(assignmentNotification.getSourceType()).isEqualTo(NotificationSourceType.ASSIGNMENT);
    assertThat(assignmentNotification.getSourcePath())
        .isEqualTo("/app/classes/" + course.getId() + "/assignments/" + assignmentNotification.getSourceId());
    assertThat(assignmentNotification.getSourceLabel()).isEqualTo("班级作业");
  }

  private UserEntity createUser(String email, String name, UserRole role) {
    UserEntity user = new UserEntity();
    user.setEmail(email);
    user.setName(name);
    user.setPasswordHash("test-password");
    user.setRole(role);
    return userRepository.save(user);
  }

  private ProjectEntity createProject(String name) {
    ProjectEntity project = new ProjectEntity();
    project.setName(name);
    project.setDescription("测试项目");
    project.setType(ProjectType.NON_CODE);
    project.setStatus(ProjectStatus.ACTIVE);
    project.setProgress(0);
    return projectRepository.save(project);
  }

  private void addProjectMember(ProjectEntity project, UserEntity user, boolean ownerFlag) {
    ProjectMemberEntity member = new ProjectMemberEntity();
    member.setProject(project);
    member.setUser(user);
    member.setOwnerFlag(ownerFlag);
    projectMemberRepository.save(member);
  }

  private CourseEntity createCourse(String name, UserEntity teacher) {
    CourseEntity course = new CourseEntity();
    course.setName(name);
    course.setTeacher(teacher);
    course.setClassCode("CLASS" + teacher.getId());
    return courseRepository.save(course);
  }

  private void addClassMember(
      CourseEntity course, UserEntity user, ClassMemberRole role, String joinedVia) {
    ClassMemberEntity member = new ClassMemberEntity();
    member.setCourse(course);
    member.setUser(user);
    member.setRole(role);
    member.setJoinedVia(joinedVia);
    classMemberRepository.save(member);
  }

  private JwtPrincipal principal(UserEntity user) {
    return new JwtPrincipal(user.getId(), user.getEmail(), user.getRole());
  }

  private String bearer(UserEntity user) {
    return "Bearer " + jwtService.generate(user.getId(), user.getEmail(), user.getRole());
  }

  private NotificationEntity latestNotificationFor(UserEntity user) {
    return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
        .max(Comparator.comparing(NotificationEntity::getCreatedAt).thenComparing(NotificationEntity::getId))
        .orElseThrow();
  }

  private JsonNode findById(JsonNode arrayNode, long id) {
    for (JsonNode node : arrayNode) {
      if (node.get("id").asLong() == id) {
        return node;
      }
    }
    throw new AssertionError("Notification not found: " + id);
  }

  private <T> T runAs(UserEntity user, Supplier<T> action) {
    var authentication =
        new UsernamePasswordAuthenticationToken(principal(user), null, List.of());
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    try {
      return action.get();
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
