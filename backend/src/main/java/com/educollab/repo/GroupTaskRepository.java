package com.educollab.repo;

import com.educollab.model.GroupTaskEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupTaskRepository extends JpaRepository<GroupTaskEntity, Long> {
  List<GroupTaskEntity> findByCourseIdOrderByCreatedAtDesc(Long courseId);
  List<GroupTaskEntity> findByCourseTeacherIdOrderByCreatedAtDesc(Long teacherId);
}
