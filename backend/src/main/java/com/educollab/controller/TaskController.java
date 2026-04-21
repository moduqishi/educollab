package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final WorkspaceService workspaceService;
    public TaskController(WorkspaceService workspaceService) { this.workspaceService = workspaceService; }
    @GetMapping public List<TaskRecord> list() { return workspaceService.tasks(SecurityUtils.principal()); }
    @PostMapping public TaskRecord create(@RequestBody TaskSaveRequest request) { return workspaceService.saveTask(request, null, SecurityUtils.principal()); }
    @PutMapping("/{id}") public TaskRecord update(@PathVariable Long id, @RequestBody TaskSaveRequest request) { return workspaceService.saveTask(request, id, SecurityUtils.principal()); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { workspaceService.deleteTask(id, SecurityUtils.principal()); }
    @DeleteMapping("/{taskId}/attachments/{fileId}") public void deleteAttachment(@PathVariable Long taskId, @PathVariable Long fileId) { workspaceService.deleteTaskAttachment(taskId, fileId, SecurityUtils.principal()); }
}
