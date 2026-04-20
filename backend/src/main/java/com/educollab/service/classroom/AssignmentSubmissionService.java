package com.educollab.service.classroom;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.AssignmentRecord;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionRecord;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionReviewRequest;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionSaveRequest;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.AssignmentSubmissionStatus;
import com.educollab.model.NotificationSourceType;
import com.educollab.model.NotificationType;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentRepository;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.service.AuthService;
import com.educollab.service.ClassroomService;
import com.educollab.service.FileStorageService;
import com.educollab.service.NotificationTarget;
import com.educollab.service.NotificationService;
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

  public AssignmentSubmissionService(
      AssignmentRepository assignmentRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      AssignmentSubmissionRecordMapper recordMapper,
      ClassroomService classroomService,
      AuthService authService,
      NotificationService notificationService,
      FileStorageService fileStorageService) {
    this.assignmentRepository = assignmentRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.recordMapper = recordMapper;
    this.classroomService = classroomService;
    this.authService = authService;
    this.notificationService = notificationService;
    this.fileStorageService = fileStorageService;
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

  public AssignmentSubmissionRecord mySubmission(
      Long classId, Long assignmentId, JwtPrincipal principal) {
    AssignmentEntity assignment = requireAssignmentInClass(classId, assignmentId);
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
  public AssignmentSubmissionRecord saveMySubmission(
      Long classId,
      Long assignmentId,
      AssignmentSubmissionSaveRequest request,
      JwtPrincipal principal) {
    AssignmentEntity assignment = requireAssignmentInClass(classId, assignmentId);
    classroomService.requireStudentInClass(classId, principal);

    UserEntity student = authService.getUser(principal.userId());
    AssignmentSubmissionEntity entity =
        assignmentSubmissionRepository.findByAssignmentIdAndStudentId(assignmentId, principal.userId())
            .orElseGet(AssignmentSubmissionEntity::new);
    boolean firstSubmission = entity.getId() == null;
    entity.setAssignment(assignment);
    entity.setStudent(student);
    entity.setContent(trimToNull(request.content()));
    entity.setSubmissionUrl(trimToNull(request.submissionUrl()));
    entity.setStatus(AssignmentSubmissionStatus.SUBMITTED);
    entity.setScore(null);
    entity.setTeacherFeedback(null);
    entity.setReviewedAt(null);
    entity.setSubmittedAt(LocalDateTime.now());
    entity.setAttemptCount((entity.getAttemptCount() == null ? 0 : entity.getAttemptCount()) + 1);
    assignmentSubmissionRepository.save(entity);

    if (assignment.getCourse() != null && assignment.getCourse().getTeacher() != null) {
      String action = firstSubmission ? "提交了" : "更新了";
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
    AssignmentEntity assignment = requireAssignmentInClass(classId, assignmentId);
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
    requireAssignmentInClass(classId, assignmentId);
    classroomService.requireStudentInClass(classId, principal);
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
    AssignmentEntity assignment = requireAssignmentInClass(classId, assignmentId);
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

  private AssignmentEntity requireAssignmentInClass(Long classId, Long assignmentId) {
    AssignmentEntity assignment =
        assignmentRepository
            .findById(assignmentId)
            .orElseThrow(() -> new ApiException("作业不存在"));
    if (assignment.getCourse() == null || !assignment.getCourse().getId().equals(classId)) {
      throw new ApiException("作业不属于当前班级");
    }
    return assignment;
  }

  private AssignmentSubmissionStatus parseReviewStatus(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank()) {
      return AssignmentSubmissionStatus.GRADED;
    }
    AssignmentSubmissionStatus status = AssignmentSubmissionStatus.valueOf(rawStatus);
    if (status == AssignmentSubmissionStatus.SUBMITTED) {
      throw new ApiException("教师批阅只能设置为 RETURNED 或 GRADED");
    }
    return status;
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
