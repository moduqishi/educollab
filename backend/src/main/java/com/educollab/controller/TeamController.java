package com.educollab.controller;

import com.educollab.common.security.JwtPrincipal;
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
    @PostMapping public TeamRecord create(@RequestBody TeamSaveRequest request) { return workspaceService.createTeam(request, SecurityUtils.principal()); }
}
