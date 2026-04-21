package com.educollab.repo;
import com.educollab.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
public interface TaskCommentRepository extends JpaRepository<TaskCommentEntity, Long> {
  void deleteByTaskId(Long taskId);
}
