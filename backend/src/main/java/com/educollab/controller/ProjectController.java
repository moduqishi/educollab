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
    @PostMapping public ProjectRecord create(@RequestBody ProjectSaveRequest request) { return workspaceService.createProject(request, SecurityUtils.principal()); }
    @PostMapping("/{projectId}/members") public void addMember(@PathVariable Long projectId, @RequestBody ProjectMemberAddRequest request) { workspaceService.addProjectMember(projectId, request.userId(), SecurityUtils.principal()); }
    @DeleteMapping("/{projectId}/members/{userId}") public void removeMember(@PathVariable Long projectId, @PathVariable Long userId) { workspaceService.removeProjectMember(projectId, userId, SecurityUtils.principal()); }
}
