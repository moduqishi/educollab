import type {
  AdminStats,
  AdminUserSummary,
  AdminCourseSummary,
  AdminProjectSummary,
  AdminTaskSummary,
  AdminDiscussionSummary,
  AdminAssignmentSummary,
} from '../types';
import type { RequestClient } from './base';

export function createAdminApi(request: RequestClient) {
  return {
    // Stats
    adminStats: () => request<AdminStats>('/api/admin/stats'),

    // Users
    adminUsers: () => request<AdminUserSummary[]>('/api/admin/users'),
    updateUserRole: (userId: number, role: 'STUDENT' | 'TEACHER' | 'ADMIN') =>
      request<AdminUserSummary>('/api/admin/users/role', {
        method: 'PUT',
        body: JSON.stringify({ userId, role }),
      }),
    deleteUser: (userId: number) =>
      request<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }),

    // Courses
    adminCourses: () => request<AdminCourseSummary[]>('/api/admin/courses'),
    updateCourse: (courseId: number, name: string, classCode: string) =>
      request<AdminCourseSummary>('/api/admin/courses', {
        method: 'PUT',
        body: JSON.stringify({ courseId, name, classCode }),
      }),
    deleteCourse: (courseId: number) =>
      request<void>(`/api/admin/courses/${courseId}`, { method: 'DELETE' }),

    // Projects
    adminProjects: () => request<AdminProjectSummary[]>('/api/admin/projects'),
    updateProjectStatus: (projectId: number, status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') =>
      request<AdminProjectSummary>('/api/admin/projects/status', {
        method: 'PUT',
        body: JSON.stringify({ projectId, status }),
      }),
    deleteProject: (projectId: number) =>
      request<void>(`/api/admin/projects/${projectId}`, { method: 'DELETE' }),

    // Tasks
    adminTasks: () => request<AdminTaskSummary[]>('/api/admin/tasks'),
    adminSaveTask: (payload: {
      taskId: number;
      title?: string;
      description?: string;
      status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
      assigneeId?: number;
      dueDate?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    }) =>
      request<AdminTaskSummary>('/api/admin/tasks', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteTask: (taskId: number) =>
      request<void>(`/api/admin/tasks/${taskId}`, { method: 'DELETE' }),

    // Discussions
    adminDiscussions: () => request<AdminDiscussionSummary[]>('/api/admin/discussions'),
    updateDiscussionStatus: (discussionId: number, status: 'OPEN' | 'CLOSED') =>
      request<AdminDiscussionSummary>('/api/admin/discussions/status', {
        method: 'PUT',
        body: JSON.stringify({ discussionId, status }),
      }),
    deleteDiscussion: (discussionId: number) =>
      request<void>(`/api/admin/discussions/${discussionId}`, { method: 'DELETE' }),

    // Assignments
    adminAssignments: () => request<AdminAssignmentSummary[]>('/api/admin/assignments'),
    deleteAssignment: (assignmentId: number) =>
      request<void>(`/api/admin/assignments/${assignmentId}`, { method: 'DELETE' }),
  };
}
