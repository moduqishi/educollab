package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.ClassroomService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
public class GroupTaskController {
  private final ClassroomService classroomService;

  public GroupTaskController(ClassroomService classroomService) {
    this.classroomService = classroomService;
  }

  @GetMapping("/api/group-tasks/{id}")
  public GroupTaskRecord detail(@PathVariable Long id) { return classroomService.groupTaskDetail(id, SecurityUtils.principal()); }

  @GetMapping("/api/group-task-teams/{id}")
  public GroupTaskTeamDetail teamDetail(@PathVariable Long id) {
    return classroomService.groupTaskTeamDetail(id, SecurityUtils.principal());
  }

  @PostMapping("/api/group-tasks/{id}/teams")
  public GroupTaskTeamRecord createTeam(@PathVariable Long id, @RequestBody GroupTaskTeamSaveRequest request) { return classroomService.createGroupTaskTeam(id, request, SecurityUtils.principal()); }

  @PostMapping("/api/group-task-teams/{id}/join")
  public GroupTaskTeamRecord join(@PathVariable Long id) { return classroomService.joinGroupTaskTeam(id, SecurityUtils.principal()); }

  @PostMapping("/api/group-task-teams/{id}/leave")
  public GroupTaskTeamRecord leave(@PathVariable Long id) { return classroomService.leaveGroupTaskTeam(id, SecurityUtils.principal()); }

  @PostMapping("/api/group-task-teams/{id}/transfer-leader")
  public GroupTaskTeamRecord transferLeader(@PathVariable Long id, @RequestBody GroupTaskTransferLeaderRequest request) { return classroomService.transferLeader(id, request, SecurityUtils.principal()); }

  @GetMapping("/api/group-task-teams/{id}/tasks")
  public List<GroupTaskSubTaskRecord> tasks(@PathVariable Long id) { return classroomService.teamTasks(id, SecurityUtils.principal()); }

  @PostMapping("/api/group-task-teams/{id}/tasks")
  public GroupTaskSubTaskRecord createTask(@PathVariable Long id, @RequestBody GroupTaskSubTaskSaveRequest request) { return classroomService.saveTeamTask(id, request, null, SecurityUtils.principal()); }

  @PutMapping("/api/group-task-teams/tasks/{id}")
  public GroupTaskSubTaskRecord updateTask(@PathVariable Long id, @RequestBody GroupTaskSubTaskSaveRequest request) {
    return classroomService.updateTeamTask(id, request, SecurityUtils.principal());
  }

  @PostMapping("/api/group-task-teams/{id}/project")
  public ProjectRecord createProject(@PathVariable Long id, @RequestBody ProjectSaveRequest request) {
    return classroomService.createProjectForTeam(id, request, SecurityUtils.principal());
  }

  @DeleteMapping("/api/group-task-teams/{teamId}/members/{userId}")
  public void removeMember(@PathVariable Long teamId, @PathVariable Long userId) {
    classroomService.removeGroupTaskTeamMember(teamId, userId, SecurityUtils.principal());
  }
}
