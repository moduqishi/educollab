package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TeacherFeedbackRepository extends JpaRepository<TeacherFeedbackEntity, Long> { List<TeacherFeedbackEntity> findByProjectCourseTeacherId(Long teacherId); List<TeacherFeedbackEntity> findByProjectId(Long projectId); }
