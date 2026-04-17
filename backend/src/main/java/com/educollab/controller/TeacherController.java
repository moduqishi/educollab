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
    @GetMapping("/assignments") public List<AssignmentRecord> assignments() { return assignmentSubmissionService.teacherAssignments(SecurityUtils.principal()); }
    @GetMapping("/feedback") public List<TeacherFeedbackRecord> feedback() { return workspaceService.feedbacks(SecurityUtils.principal()); }
    @PostMapping("/feedback") public TeacherFeedbackRecord createFeedback(@RequestBody TeacherFeedbackSaveRequest request) { return workspaceService.saveFeedback(request, SecurityUtils.principal()); }
}
