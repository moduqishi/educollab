package com.educollab.repo;

import com.educollab.model.AdminAuditEventEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditEventRepository extends JpaRepository<AdminAuditEventEntity, Long> {
  List<AdminAuditEventEntity> findByScopeTypeOrderByCreatedAtDesc(String scopeType);

  List<AdminAuditEventEntity> findByScopeTypeAndScopeIdOrderByCreatedAtDesc(String scopeType, Long scopeId);
}
