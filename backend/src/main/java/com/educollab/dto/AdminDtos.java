package com.educollab.dto;

import com.educollab.model.UserRole;
import java.time.LocalDate;

public class AdminDtos {
  public record AdminStats(
      long totalUsers,
      long totalStudents,
      long totalTeachers,
      long totalCourses,
      long totalProjects,
      long totalTasks,
      long totalDiscussions,
      long totalAssignments
  ) {}

  public record UserSummary(
      Long id,
      String name,
      String email,
      UserRole role,
      String avatar,
      LocalDate createdAt
  ) {}

  public record UpdateUserRoleRequest(Long userId, UserRole role) {}

  public record CourseSummary(
      Long id,
      String name,
      String classCode,
      String teacherName,
      int memberCount,
      LocalDate createdAt
  ) {}

  public record ProjectSummary(
      Long id,
      String name,
      String type,
      String status,
      int progress,
      String courseName,
      String teamName,
      LocalDate createdAt
  ) {}

  public record TaskSummary(
      Long id,
      String title,
      String description,
      String status,
      String priority,
      String projectName,
      String assigneeName,
      LocalDate dueDate
  ) {}

  public record DiscussionSummary(
      Long id,
      String title,
      String category,
      String status,
      String projectName,
      String authorName,
      int replyCount,
      LocalDate createdAt
  ) {}

  public record AssignmentSummary(
      Long id,
      String title,
      String courseName,
      String dueDate,
      int totalSubmissions,
      int gradedSubmissions,
      LocalDate createdAt
  ) {}

  // Course management
  public record UpdateCourseRequest(Long courseId, String name, String classCode) {}
  public record DeleteCourseRequest(Long courseId) {}

  // Project management
  public record UpdateProjectStatusRequest(Long projectId, String status) {}
  public record DeleteProjectRequest(Long projectId) {}

  // Task management
  public record TaskSaveRequest(
      Long taskId,
      String title,
      String description,
      String status,
      Long assigneeId,
      String dueDate,
      String priority
  ) {}

  // Discussion management
  public record UpdateDiscussionStatusRequest(Long discussionId, String status) {}
  public record DeleteDiscussionRequest(Long discussionId) {}

  // Assignment management
  public record DeleteAssignmentRequest(Long assignmentId) {}
}
