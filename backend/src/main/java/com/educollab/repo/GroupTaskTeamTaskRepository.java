package com.educollab.repo;

import com.educollab.model.GroupTaskTeamTaskEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupTaskTeamTaskRepository extends JpaRepository<GroupTaskTeamTaskEntity, Long> {
  List<GroupTaskTeamTaskEntity> findByTeamIdOrderByCreatedAtDesc(Long teamId);
}
