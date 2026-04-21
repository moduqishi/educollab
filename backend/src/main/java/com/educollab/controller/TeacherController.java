package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.WorkspaceService;
import com.educollab.service.classroom.AssignmentSubmissionService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teacher")
public class TeacherController {
    private final WorkspaceService workspaceService;
    private final AssignmentSubmissionService assignmentSubmissionService;
    public TeacherController(WorkspaceService workspaceService, AssignmentSubmissionService assignmentSubmissionService) {
        this.workspaceService = workspaceService;
        this.assignmentSubmissionService = assignmentSubmissionService;
    }
    @GetMapping("/overview") public TeacherOverview overview() { return workspaceService.teacherOverview(SecurityUtils.principal()); }
    @GetMapping("/summary") public TeacherSummaryRecord summary(
        @RequestParam(value = "courseId", required = false) Long courseId,
        @RequestParam(value = "rangeType", required = false) String rangeType,
        @RequestParam(value = "anchorDate", required = false) String anchorDate,
        @RequestParam(value = "startDate", required = false) String startDate,
        @RequestParam(value = "endDate", required = false) String endDate
    ) { return workspaceService.teacherSummary(courseId, rangeType, parseDate(anchorDate), parseDate(startDate), parseDate(endDate), SecurityUtils.principal()); }
    @GetMapping("/contributions") public TeacherContributionReportRecord contributions(@RequestParam(value = "courseId", required = false) Long courseId, @RequestParam(value = "weekStart", required = false) String weekStart) { return workspaceService.teacherContributionReport(courseId, weekStart == null || weekStart.isBlank() ? null : java.time.LocalDate.parse(weekStart), SecurityUtils.principal()); }
    @GetMapping("/assignments") public List<AssignmentRecord> assignments() { return assignmentSubmissionService.teacherAssignments(SecurityUtils.principal()); }
    @GetMapping("/assignment-courses") public List<TeacherAssignmentCourseRecord> assignmentCourses() { return assignmentSubmissionService.teacherAssignmentCourses(SecurityUtils.principal()); }
    @GetMapping("/feedback") public List<TeacherFeedbackRecord> feedback() { return workspaceService.feedbacks(SecurityUtils.principal()); }
    @PostMapping("/feedback") public TeacherFeedbackRecord createFeedback(@RequestBody TeacherFeedbackSaveRequest request) { return workspaceService.saveFeedback(request, SecurityUtils.principal()); }

    private static java.time.LocalDate parseDate(String raw) {
        return raw == null || raw.isBlank() ? null : java.time.LocalDate.parse(raw);
    }
}
