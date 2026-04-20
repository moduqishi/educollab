package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.AdminDtos.*;
import com.educollab.service.AdminService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ==================== STATS ====================
    @GetMapping("/stats")
    public AdminStats stats() {
        return adminService.getStats(SecurityUtils.principal());
    }

    // ==================== USER MANAGEMENT ====================
    @GetMapping("/users")
    public List<UserSummary> listUsers() {
        return adminService.listUsers(SecurityUtils.principal());
    }

    @PutMapping("/users/role")
    public UserSummary updateUserRole(@RequestBody UpdateUserRoleRequest request) {
        return adminService.updateUserRole(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/users/{userId}")
    public void deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(SecurityUtils.principal(), userId);
    }

    // ==================== COURSE MANAGEMENT ====================
    @GetMapping("/courses")
    public List<CourseSummary> listCourses() {
        return adminService.listCourses(SecurityUtils.principal());
    }

    @PutMapping("/courses")
    public CourseSummary updateCourse(@RequestBody UpdateCourseRequest request) {
        return adminService.updateCourse(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/courses/{courseId}")
    public void deleteCourse(@PathVariable Long courseId) {
        adminService.deleteCourse(SecurityUtils.principal(), courseId);
    }

    // ==================== PROJECT MANAGEMENT ====================
    @GetMapping("/projects")
    public List<ProjectSummary> listProjects() {
        return adminService.listProjects(SecurityUtils.principal());
    }

    @PutMapping("/projects/status")
    public ProjectSummary updateProjectStatus(@RequestBody UpdateProjectStatusRequest request) {
        return adminService.updateProjectStatus(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/projects/{projectId}")
    public void deleteProject(@PathVariable Long projectId) {
        adminService.deleteProject(SecurityUtils.principal(), projectId);
    }

    // ==================== TASK MANAGEMENT ====================
    @GetMapping("/tasks")
    public List<TaskSummary> listTasks() {
        return adminService.listTasks(SecurityUtils.principal());
    }

    @PutMapping("/tasks")
    public TaskSummary saveTask(@RequestBody TaskSaveRequest request) {
        return adminService.saveTask(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/tasks/{taskId}")
    public void deleteTask(@PathVariable Long taskId) {
        adminService.deleteTask(SecurityUtils.principal(), taskId);
    }

    // ==================== DISCUSSION MANAGEMENT ====================
    @GetMapping("/discussions")
    public List<DiscussionSummary> listDiscussions() {
        return adminService.listDiscussions(SecurityUtils.principal());
    }

    @PutMapping("/discussions/status")
    public DiscussionSummary updateDiscussionStatus(@RequestBody UpdateDiscussionStatusRequest request) {
        return adminService.updateDiscussionStatus(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/discussions/{discussionId}")
    public void deleteDiscussion(@PathVariable Long discussionId) {
        adminService.deleteDiscussion(SecurityUtils.principal(), discussionId);
    }

    // ==================== ASSIGNMENT MANAGEMENT ====================
    @GetMapping("/assignments")
    public List<AssignmentSummary> listAssignments() {
        return adminService.listAssignments(SecurityUtils.principal());
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public void deleteAssignment(@PathVariable Long assignmentId) {
        adminService.deleteAssignment(SecurityUtils.principal(), assignmentId);
    }
}
