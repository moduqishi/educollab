package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.AdminDtos.*;
import com.educollab.service.AdminService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public AdminStats stats() {
        return adminService.getStats(SecurityUtils.principal());
    }

    @GetMapping("/overview")
    public AdminOverviewRecord overview() {
        return adminService.overview(SecurityUtils.principal());
    }

    @GetMapping("/users")
    public List<UserSummary> listUsers() {
        return adminService.listUsers(SecurityUtils.principal());
    }

    @GetMapping("/users/{userId}")
    public UserDetailRecord userDetail(@PathVariable Long userId) {
        return adminService.userDetail(SecurityUtils.principal(), userId);
    }

    @PutMapping("/users/role")
    public UserSummary updateUserRole(@RequestBody UpdateUserRoleRequest request) {
        return adminService.updateUserRole(SecurityUtils.principal(), request);
    }

    @PutMapping("/users/{userId}")
    public UserSummary updateUser(@PathVariable Long userId, @RequestBody UpdateUserRequest request) {
        return adminService.updateUser(SecurityUtils.principal(), userId, request);
    }

    @PostMapping("/users/{userId}/reset-password")
    public UserSummary resetPassword(@PathVariable Long userId, @RequestBody(required = false) ResetPasswordRequest request) {
        return adminService.resetUserPassword(SecurityUtils.principal(), userId, request);
    }

    @DeleteMapping("/users/{userId}")
    public void deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(SecurityUtils.principal(), userId);
    }

    @GetMapping("/courses")
    public List<CourseSummary> listCourses() {
        return adminService.listCourses(SecurityUtils.principal());
    }

    @PostMapping("/courses")
    public CourseSummary createCourse(@RequestBody CreateCourseRequest request) {
        return adminService.createCourse(SecurityUtils.principal(), request);
    }

    @GetMapping("/courses/{courseId}")
    public CourseDetailRecord courseDetail(@PathVariable Long courseId) {
        return adminService.courseDetail(SecurityUtils.principal(), courseId);
    }

    @PutMapping("/courses")
    public CourseSummary updateCourse(@RequestBody UpdateCourseRequest request) {
        return adminService.updateCourse(SecurityUtils.principal(), request);
    }

    @DeleteMapping("/courses/{courseId}")
    public void deleteCourse(@PathVariable Long courseId) {
        adminService.deleteCourse(SecurityUtils.principal(), courseId);
    }

    @PostMapping("/courses/{courseId}/members")
    public CourseDetailRecord addCourseMember(@PathVariable Long courseId, @RequestBody CourseMemberSaveRequest request) {
        return adminService.addCourseMember(SecurityUtils.principal(), courseId, request);
    }

    @DeleteMapping("/courses/{courseId}/members/{userId}")
    public CourseDetailRecord removeCourseMember(@PathVariable Long courseId, @PathVariable Long userId) {
        return adminService.removeCourseMember(SecurityUtils.principal(), courseId, userId);
    }

    @PostMapping(path = "/courses/{courseId}/import/preview", consumes = "multipart/form-data")
    public AdminImportPreviewRecord previewCourseImport(@PathVariable Long courseId, @RequestParam("file") MultipartFile file) {
        return adminService.previewCourseImport(SecurityUtils.principal(), courseId, file);
    }

    @PostMapping(path = "/courses/{courseId}/import/execute", consumes = "multipart/form-data")
    public AdminImportResultRecord executeCourseImport(@PathVariable Long courseId, @RequestParam("file") MultipartFile file) {
        return adminService.executeCourseImport(SecurityUtils.principal(), courseId, file);
    }

    @GetMapping("/courses/{courseId}/imports")
    public List<AdminImportJobRecord> courseImports(@PathVariable Long courseId) {
        return adminService.importJobs(courseId, SecurityUtils.principal());
    }

    @GetMapping("/teams")
    public List<TeamSummary> listTeams() {
        return adminService.listTeams(SecurityUtils.principal());
    }

    @PostMapping("/teams")
    public TeamSummary createTeam(@RequestBody CreateTeamRequest request) {
        return adminService.createTeam(SecurityUtils.principal(), request);
    }

    @GetMapping("/teams/{teamId}")
    public TeamDetailAdminRecord teamDetail(@PathVariable Long teamId) {
        return adminService.teamDetail(SecurityUtils.principal(), teamId);
    }

    @PutMapping("/teams/{teamId}")
    public TeamSummary updateTeam(@PathVariable Long teamId, @RequestBody UpdateTeamRequest request) {
        return adminService.updateTeam(SecurityUtils.principal(), teamId, request);
    }

    @PostMapping("/teams/{teamId}/members")
    public TeamDetailAdminRecord addTeamMember(@PathVariable Long teamId, @RequestBody TeamMemberAddRequest request) {
        return adminService.addTeamMember(SecurityUtils.principal(), teamId, request);
    }

    @DeleteMapping("/teams/{teamId}/members/{userId}")
    public TeamDetailAdminRecord removeTeamMember(@PathVariable Long teamId, @PathVariable Long userId) {
        return adminService.removeTeamMember(SecurityUtils.principal(), teamId, userId);
    }

    @PostMapping("/teams/{teamId}/leader")
    public TeamSummary transferTeamLeader(@PathVariable Long teamId, @RequestBody TeamTransferLeaderRequest request) {
        return adminService.transferTeamLeader(SecurityUtils.principal(), teamId, request);
    }

    @GetMapping("/projects")
    public List<ProjectSummary> listProjects() {
        return adminService.listProjects(SecurityUtils.principal());
    }

    @GetMapping("/projects/{projectId}")
    public ProjectDetailRecord projectDetail(@PathVariable Long projectId) {
        return adminService.projectDetail(SecurityUtils.principal(), projectId);
    }

    @PutMapping("/projects/status")
    public ProjectSummary updateProjectStatus(@RequestBody UpdateProjectStatusRequest request) {
        return adminService.updateProjectStatus(SecurityUtils.principal(), request);
    }

    @PutMapping("/projects/{projectId}")
    public ProjectSummary updateProject(@PathVariable Long projectId, @RequestBody UpdateProjectRequest request) {
        return adminService.updateProject(SecurityUtils.principal(), request);
    }

    @PostMapping("/projects/{projectId}/members")
    public ProjectDetailRecord addProjectMember(@PathVariable Long projectId, @RequestBody ProjectMemberSaveRequest request) {
        return adminService.addProjectMember(SecurityUtils.principal(), projectId, request);
    }

    @DeleteMapping("/projects/{projectId}/members/{userId}")
    public ProjectDetailRecord removeProjectMember(@PathVariable Long projectId, @PathVariable Long userId) {
        return adminService.removeProjectMember(SecurityUtils.principal(), projectId, userId);
    }

    @DeleteMapping("/projects/{projectId}")
    public void deleteProject(@PathVariable Long projectId) {
        adminService.deleteProject(SecurityUtils.principal(), projectId);
    }

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

    @GetMapping("/assignments")
    public List<AssignmentSummary> listAssignments() {
        return adminService.listAssignments(SecurityUtils.principal());
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public void deleteAssignment(@PathVariable Long assignmentId) {
        adminService.deleteAssignment(SecurityUtils.principal(), assignmentId);
    }

    @GetMapping("/documents")
    public List<DocumentSummary> documents() {
        return adminService.listDocuments(SecurityUtils.principal());
    }

    @GetMapping("/audit")
    public List<AdminAuditRecord> audit(
        @RequestParam(value = "scopeType", required = false) String scopeType,
        @RequestParam(value = "scopeId", required = false) Long scopeId,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return adminService.audit(SecurityUtils.principal(), scopeType, scopeId, limit);
    }

    @GetMapping("/system")
    public AdminSystemOverviewRecord systemOverview() {
        return adminService.systemOverview(SecurityUtils.principal());
    }

    @GetMapping("/system/health")
    public List<AdminSystemHealthRecord> systemHealth() {
        return adminService.systemHealth(SecurityUtils.principal());
    }

    @PostMapping("/system/announce")
    public AdminActionResultRecord announce(@RequestBody AdminAnnouncementRequest request) {
        return adminService.announce(SecurityUtils.principal(), request);
    }

    @PostMapping("/system/recompute-progress")
    public AdminActionResultRecord recomputeProgress() {
        return adminService.recomputeProgress(SecurityUtils.principal());
    }

    @PostMapping("/system/maintenance/migrate-storage")
    public AdminActionResultRecord migrateStorage() {
        return adminService.migrateStorage(SecurityUtils.principal());
    }

    @PostMapping("/storage/migrate")
    public AdminActionResultRecord migrateStorageAlias() {
        return adminService.migrateStorage(SecurityUtils.principal());
    }

    @GetMapping("/system/maintenance/scan-storage")
    public AdminBulkActionResultRecord scanStorage() {
        return adminService.scanStorage(SecurityUtils.principal());
    }

    @PostMapping("/storage/scan-orphans")
    public AdminBulkActionResultRecord scanStorageAlias() {
        return adminService.scanStorage(SecurityUtils.principal());
    }

    @PostMapping("/users/{userId}/courses")
    public UserDetailRecord addUserCourseMembership(@PathVariable Long userId, @RequestBody UserCourseMembershipRequest request) {
        return adminService.addUserCourseMembership(SecurityUtils.principal(), userId, request);
    }

    @DeleteMapping("/users/{userId}/courses/{courseId}")
    public UserDetailRecord removeUserCourseMembership(@PathVariable Long userId, @PathVariable Long courseId) {
        return adminService.removeUserCourseMembership(SecurityUtils.principal(), userId, courseId);
    }

    @PostMapping("/users/{userId}/teams")
    public UserDetailRecord addUserTeamMembership(@PathVariable Long userId, @RequestBody UserTeamMembershipRequest request) {
        return adminService.addUserTeamMembership(SecurityUtils.principal(), userId, request);
    }

    @DeleteMapping("/users/{userId}/teams/{teamId}")
    public UserDetailRecord removeUserTeamMembership(@PathVariable Long userId, @PathVariable Long teamId) {
        return adminService.removeUserTeamMembership(SecurityUtils.principal(), userId, teamId);
    }

    @PostMapping("/users/{userId}/projects")
    public UserDetailRecord addUserProjectMembership(@PathVariable Long userId, @RequestBody UserProjectMembershipRequest request) {
        return adminService.addUserProjectMembership(SecurityUtils.principal(), userId, request);
    }

    @DeleteMapping("/users/{userId}/projects/{projectId}")
    public UserDetailRecord removeUserProjectMembership(@PathVariable Long userId, @PathVariable Long projectId) {
        return adminService.removeUserProjectMembership(SecurityUtils.principal(), userId, projectId);
    }

    @GetMapping("/storage/tree")
    public List<AdminStorageTreeRecord> storageTree() {
        return adminService.storageTree(SecurityUtils.principal());
    }

    @GetMapping("/storage/files")
    public List<AdminStorageItemRecord> storageFiles() {
        return adminService.storageFiles(SecurityUtils.principal());
    }

    @GetMapping("/storage/repos")
    public List<AdminStorageItemRecord> storageRepos() {
        return adminService.storageRepos(SecurityUtils.principal());
    }

    @GetMapping("/storage/logs")
    public List<AdminStorageItemRecord> storageLogs() {
        return adminService.storageLogs(SecurityUtils.principal());
    }

    @GetMapping("/storage/project-system")
    public AdminStorageDirectoryRecord projectSystemEntries(
        @RequestParam("projectId") Long projectId,
        @RequestParam(value = "path", required = false) String path
    ) {
        return adminService.projectSystemEntries(SecurityUtils.principal(), projectId, path);
    }

    @GetMapping("/storage/project-system/file")
    public AdminStorageFilePreviewRecord projectSystemFile(
        @RequestParam("projectId") Long projectId,
        @RequestParam("path") String path
    ) {
        return adminService.projectSystemFile(SecurityUtils.principal(), projectId, path);
    }
}
