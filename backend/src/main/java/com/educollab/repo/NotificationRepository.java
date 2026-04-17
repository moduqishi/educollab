package com.educollab.repo;

import com.educollab.model.NotificationEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
  List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

  Optional<NotificationEntity> findByIdAndUserId(Long id, Long userId);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("update NotificationEntity n set n.read = true where n.user.id = :userId and n.read = false")
  int markAllReadByUserId(@Param("userId") Long userId);
}
