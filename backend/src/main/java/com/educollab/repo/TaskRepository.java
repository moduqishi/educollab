package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TaskRepository extends JpaRepository<TaskEntity, Long> { List<TaskEntity> findByProjectId(Long projectId); List<TaskEntity> findByProjectIdIn(List<Long> projectIds); }
