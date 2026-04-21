package com.educollab.repo;
import com.educollab.model.*;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TeamRepository extends JpaRepository<TeamEntity, Long> {
  List<TeamEntity> findByGroupTaskIdOrderByCreatedAtAsc(Long groupTaskId);
  List<TeamEntity> findByCourseIdOrderByCreatedAtAsc(Long courseId);
  List<TeamEntity> findByCourseTeacherIdOrderByCreatedAtAsc(Long teacherId);
}
