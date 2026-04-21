package com.educollab.repo;

import com.educollab.model.ProjectActivityEventEntity;
import com.educollab.model.ProjectActivityEventType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectActivityEventRepository extends JpaRepository<ProjectActivityEventEntity, Long> {
  List<ProjectActivityEventEntity> findByProjectIdOrderByOccurredAtAsc(Long projectId);

  List<ProjectActivityEventEntity> findByProjectIdInOrderByOccurredAtAsc(List<Long> projectIds);

  List<ProjectActivityEventEntity> findByProjectIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
      Long projectId, LocalDateTime start, LocalDateTime end);

  List<ProjectActivityEventEntity> findByProjectIdInAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
      List<Long> projectIds, LocalDateTime start, LocalDateTime end);

  ProjectActivityEventEntity findFirstByProjectIdAndUserIdAndEventTypeAndOccurredAtGreaterThanEqualOrderByOccurredAtDesc(
      Long projectId, Long userId, ProjectActivityEventType eventType, LocalDateTime occurredAt);

  ProjectActivityEventEntity findFirstByProjectIdAndUserIdAndEventTypeAndTargetTitleAndOccurredAtGreaterThanEqualOrderByOccurredAtDesc(
      Long projectId, Long userId, ProjectActivityEventType eventType, String targetTitle, LocalDateTime occurredAt);

  boolean existsByDedupeKey(String dedupeKey);
}
