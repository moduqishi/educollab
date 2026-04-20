package com.educollab.repo;

import com.educollab.model.ClassInvitationEntity;
import com.educollab.model.ClassInvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassInvitationRepository extends JpaRepository<ClassInvitationEntity, Long> {
  List<ClassInvitationEntity> findByCourseIdOrderByCreatedAtDesc(Long courseId);
  List<ClassInvitationEntity> findByInvitedUserIdAndStatusOrderByCreatedAtDesc(Long userId, ClassInvitationStatus status);
  Optional<ClassInvitationEntity> findByCourseIdAndInvitedUserIdAndStatus(Long courseId, Long userId, ClassInvitationStatus status);
}
