package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AssignmentRepository extends JpaRepository<AssignmentEntity, Long> { List<AssignmentEntity> findByProjectCourseTeacherId(Long teacherId); }
