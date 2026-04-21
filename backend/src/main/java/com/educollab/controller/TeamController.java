package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
public class TeamController {
    private final WorkspaceService workspaceService;
    public TeamController(WorkspaceService workspaceService) { this.workspaceService = workspaceService; }
    @GetMapping public List<TeamRecord> list() { return workspaceService.teams(SecurityUtils.principal()); }
    @GetMapping("/{id}") public TeamDetailRecord detail(@PathVariable Long id) { return workspaceService.teamDetail(id, SecurityUtils.principal()); }
    @PostMapping public TeamRecord create(@RequestBody TeamSaveRequest request) { return workspaceService.createTeam(request, SecurityUtils.principal()); }
    @PostMapping("/invite-code") public TeamRecord generateInviteCode(@RequestBody IdRequest request) { return workspaceService.generateInviteCode(request.id(), SecurityUtils.principal()); }
    @PostMapping("/join-by-code") public TeamRecord joinByInviteCode(@RequestBody TeamJoinByCodeRequest request) { return workspaceService.joinByInviteCode(request.inviteCode(), SecurityUtils.principal()); }
    @PostMapping("/standalone") public TeamRecord createStandalone(@RequestBody TeamStandaloneCreateRequest request) { return workspaceService.createStandaloneTeam(request, SecurityUtils.principal()); }
    @PostMapping("/{id}/transfer-leader") public TeamRecord transferLeader(@PathVariable Long id, @RequestBody TeamTransferLeaderRequest request) { return workspaceService.transferLeader(id, request, SecurityUtils.principal()); }
    @DeleteMapping("/{teamId}/members/{userId}") public void removeMember(@PathVariable Long teamId, @PathVariable Long userId) { workspaceService.removeTeamMember(teamId, userId, SecurityUtils.principal()); }
    @GetMapping("/{id}/tasks") public List<TeamTaskRecord> tasks(@PathVariable Long id) { return workspaceService.teamTasks(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/tasks") public TeamTaskRecord createTask(@PathVariable Long id, @RequestBody TeamTaskSaveRequest request) { return workspaceService.saveTeamTask(id, request, null, SecurityUtils.principal()); }
    @PutMapping("/tasks/{id}") public TeamTaskRecord updateTask(@PathVariable Long id, @RequestBody TeamTaskSaveRequest request) { return workspaceService.updateTeamTask(id, request, SecurityUtils.principal()); }
    @PostMapping("/{id}/project") public ProjectRecord createProject(@PathVariable Long id, @RequestBody TeamProjectSaveRequest request) { return workspaceService.createTeamProject(id, request, SecurityUtils.principal()); }
}
