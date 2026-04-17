package com.educollab.service.classroom;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.AssignmentRecord;
import com.educollab.dto.WorkspaceDtos.AssignmentSubmissionRecord;
import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.AssignmentSubmissionStatus;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.ClassMemberRole;
import com.educollab.model.FileOwnerType;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.service.FileStorageService;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class AssignmentSubmissionRecordMapper {
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final ClassMemberRepository classMemberRepository;
  private final FileStorageService fileStorageService;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public AssignmentSubmissionRecordMapper(
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      ClassMemberRepository classMemberRepository,
      FileStorageService fileStorageService) {
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.classMemberRepository = classMemberRepository;
    this.fileStorageService = fileStorageService;
  }

  public AssignmentRecord toAssignmentRecord(AssignmentEntity entity, JwtPrincipal principal) {
    List<AssignmentSubmissionEntity> submissions =
        assignmentSubmissionRepository.findByAssignmentId(entity.getId());
    AssignmentSubmissionEntity currentUserSubmission = resolveCurrentUserSubmission(submissions, principal);
    int totalSubmissions = submissions.size();
    int gradedSubmissions =
        (int)
            submissions.stream()
                .filter(item -> item.getStatus() == AssignmentSubmissionStatus.GRADED)
                .count();
    int pendingSubmissions =
        (int)
            submissions.stream()
                .filter(item -> item.getStatus() == AssignmentSubmissionStatus.SUBMITTED)
                .count();

    return new AssignmentRecord(
        entity.getId(),
        entity.getCourse() != null ? entity.getCourse().getId() : null,
        entity.getCourse() != null ? entity.getCourse().getName() : null,
        entity.getProject() != null ? entity.getProject().getId() : null,
        entity.getProject() != null ? entity.getProject().getName() : null,
        entity.getTitle(),
        entity.getSummary(),
        entity.getSubmissionUrl(),
        entity.getDueDate() != null ? entity.getDueDate().toString() : null,
        formatter.format(entity.getCreatedAt()),
        currentUserSubmission != null
            ? currentUserSubmission.getStatus().name()
            : principal.role() == UserRole.STUDENT ? "NOT_SUBMITTED" : null,
        currentUserSubmission != null && currentUserSubmission.getSubmittedAt() != null
            ? formatter.format(currentUserSubmission.getSubmittedAt())
            : null,
        currentUserSubmission != null ? currentUserSubmission.getScore() : null,
        currentUserSubmission != null ? currentUserSubmission.getTeacherFeedback() : null,
        principal.role() == UserRole.TEACHER ? totalSubmissions : null,
        principal.role() == UserRole.TEACHER ? gradedSubmissions : null,
        principal.role() == UserRole.TEACHER ? pendingSubmissions : null);
  }

  public AssignmentSubmissionRecord toSubmissionRecord(AssignmentSubmissionEntity entity) {
    List<FileAssetRecord> attachments =
        entity.getId() == null
            ? List.of()
            : fileStorageService.list(FileOwnerType.ASSIGNMENT_SUBMISSION, entity.getId());
    return new AssignmentSubmissionRecord(
        entity.getId(),
        entity.getAssignment().getId(),
        entity.getAssignment().getCourse() != null ? entity.getAssignment().getCourse().getId() : null,
        entity.getStudent().getId(),
        entity.getStudent().getName(),
        entity.getStudent().getEmail(),
        entity.getContent(),
        entity.getSubmissionUrl(),
        entity.getStatus().name(),
        entity.getScore(),
        entity.getTeacherFeedback(),
        entity.getSubmittedAt() != null ? formatter.format(entity.getSubmittedAt()) : null,
        entity.getReviewedAt() != null ? formatter.format(entity.getReviewedAt()) : null,
        Objects.requireNonNullElse(entity.getAttemptCount(), 0),
        attachments);
  }

  public AssignmentSubmissionRecord toPlaceholderSubmissionRecord(
      AssignmentEntity assignment, UserEntity student) {
    return new AssignmentSubmissionRecord(
        null,
        assignment.getId(),
        assignment.getCourse() != null ? assignment.getCourse().getId() : null,
        student.getId(),
        student.getName(),
        student.getEmail(),
        "",
        "",
        "NOT_SUBMITTED",
        null,
        null,
        null,
        null,
        0,
        List.of());
  }

  public List<ClassMemberEntity> studentMembers(Long classId) {
    return classMemberRepository.findByCourseId(classId).stream()
        .filter(member -> member.getRole() == ClassMemberRole.STUDENT)
        .toList();
  }

  private AssignmentSubmissionEntity resolveCurrentUserSubmission(
      List<AssignmentSubmissionEntity> submissions, JwtPrincipal principal) {
    if (principal.role() != UserRole.STUDENT) {
      return null;
    }
    return submissions.stream()
        .filter(item -> item.getStudent().getId().equals(principal.userId()))
        .findFirst()
        .orElse(null);
  }
}
