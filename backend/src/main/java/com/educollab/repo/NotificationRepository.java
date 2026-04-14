package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> { List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId); }
