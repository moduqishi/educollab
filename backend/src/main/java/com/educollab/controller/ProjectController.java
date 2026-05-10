package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final WorkspaceService workspaceService;
    public ProjectController(WorkspaceService workspaceService) { this.workspaceService = workspaceService; }
    @GetMapping("/dashboard") public DashboardSummary dashboard() { return workspaceService.dashboard(SecurityUtils.principal()); }
    @GetMapping public List<ProjectRecord> list() { return workspaceService.projects(SecurityUtils.principal()); }
    @GetMapping("/{id}") public ProjectDetail detail(@PathVariable Long id) { return workspaceService.projectDetail(id, SecurityUtils.principal()); }
    @GetMapping("/{id}/milestones") public List<ProjectMilestoneRecord> milestones(@PathVariable Long id) { return workspaceService.projectMilestones(id, SecurityUtils.principal()); }
    @GetMapping("/{id}/summary") public ProjectSummaryRecord summary(
        @PathVariable Long id,
        @RequestParam(value = "rangeType", required = false) String rangeType,
        @RequestParam(value = "anchorDate", required = false) String anchorDate,
        @RequestParam(value = "startDate", required = false) String startDate,
        @RequestParam(value = "endDate", required = false) String endDate,
        @RequestParam(value = "memberId", required = false) Long memberId
    ) { return workspaceService.projectSummary(id, rangeType, parseDate(anchorDate), parseDate(startDate), parseDate(endDate), memberId, SecurityUtils.principal()); }
    @GetMapping("/{id}/summary/activity") public List<ProjectActivityEventRecord> summaryActivity(
        @PathVariable Long id,
        @RequestParam(value = "rangeType", required = false) String rangeType,
        @RequestParam(value = "anchorDate", required = false) String anchorDate,
        @RequestParam(value = "startDate", required = false) String startDate,
        @RequestParam(value = "endDate", required = false) String endDate,
        @RequestParam(value = "memberId", required = false) Long memberId
    ) { return workspaceService.projectSummaryActivity(id, rangeType, parseDate(anchorDate), parseDate(startDate), parseDate(endDate), memberId, SecurityUtils.principal()); }
    @GetMapping("/{id}/reports/weekly") public ProjectWeeklyReportRecord weeklyReport(@PathVariable Long id, @RequestParam(value = "weekStart", required = false) String weekStart) { return workspaceService.projectWeeklyReport(id, weekStart == null || weekStart.isBlank() ? null : java.time.LocalDate.parse(weekStart), SecurityUtils.principal()); }
    @PostMapping("/{id}/reports/weekly/ai-summary") public WeeklyAiSummaryRecord weeklyAiSummary(@PathVariable Long id, @RequestParam(value = "weekStart", required = false) String weekStart) { return workspaceService.projectWeeklyAiSummary(id, weekStart == null || weekStart.isBlank() ? null : java.time.LocalDate.parse(weekStart), SecurityUtils.principal()); }
    @GetMapping("/{id}/activity") public List<ProjectActivityEventRecord> activity(@PathVariable Long id, @RequestParam(value = "weekStart", required = false) String weekStart) { return workspaceService.projectActivity(id, weekStart == null || weekStart.isBlank() ? null : java.time.LocalDate.parse(weekStart), SecurityUtils.principal()); }
    @PostMapping("/{id}/activity/visit") public void visit(@PathVariable Long id, @RequestBody(required = false) ProjectVisitRequest request) { workspaceService.trackProjectVisit(id, request != null ? request.pageKey() : null, SecurityUtils.principal()); }
    @GetMapping("/{id}/member-candidates") public List<ProjectMemberCandidate> memberCandidates(@PathVariable Long id) { return workspaceService.projectMemberCandidates(id, SecurityUtils.principal()); }
    @PostMapping public ProjectRecord create(@RequestBody ProjectSaveRequest request) { return workspaceService.createProject(request, SecurityUtils.principal()); }
    @PostMapping("/{id}/milestones") public ProjectMilestoneRecord createMilestone(@PathVariable Long id, @RequestBody ProjectMilestoneSaveRequest request) { return workspaceService.createProjectMilestone(id, request, SecurityUtils.principal()); }
    @PostMapping("/milestones/{id}/complete") public ProjectMilestoneRecord completeMilestone(@PathVariable Long id) { return workspaceService.completeProjectMilestone(id, SecurityUtils.principal()); }
    @PutMapping("/milestones/{id}") public ProjectMilestoneRecord updateMilestone(@PathVariable Long id, @RequestBody ProjectMilestoneSaveRequest request) { return workspaceService.updateProjectMilestone(id, request, SecurityUtils.principal()); }
    @DeleteMapping("/milestones/{id}") public void deleteMilestone(@PathVariable Long id) { workspaceService.deleteProjectMilestone(id, SecurityUtils.principal()); }
    @PostMapping("/{projectId}/members") public void addMember(@PathVariable Long projectId, @RequestBody ProjectMemberAddRequest request) { workspaceService.addProjectMemberManaged(projectId, request.userId(), SecurityUtils.principal()); }
    @DeleteMapping("/{projectId}/members/{userId}") public void removeMember(@PathVariable Long projectId, @PathVariable Long userId) { workspaceService.removeProjectMemberManaged(projectId, userId, SecurityUtils.principal()); }

    private static java.time.LocalDate parseDate(String raw) {
        return raw == null || raw.isBlank() ? null : java.time.LocalDate.parse(raw);
    }
}
