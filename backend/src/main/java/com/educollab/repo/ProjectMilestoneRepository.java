package com.educollab.repo;

import com.educollab.model.ProjectMilestoneEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestoneEntity, Long> {
  List<ProjectMilestoneEntity> findByProjectIdOrderBySortOrderAscCreatedAtAsc(Long projectId);
}
