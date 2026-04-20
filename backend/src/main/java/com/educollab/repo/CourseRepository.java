package com.educollab.repo;
import com.educollab.model.CourseEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<CourseEntity, Long> {
    List<CourseEntity> findByTeacherId(Long teacherId);
    java.util.Optional<CourseEntity> findByClassCode(String classCode);
}
