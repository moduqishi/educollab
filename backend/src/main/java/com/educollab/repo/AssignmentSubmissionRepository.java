package com.educollab.repo;

import com.educollab.model.AssignmentSubmissionEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmissionEntity, Long> {
  Optional<AssignmentSubmissionEntity> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);

  List<AssignmentSubmissionEntity> findByAssignmentId(Long assignmentId);

  List<AssignmentSubmissionEntity> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);

  List<AssignmentSubmissionEntity> findByAssignmentCourseTeacherId(Long teacherId);
}
