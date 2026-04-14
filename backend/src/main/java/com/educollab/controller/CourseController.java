package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.CourseRecord;
import com.educollab.model.UserRole;
import com.educollab.repo.CourseRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/courses")
public class CourseController {
    private final CourseRepository courseRepository;

    public CourseController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourseRecord> list() {
        var principal = SecurityUtils.principal();
        var courses = principal.role() == UserRole.TEACHER
            ? courseRepository.findByTeacherId(principal.userId())
            : courseRepository.findAll();
        return courses.stream()
            .map(course -> new CourseRecord(course.getId(), course.getName(), course.getTeacher() != null ? course.getTeacher().getName() : null))
            .toList();
    }
}
