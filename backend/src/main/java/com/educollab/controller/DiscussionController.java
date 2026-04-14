package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/discussions")
public class DiscussionController {
    private final WorkspaceService workspaceService;
    public DiscussionController(WorkspaceService workspaceService) { this.workspaceService = workspaceService; }
    @GetMapping public List<DiscussionPost> list() { return workspaceService.discussions(SecurityUtils.principal()); }
    @GetMapping("/{id}") public DiscussionDetail detail(@PathVariable Long id) { return workspaceService.discussionDetail(id, SecurityUtils.principal()); }
    @PostMapping public DiscussionDetail create(@RequestBody DiscussionSaveRequest request) { return workspaceService.createDiscussion(request, SecurityUtils.principal()); }
    @PatchMapping("/{id}") public DiscussionDetail update(@PathVariable Long id, @RequestBody DiscussionUpdateRequest request) { return workspaceService.updateDiscussion(id, request, SecurityUtils.principal()); }
    @PostMapping("/{id}/replies") public DiscussionDetail reply(@PathVariable Long id, @RequestBody DiscussionReplyRequest request) { return workspaceService.replyDiscussion(id, request, SecurityUtils.principal()); }

    @GetMapping("/{id}/tasks") public List<TaskRecord> linkedTasks(@PathVariable Long id) { return workspaceService.linkedTasks(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/tasks/{taskId}") public List<TaskRecord> linkTask(@PathVariable Long id, @PathVariable Long taskId) { return workspaceService.linkTask(id, taskId, SecurityUtils.principal()); }
    @DeleteMapping("/{id}/tasks/{taskId}") public List<TaskRecord> unlinkTask(@PathVariable Long id, @PathVariable Long taskId) { return workspaceService.unlinkTask(id, taskId, SecurityUtils.principal()); }
}
