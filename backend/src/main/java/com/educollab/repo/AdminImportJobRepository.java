package com.educollab.repo;

import com.educollab.model.AdminImportJobEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminImportJobRepository extends JpaRepository<AdminImportJobEntity, Long> {
  List<AdminImportJobEntity> findByCourseIdOrderByCreatedAtDesc(Long courseId);

  List<AdminImportJobEntity> findAllByOrderByCreatedAtDesc();
}
