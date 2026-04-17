package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.ClassroomService;
import com.educollab.service.classroom.AssignmentSubmissionService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/classes")
public class ClassController {
  private final ClassroomService classroomService;
  private final AssignmentSubmissionService assignmentSubmissionService;

  public ClassController(
      ClassroomService classroomService,
      AssignmentSubmissionService assignmentSubmissionService) {
    this.classroomService = classroomService;
    this.assignmentSubmissionService = assignmentSubmissionService;
  }

  @GetMapping
  public List<ClassRecord> list() { return classroomService.classes(SecurityUtils.principal()); }

  @PostMapping
  public ClassRecord create(@RequestBody ClassSaveRequest request) { return classroomService.createClass(request, SecurityUtils.principal()); }

  @GetMapping("/{id}")
  public ClassDetail detail(@PathVariable Long id) { return classroomService.classDetail(id, SecurityUtils.principal()); }

  @PostMapping("/join-by-code")
  public ClassRecord joinByCode(@RequestBody JoinClassByCodeRequest request) { return classroomService.joinByCode(request, SecurityUtils.principal()); }

  @PostMapping("/{id}/reset-code")
  public ClassRecord resetCode(@PathVariable Long id) { return classroomService.resetCode(id, SecurityUtils.principal()); }

  @PostMapping("/{id}/invitations")
  public ClassInvitationRecord invite(@PathVariable Long id, @RequestBody ClassInvitationCreateRequest request) { return classroomService.invite(id, request, SecurityUtils.principal()); }

  @GetMapping("/invitations")
  public List<ClassInvitationRecord> invitations() { return classroomService.pendingInvitations(SecurityUtils.principal()); }

  @PostMapping("/invitations/{id}/accept")
  public void accept(@PathVariable Long id) { classroomService.acceptInvitation(id, SecurityUtils.principal()); }

  @PostMapping("/invitations/{id}/reject")
  public void reject(@PathVariable Long id) { classroomService.rejectInvitation(id, SecurityUtils.principal()); }

  @GetMapping("/{id}/assignments")
  public List<AssignmentRecord> assignments(@PathVariable Long id) { return classroomService.assignments(id, SecurityUtils.principal()); }

  @PostMapping("/{id}/assignments")
  public AssignmentRecord createAssignment(@PathVariable Long id, @RequestBody AssignmentSaveRequest request) { return classroomService.createAssignment(id, request, SecurityUtils.principal()); }

  @GetMapping("/{classId}/assignments/{assignmentId}/submissions/me")
  public AssignmentSubmissionRecord mySubmission(
      @PathVariable Long classId,
      @PathVariable Long assignmentId) {
    return assignmentSubmissionService.mySubmission(classId, assignmentId, SecurityUtils.principal());
  }

  @PutMapping("/{classId}/assignments/{assignmentId}/submissions/me")
  public AssignmentSubmissionRecord saveMySubmission(
      @PathVariable Long classId,
      @PathVariable Long assignmentId,
      @RequestBody AssignmentSubmissionSaveRequest request) {
    return assignmentSubmissionService.saveMySubmission(
        classId, assignmentId, request, SecurityUtils.principal());
  }

  @DeleteMapping("/{classId}/assignments/{assignmentId}/submissions/me/attachments/{fileId}")
  public AssignmentSubmissionRecord deleteMySubmissionAttachment(
      @PathVariable Long classId,
      @PathVariable Long assignmentId,
      @PathVariable Long fileId) {
    return assignmentSubmissionService.deleteMySubmissionAttachment(
        classId, assignmentId, fileId, SecurityUtils.principal());
  }

  @GetMapping("/{classId}/assignments/{assignmentId}/submissions")
  public List<AssignmentSubmissionRecord> submissions(
      @PathVariable Long classId,
      @PathVariable Long assignmentId) {
    return assignmentSubmissionService.submissionsForTeacher(
        classId, assignmentId, SecurityUtils.principal());
  }

  @PutMapping("/{classId}/assignments/{assignmentId}/submissions/{submissionId}/review")
  public AssignmentSubmissionRecord reviewSubmission(
      @PathVariable Long classId,
      @PathVariable Long assignmentId,
      @PathVariable Long submissionId,
      @RequestBody AssignmentSubmissionReviewRequest request) {
    return assignmentSubmissionService.reviewSubmission(
        classId, assignmentId, submissionId, request, SecurityUtils.principal());
  }

  @GetMapping("/{id}/group-tasks")
  public List<GroupTaskRecord> groupTasks(@PathVariable Long id) { return classroomService.groupTasks(id, SecurityUtils.principal()); }

  @PostMapping("/{id}/group-tasks")
  public GroupTaskRecord createGroupTask(@PathVariable Long id, @RequestBody GroupTaskSaveRequest request) { return classroomService.createGroupTask(id, request, SecurityUtils.principal()); }
}
