package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AdminDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

import static com.educollab.model.UserRole.ADMIN;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamMemberRepository teamMemberRepository;

    public AdminService(
            UserRepository userRepository,
            CourseRepository courseRepository,
            ClassMemberRepository classMemberRepository,
            ProjectRepository projectRepository,
            TaskRepository taskRepository,
            DiscussionPostRepository discussionPostRepository,
            DiscussionReplyRepository discussionReplyRepository,
            AssignmentRepository assignmentRepository,
            AssignmentSubmissionRepository submissionRepository,
            ProjectMemberRepository projectMemberRepository,
            TeamMemberRepository teamMemberRepository
    ) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.classMemberRepository = classMemberRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    private void requireAdmin(JwtPrincipal principal) {
        if (principal.role() != ADMIN) {
            throw new ApiException("需要管理员权限");
        }
    }

    // ==================== STATS ====================

    public AdminStats getStats(JwtPrincipal principal) {
        requireAdmin(principal);
        List<UserEntity> users = userRepository.findAll();
        long students = users.stream().filter(u -> u.getRole() == UserRole.STUDENT).count();
        long teachers = users.stream().filter(u -> u.getRole() == UserRole.TEACHER).count();
        return new AdminStats(
                users.size(),
                students,
                teachers,
                courseRepository.count(),
                projectRepository.count(),
                taskRepository.count(),
                discussionPostRepository.count(),
                assignmentRepository.count()
        );
    }

    // ==================== USER MANAGEMENT ====================

    public List<UserSummary> listUsers(JwtPrincipal principal) {
        requireAdmin(principal);
        return userRepository.findAll().stream()
                .map(u -> new UserSummary(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getRole(),
                        u.getAvatar(),
                        u.getCreatedAt() != null ? u.getCreatedAt().toLocalDate() : null
                ))
                .toList();
    }

    public UserSummary updateUserRole(JwtPrincipal principal, UpdateUserRoleRequest request) {
        requireAdmin(principal);
        UserEntity user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ApiException("用户不存在"));
        user.setRole(request.role());
        user = userRepository.save(user);
        return new UserSummary(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAvatar(),
                user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate() : null
        );
    }

    @Transactional
    public void deleteUser(JwtPrincipal principal, Long userId) {
        requireAdmin(principal);
        if (!userRepository.existsById(userId)) {
            throw new ApiException("用户不存在");
        }
        userRepository.deleteById(userId);
    }

    // ==================== COURSE MANAGEMENT ====================

    public List<CourseSummary> listCourses(JwtPrincipal principal) {
        requireAdmin(principal);
        return courseRepository.findAll().stream()
                .map(c -> {
                    int memberCount = classMemberRepository.findByCourseId(c.getId()).size();
                    return new CourseSummary(
                            c.getId(),
                            c.getName(),
                            c.getClassCode(),
                            c.getTeacher() != null ? c.getTeacher().getName() : null,
                            memberCount,
                            c.getCreatedAt() != null ? c.getCreatedAt().toLocalDate() : null
                    );
                })
                .toList();
    }

    @Transactional
    public CourseSummary updateCourse(JwtPrincipal principal, UpdateCourseRequest request) {
        requireAdmin(principal);
        CourseEntity course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new ApiException("课程不存在"));
        if (request.name() != null && !request.name().isBlank()) {
            course.setName(request.name());
        }
        if (request.classCode() != null && !request.classCode().isBlank()) {
            course.setClassCode(request.classCode());
        }
        course = courseRepository.save(course);
        int memberCount = classMemberRepository.findByCourseId(course.getId()).size();
        return new CourseSummary(
                course.getId(),
                course.getName(),
                course.getClassCode(),
                course.getTeacher() != null ? course.getTeacher().getName() : null,
                memberCount,
                course.getCreatedAt() != null ? course.getCreatedAt().toLocalDate() : null
        );
    }

    @Transactional
    public void deleteCourse(JwtPrincipal principal, Long courseId) {
        requireAdmin(principal);
        if (!courseRepository.existsById(courseId)) {
            throw new ApiException("课程不存在");
        }
        courseRepository.deleteById(courseId);
    }

    // ==================== PROJECT MANAGEMENT ====================

    public List<ProjectSummary> listProjects(JwtPrincipal principal) {
        requireAdmin(principal);
        return projectRepository.findAll().stream()
                .map(p -> new ProjectSummary(
                        p.getId(),
                        p.getName(),
                        p.getType() != null ? p.getType().name() : null,
                        p.getStatus() != null ? p.getStatus().name() : null,
                        p.getProgress(),
                        p.getCourse() != null ? p.getCourse().getName() : null,
                        p.getTeam() != null ? p.getTeam().getName() : null,
                        p.getCreatedAt() != null ? p.getCreatedAt().toLocalDate() : null
                ))
                .toList();
    }

    @Transactional
    public ProjectSummary updateProjectStatus(JwtPrincipal principal, UpdateProjectStatusRequest request) {
        requireAdmin(principal);
        ProjectEntity project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ApiException("项目不存在"));
        ProjectStatus newStatus = ProjectStatus.valueOf(request.status());
        project.setStatus(newStatus);
        project = projectRepository.save(project);
        return new ProjectSummary(
                project.getId(),
                project.getName(),
                project.getType() != null ? project.getType().name() : null,
                project.getStatus() != null ? project.getStatus().name() : null,
                project.getProgress(),
                project.getCourse() != null ? project.getCourse().getName() : null,
                project.getTeam() != null ? project.getTeam().getName() : null,
                project.getCreatedAt() != null ? project.getCreatedAt().toLocalDate() : null
        );
    }

    @Transactional
    public void deleteProject(JwtPrincipal principal, Long projectId) {
        requireAdmin(principal);
        if (!projectRepository.existsById(projectId)) {
            throw new ApiException("项目不存在");
        }
        projectRepository.deleteById(projectId);
    }

    // ==================== TASK MANAGEMENT ====================

    public List<TaskSummary> listTasks(JwtPrincipal principal) {
        requireAdmin(principal);
        return taskRepository.findAll().stream()
                .map(t -> new TaskSummary(
                        t.getId(),
                        t.getTitle(),
                        t.getDescription(),
                        t.getStatus() != null ? t.getStatus().name() : null,
                        t.getPriority() != null ? t.getPriority().name() : null,
                        t.getProject() != null ? t.getProject().getName() : null,
                        t.getAssignee() != null ? t.getAssignee().getName() : null,
                        t.getDueDate()
                ))
                .toList();
    }

    @Transactional
    public TaskSummary saveTask(JwtPrincipal principal, TaskSaveRequest request) {
        requireAdmin(principal);
        TaskEntity task;
        boolean isNew = request.taskId() == null;

        if (isNew) {
            throw new ApiException("管理员请通过项目创建任务");
        } else {
            task = taskRepository.findById(request.taskId())
                    .orElseThrow(() -> new ApiException("任务不存在"));
        }

        if (request.title() != null && !request.title().isBlank()) {
            task.setTitle(request.title());
        }
        if (request.description() != null) {
            task.setDescription(request.description());
        }
        if (request.status() != null) {
            task.setStatus(TaskStatus.valueOf(request.status()));
        }
        if (request.priority() != null) {
            task.setPriority(TaskPriority.valueOf(request.priority()));
        }
        if (request.assigneeId() != null) {
            UserEntity assignee = userRepository.findById(request.assigneeId())
                    .orElseThrow(() -> new ApiException("用户不存在"));
            task.setAssignee(assignee);
        }
        if (request.dueDate() != null && !request.dueDate().isBlank()) {
            task.setDueDate(java.time.LocalDate.parse(request.dueDate()));
        }

        task = taskRepository.save(task);
        if (task.getProject() != null) {
            refreshProjectProgress(task.getProject().getId());
        }
        return new TaskSummary(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus() != null ? task.getStatus().name() : null,
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getProject() != null ? task.getProject().getName() : null,
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                task.getDueDate()
        );
    }

    @Transactional
    public void deleteTask(JwtPrincipal principal, Long taskId) {
        requireAdmin(principal);
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ApiException("任务不存在"));
        Long projectId = task.getProject() != null ? task.getProject().getId() : null;
        taskRepository.delete(task);
        if (projectId != null) {
            refreshProjectProgress(projectId);
        }
    }

    // ==================== DISCUSSION MANAGEMENT ====================

    public List<DiscussionSummary> listDiscussions(JwtPrincipal principal) {
        requireAdmin(principal);
        return discussionPostRepository.findAll().stream()
                .map(d -> {
                    int replyCount = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(d.getId()).size();
                    return new DiscussionSummary(
                            d.getId(),
                            d.getTitle(),
                            d.getCategory() != null ? d.getCategory().name() : null,
                            d.getStatus() != null ? d.getStatus().name() : null,
                            d.getProject() != null ? d.getProject().getName() : null,
                            d.getAuthor() != null ? d.getAuthor().getName() : null,
                            replyCount,
                            d.getCreatedAt() != null ? d.getCreatedAt().toLocalDate() : null
                    );
                })
                .toList();
    }

    @Transactional
    public DiscussionSummary updateDiscussionStatus(JwtPrincipal principal, UpdateDiscussionStatusRequest request) {
        requireAdmin(principal);
        DiscussionPostEntity discussion = discussionPostRepository.findById(request.discussionId())
                .orElseThrow(() -> new ApiException("讨论不存在"));
        DiscussionStatus newStatus = DiscussionStatus.valueOf(request.status());
        discussion.setStatus(newStatus);
        discussion = discussionPostRepository.save(discussion);
        int replyCount = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(discussion.getId()).size();
        return new DiscussionSummary(
                discussion.getId(),
                discussion.getTitle(),
                discussion.getCategory() != null ? discussion.getCategory().name() : null,
                discussion.getStatus() != null ? discussion.getStatus().name() : null,
                discussion.getProject() != null ? discussion.getProject().getName() : null,
                discussion.getAuthor() != null ? discussion.getAuthor().getName() : null,
                replyCount,
                discussion.getCreatedAt() != null ? discussion.getCreatedAt().toLocalDate() : null
        );
    }

    @Transactional
    public void deleteDiscussion(JwtPrincipal principal, Long discussionId) {
        requireAdmin(principal);
        if (!discussionPostRepository.existsById(discussionId)) {
            throw new ApiException("讨论不存在");
        }
        discussionPostRepository.deleteById(discussionId);
    }

    // ==================== ASSIGNMENT MANAGEMENT ====================

    public List<AssignmentSummary> listAssignments(JwtPrincipal principal) {
        requireAdmin(principal);
        return assignmentRepository.findAll().stream()
                .map(a -> {
                    List<AssignmentSubmissionEntity> submissions = submissionRepository.findByAssignmentId(a.getId());
                    int total = submissions.size();
                    int graded = (int) submissions.stream()
                            .filter(s -> s.getStatus() != null && s.getStatus().name().equals("GRADED"))
                            .count();
                    return new AssignmentSummary(
                            a.getId(),
                            a.getTitle(),
                            a.getCourse() != null ? a.getCourse().getName() : null,
                            a.getDueDate() != null ? a.getDueDate().toString() : null,
                            total,
                            graded,
                            a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate() : null
                    );
                })
                .toList();
    }

    @Transactional
    public void deleteAssignment(JwtPrincipal principal, Long assignmentId) {
        requireAdmin(principal);
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new ApiException("作业不存在");
        }
        assignmentRepository.deleteById(assignmentId);
    }

    private void refreshProjectProgress(Long projectId) {
        ProjectEntity project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return;
        List<TaskEntity> tasks = taskRepository.findByProjectId(projectId);
        int progress = tasks.isEmpty() ? 0 : (int) Math.round(tasks.stream()
                .filter(task -> task.getStatus() == TaskStatus.DONE)
                .count() * 100.0 / tasks.size());
        project.setProgress(progress);
        projectRepository.save(project);
    }
}
