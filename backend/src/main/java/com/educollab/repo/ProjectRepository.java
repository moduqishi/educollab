package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
 List<ProjectEntity> findByCourseTeacherId(Long teacherId);
 java.util.Optional<ProjectEntity> findByTeamId(Long teamId);
 List<ProjectEntity> findByTeamGroupTaskId(Long groupTaskId);
}
