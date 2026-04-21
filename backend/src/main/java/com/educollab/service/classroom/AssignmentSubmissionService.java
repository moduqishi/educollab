package com.educollab.service.classroom;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.AssignmentRecord;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionRecord;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionReviewRequest;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionSaveRequest;
import com.educollab.dto.WorkspaceDtos.TeacherAssignmentCourseRecord;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.AssignmentStatus;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.AssignmentSubmissionStatus;
import com.educollab.model.DocumentEntity;
import com.educollab.model.NotificationSourceType;
import com.educollab.model.NotificationType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentRepository;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.CourseRepository;
import com.educollab.repo.DocumentRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.service.AuthService;
import com.educollab.service.ClassroomService;
import com.educollab.service.FileStorageService;
import com.educollab.service.NotificationTarget;
import com.educollab.service.NotificationService;
import com.educollab.service.ProjectActivityService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AssignmentSubmissionService {
  private final AssignmentRepository assignmentRepository;
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final AssignmentSubmissionRecordMapper recordMapper;
  private final ClassroomService classroomService;
  private final AuthService authService;
  private final NotificationService notificationService;
  private final FileStorageService fileStorageService;
  private final ProjectRepository projectRepository;
  private final DocumentRepository documentRepository;
  private final CourseRepository courseRepository;
  private final ProjectActivityService projectActivityService;

  public AssignmentSubmissionService(
      AssignmentRepository assignmentRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      AssignmentSubmissionRecordMapper recordMapper,
      ClassroomService classroomService,
      AuthService authService,
      NotificationService notificationService,
      FileStorageService fileStorageService,
      ProjectRepository projectRepository,
      DocumentRepository documentRepository,
      CourseRepository courseRepository,
      ProjectActivityService projectActivityService) {
    this.assignmentRepository = assignmentRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.recordMapper = recordMapper;
    this.classroomService = classroomService;
    this.authService = authService;
    this.notificationService = notificationService;
    this.fileStorageService = fileStorageService;
    this.projectRepository = projectRepository;
    this.documentRepository = documentRepository;
    this.courseRepository = courseRepository;
    this.projectActivityService = projectActivityService;
  }

  public AssignmentRecord toAssignmentRecord(AssignmentEntity entity, JwtPrincipal principal) {
    return recordMapper.toAssignmentRecord(entity, principal);
  }

  public List<AssignmentRecord> teacherAssignments(JwtPrincipal principal) {
    if (principal.role() != UserRole.TEACHER) {
      throw new ApiException("只有教师可以查看作业批阅面板");
    }
    return assignmentRepository.findByCourseTeacherIdOrderByCreatedAtDesc(principal.userId()).stream()
        .map(item -> recordMapper.toAssignmentRecord(item, principal))
        .toList();
  }

  public List<TeacherAssignmentCourseRecord> teacherAssignmentCourses(JwtPrincipal principal) {
    if (principal.role() != UserRole.TEACHER) {
      throw new ApiException("只有教师可以查看课程作业概览");
    }
    return courseRepository.findByTeacherId(principal.userId()).stream()
        .map(
            course -> {
              List<AssignmentEntity> assignments =
                  assignmentRepository.findByCourseIdOrderByCreatedAtDesc(course.getId());
              int openCount =
                  (int)
                      assignments.stream()
                          .filter(item -> item.getStatus() != AssignmentStatus.CLOSED)
                          .count();
              int closedCount = assignments.size() - openCount;
              int totalSubmissions =
                  assignments.stream()
                      .mapToInt(
                          assignment ->
                              (int)
                                  assignmentSubmissionRepository.findByAssignmentId(assignment.getId())
                                      .stream()
                                      .filter(item -> item.getStatus() != AssignmentSubmissionStatus.DRAFT)
                                      .count())
                      .sum();
              int pendingSubmissions =
                  assignments.stream()
                      .mapToInt(
                          assignment ->
                              (int)
                                  assignmentSubmissionRepository.findByAssignmentId(assignment.getId())
                                      .stream()
                                      .filter(item -> item.getStatus() == AssignmentSubmissionStatus.SUBMITTED)
                                      .count())
                      .sum();
              int gradedSubmissions =
                  assignments.stream()
                      .mapToInt(
                          assignment ->
                              (int)
                                  assignmentSubmissionRepository.findByAssignmentId(assignment.getId())
                                      .stream()
                                      .filter(item -> item.getStatus() == AssignmentSubmissionStatus.GRADED)
                                      .count())
                      .sum();
              String latestDueDate =
                  assignments.stream()
                      .map(AssignmentEntity::getDueDate)
                      .filter(java.util.Objects::nonNull)
                      .max(java.util.Comparator.naturalOrder())
                      .map(java.time.LocalDate::toString)
                      .orElse(null);
              return new TeacherAssignmentCourseRecord(
                  course.getId(),
                  course.getName(),
                  assignments.size(),
                  openCount,
                  closedCount,
                  totalSubmissions,
                  pendingSubmissions,
                  gradedSubmissions,
                  latestDueDate);
            })
        .sorted(
            java.util.Comparator.comparing(
                    TeacherAssignmentCourseRecord::pendingSubmissions,
                    java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder()))
                .thenComparing(TeacherAssignmentCourseRecord::className))
        .toList();
  }

  public AssignmentSubmissionRecord mySubmission(
      Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    classroomService.requireClassVisible(classId, principal);
    UserEntity student = authService.getUser(principal.userId());
    if (principal.role() != UserRole.STUDENT) {
      throw new ApiException("只有学生可以查看自己的作业提交");
    }
    return assignmentSubmissionRepository.findByAssignmentIdAndStudentId(assignmentId, principal.userId())
        .map(recordMapper::toSubmissionRecord)
        .orElseGet(() -> recordMapper.toPlaceholderSubmissionRecord(assignment, student));
  }

  @Transactional
  public AssignmentSubmissionRecord saveMySubmissionDraft(
      Long classId,
      Long assignmentId,
      AssignmentSubmissionSaveRequest request,
      JwtPrincipal principal) {
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    classroomService.requireStudentInClass(classId, principal);
    ensureAssignmentOpenForSubmit(assignment, false);

    AssignmentSubmissionEntity entity = getOrCreateSubmission(assignment, principal);
    applySubmissionPayload(classId, entity, request, principal);
    entity.setStatus(AssignmentSubmissionStatus.DRAFT);
    assignmentSubmissionRepository.save(entity);
    return recordMapper.toSubmissionRecord(entity);
  }

  @Transactional
  public AssignmentSubmissionRecord submitMySubmission(
      Long classId,
      Long assignmentId,
      AssignmentSubmissionSaveRequest request,
      JwtPrincipal principal) {
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    classroomService.requireStudentInClass(classId, principal);
    ensureAssignmentOpenForSubmit(assignment, true);

    UserEntity student = authService.getUser(principal.userId());
    AssignmentSubmissionEntity entity = getOrCreateSubmission(assignment, principal);
    boolean firstSubmission = entity.getSubmittedAt() == null;
    applySubmissionPayload(classId, entity, request, principal);
    ensureSubmissionHasMaterial(entity);
    entity.setStatus(AssignmentSubmissionStatus.SUBMITTED);
    entity.setSubmittedAt(LocalDateTime.now());
    entity.setAttemptCount((entity.getAttemptCount() == null ? 0 : entity.getAttemptCount()) + 1);
    assignmentSubmissionRepository.save(entity);
    projectActivityService.recordAssignmentSubmitted(entity);

    if (assignment.getCourse() != null && assignment.getCourse().getTeacher() != null) {
      String action = firstSubmission ? "提交了" : "重新提交了";
      notificationService.create(
          assignment.getCourse().getTeacher(),
          "收到作业提交",
          student.getName() + action + "作业《" + assignment.getTitle() + "》",
          NotificationType.TASK,
          assignmentTarget(classId, assignmentId));
    }
    return recordMapper.toSubmissionRecord(entity);
  }

  public List<AssignmentSubmissionRecord> submissionsForTeacher(
      Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    classroomService.requireTeacherClass(classId, principal);
    Map<Long, AssignmentSubmissionEntity> submissionsByStudentId =
        assignmentSubmissionRepository.findByAssignmentId(assignmentId).stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    item -> item.getStudent().getId(),
                    Function.identity(),
                    (left, right) -> right));
    return recordMapper.studentMembers(classId).stream()
        .map(
            member ->
                submissionsByStudentId.containsKey(member.getUser().getId())
                    ? recordMapper.toSubmissionRecord(submissionsByStudentId.get(member.getUser().getId()))
                    : recordMapper.toPlaceholderSubmissionRecord(assignment, member.getUser()))
        .toList();
  }

  @Transactional
  public AssignmentSubmissionRecord deleteMySubmissionAttachment(
      Long classId, Long assignmentId, Long fileId, JwtPrincipal principal) {
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    classroomService.requireStudentInClass(classId, principal);
    ensureAssignmentOpenForSubmit(assignment, false);
    AssignmentSubmissionEntity entity =
        assignmentSubmissionRepository
            .findByAssignmentIdAndStudentId(assignmentId, principal.userId())
            .orElseThrow(() -> new ApiException("你还没有提交作业"));
    if (entity.getId() == null) {
      throw new ApiException("当前提交记录不存在");
    }
    fileStorageService.deleteAssignmentSubmissionFile(entity.getId(), fileId);
    return recordMapper.toSubmissionRecord(entity);
  }

  @Transactional
  public AssignmentSubmissionRecord reviewSubmission(
      Long classId,
      Long assignmentId,
      Long submissionId,
      AssignmentSubmissionReviewRequest request,
      JwtPrincipal principal) {
    classroomService.requireTeacherClass(classId, principal);
    AssignmentEntity assignment = classroomService.requireAssignmentInClass(classId, assignmentId);
    AssignmentSubmissionEntity entity =
        assignmentSubmissionRepository.findById(submissionId)
            .orElseThrow(() -> new ApiException("作业提交不存在"));
    if (!entity.getAssignment().getId().equals(assignment.getId())) {
      throw new ApiException("作业提交与当前作业不匹配");
    }
    AssignmentSubmissionStatus status = parseReviewStatus(request.status());
    Integer score = request.score();
    if (score != null && (score < 0 || score > 100)) {
      throw new ApiException("评分必须在 0 到 100 之间");
    }
    entity.setStatus(status);
    entity.setScore(score);
    entity.setTeacherFeedback(trimToNull(request.teacherFeedback()));
    entity.setReviewedAt(LocalDateTime.now());
    assignmentSubmissionRepository.save(entity);
    notificationService.create(
        entity.getStudent(),
        "作业已批阅",
        "你的作业《" + assignment.getTitle() + "》已有新的批阅结果",
        NotificationType.TASK,
        assignmentTarget(classId, assignmentId));
    return recordMapper.toSubmissionRecord(entity);
  }

  private AssignmentSubmissionStatus parseReviewStatus(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank()) {
      return AssignmentSubmissionStatus.GRADED;
    }
    AssignmentSubmissionStatus status = AssignmentSubmissionStatus.valueOf(rawStatus);
    if (status != AssignmentSubmissionStatus.RETURNED && status != AssignmentSubmissionStatus.GRADED) {
      throw new ApiException("教师批阅只能设置为 RETURNED 或 GRADED");
    }
    return status;
  }

  private AssignmentSubmissionEntity getOrCreateSubmission(
      AssignmentEntity assignment, JwtPrincipal principal) {
    UserEntity student = authService.getUser(principal.userId());
    AssignmentSubmissionEntity entity =
        assignmentSubmissionRepository
            .findByAssignmentIdAndStudentId(assignment.getId(), principal.userId())
            .orElseGet(AssignmentSubmissionEntity::new);
    entity.setAssignment(assignment);
    entity.setStudent(student);
    if (entity.getStatus() == null) {
      entity.setStatus(AssignmentSubmissionStatus.DRAFT);
    }
    return entity;
  }

  private void applySubmissionPayload(
      Long classId,
      AssignmentSubmissionEntity entity,
      AssignmentSubmissionSaveRequest request,
      JwtPrincipal principal) {
    entity.setContent(trimToNull(request.content()));
    entity.setSubmissionUrl(trimToNull(request.submissionUrl()));
    entity.setLinkedProject(resolveLinkedProject(classId, request.linkedProjectId(), principal));
    entity.setLinkedDocument(resolveLinkedDocument(entity.getLinkedProject(), request.linkedDocumentId()));
  }

  private ProjectEntity resolveLinkedProject(
      Long classId, Long linkedProjectId, JwtPrincipal principal) {
    if (linkedProjectId == null) {
      return null;
    }
    ProjectEntity project =
        projectRepository.findById(linkedProjectId).orElseThrow(() -> new ApiException("绑定项目不存在"));
    if (project.getCourse() == null || !project.getCourse().getId().equals(classId)) {
      throw new ApiException("只能绑定当前课程下的项目");
    }
    if (principal.role() == UserRole.STUDENT) {
      classroomService.requireStudentInClass(classId, principal);
    }
    return project;
  }

  private DocumentEntity resolveLinkedDocument(ProjectEntity linkedProject, Long linkedDocumentId) {
    if (linkedDocumentId == null) {
      return null;
    }
    if (linkedProject == null) {
      throw new ApiException("请先选择关联项目，再选择主文档");
    }
    DocumentEntity document =
        documentRepository.findById(linkedDocumentId).orElseThrow(() -> new ApiException("绑定文档不存在"));
    if (document.getProject() == null || !document.getProject().getId().equals(linkedProject.getId())) {
      throw new ApiException("只能绑定所选项目下的文档");
    }
    return document;
  }

  private void ensureSubmissionHasMaterial(AssignmentSubmissionEntity entity) {
    boolean hasBaseContent =
        entity.getContent() != null
            || entity.getSubmissionUrl() != null
            || entity.getLinkedProject() != null
            || entity.getLinkedDocument() != null;
    boolean hasAttachment =
        entity.getId() != null
            && !fileStorageService
                .list(com.educollab.model.FileOwnerType.ASSIGNMENT_SUBMISSION, entity.getId())
                .isEmpty();
    if (!hasBaseContent && !hasAttachment) {
      throw new ApiException("请至少填写说明、提交链接、关联项目/文档，或上传附件后再提交");
    }
  }

  private void ensureAssignmentOpenForSubmit(AssignmentEntity assignment, boolean strictSubmit) {
    if (assignment.getStatus() == AssignmentStatus.CLOSED) {
      throw new ApiException(strictSubmit ? "该作业已关闭提交" : "该作业已关闭，不能再修改提交内容");
    }
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private NotificationTarget assignmentTarget(Long classId, Long assignmentId) {
    return NotificationTarget.of(
        NotificationSourceType.ASSIGNMENT,
        assignmentId,
        "/app/classes/" + classId + "/assignments/" + assignmentId,
        "班级作业");
  }
}
