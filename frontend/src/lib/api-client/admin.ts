import type {
  AdminActionResultRecord,
  AdminAssignmentSummary,
  AdminAuditRecord,
  AdminCourseDetailRecord,
  AdminCourseSummary,
  AdminBulkActionResultRecord,
  AdminDocumentSummary,
  AdminImportJobRecord,
  AdminImportPreviewRecord,
  AdminImportResultRecord,
  AdminOverviewRecord,
  AdminProjectDetailRecord,
  AdminProjectSummary,
  AdminStorageDirectoryRecord,
  AdminStorageFilePreviewRecord,
  AdminStorageItemRecord,
  AdminStorageTreeRecord,
  AdminStats,
  AdminSystemHealthRecord,
  AdminSystemOverviewRecord,
  AdminTaskSummary,
  AdminDiscussionSummary,
  AdminTeamDetailRecord,
  AdminTeamSummary,
  AdminUserDetailRecord,
  AdminUserSummary,
} from '../types';
import type { RequestClient } from './base';

export function createAdminApi(request: RequestClient) {
  return {
    adminStats: () => request<AdminStats>('/api/admin/stats'),
    adminOverview: () => request<AdminOverviewRecord>('/api/admin/overview'),

    adminUsers: () => request<AdminUserSummary[]>('/api/admin/users'),
    adminUserDetail: (userId: number) => request<AdminUserDetailRecord>(`/api/admin/users/${userId}`),
    updateUserRole: (userId: number, role: 'STUDENT' | 'TEACHER' | 'ADMIN') =>
      request<AdminUserSummary>('/api/admin/users/role', {
        method: 'PUT',
        body: JSON.stringify({ userId, role }),
      }),
    updateAdminUser: (userId: number, payload: { name?: string; email?: string; role?: 'STUDENT' | 'TEACHER' | 'ADMIN'; active?: boolean }) =>
      request<AdminUserSummary>(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    resetAdminUserPassword: (userId: number, newPassword?: string) =>
      request<AdminUserSummary>(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
    deleteUser: (userId: number) =>
      request<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }),

    adminCourses: () => request<AdminCourseSummary[]>('/api/admin/courses'),
    createAdminCourse: (payload: { name: string; classCode?: string; teacherId?: number | null }) =>
      request<AdminCourseSummary>('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    adminCourseDetail: (courseId: number) => request<AdminCourseDetailRecord>(`/api/admin/courses/${courseId}`),
    updateCourse: (courseId: number, name: string, classCode: string, teacherId?: number | null) =>
      request<AdminCourseSummary>('/api/admin/courses', {
        method: 'PUT',
        body: JSON.stringify({ courseId, name, classCode, teacherId }),
      }),
    addAdminCourseMember: (courseId: number, payload: { userId: number; role?: string }) =>
      request<AdminCourseDetailRecord>(`/api/admin/courses/${courseId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    removeAdminCourseMember: (courseId: number, userId: number) =>
      request<AdminCourseDetailRecord>(`/api/admin/courses/${courseId}/members/${userId}`, { method: 'DELETE' }),
    deleteCourse: (courseId: number) =>
      request<void>(`/api/admin/courses/${courseId}`, { method: 'DELETE' }),
    previewCourseImport: async (courseId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<AdminImportPreviewRecord>(`/api/admin/courses/${courseId}/import/preview`, { method: 'POST', body: form });
    },
    executeCourseImport: async (courseId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<AdminImportResultRecord>(`/api/admin/courses/${courseId}/import/execute`, { method: 'POST', body: form });
    },
    adminCourseImports: (courseId: number) => request<AdminImportJobRecord[]>(`/api/admin/courses/${courseId}/imports`),

    adminTeams: () => request<AdminTeamSummary[]>('/api/admin/teams'),
    createAdminTeam: (payload: { name: string; courseId?: number | null; groupOrder?: number | null; leaderUserId?: number | null; memberIds?: number[]; status?: string }) =>
      request<AdminTeamSummary>('/api/admin/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    adminTeamDetail: (teamId: number) => request<AdminTeamDetailRecord>(`/api/admin/teams/${teamId}`),
    updateAdminTeam: (teamId: number, payload: { courseId?: number | null; name?: string; status?: string; groupOrder?: number | null; leaderUserId?: number | null }) =>
      request<AdminTeamSummary>(`/api/admin/teams/${teamId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    addAdminTeamMember: (teamId: number, userId: number) =>
      request<AdminTeamDetailRecord>(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    removeAdminTeamMember: (teamId: number, userId: number) =>
      request<AdminTeamDetailRecord>(`/api/admin/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    transferAdminTeamLeader: (teamId: number, leaderUserId: number) =>
      request<AdminTeamSummary>(`/api/admin/teams/${teamId}/leader`, {
        method: 'POST',
        body: JSON.stringify({ leaderUserId }),
      }),

    adminProjects: () => request<AdminProjectSummary[]>('/api/admin/projects'),
    adminProjectDetail: (projectId: number) => request<AdminProjectDetailRecord>(`/api/admin/projects/${projectId}`),
    updateProjectStatus: (projectId: number, status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED') =>
      request<AdminProjectSummary>('/api/admin/projects/status', {
        method: 'PUT',
        body: JSON.stringify({ projectId, status }),
      }),
    updateAdminProject: (projectId: number, payload: { projectId: number; name?: string; description?: string; status?: string; courseId?: number | null; teamId?: number | null; dueDate?: string | null }) =>
      request<AdminProjectSummary>(`/api/admin/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    addAdminProjectMember: (projectId: number, payload: { userId: number; ownerFlag?: boolean }) =>
      request<AdminProjectDetailRecord>(`/api/admin/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    removeAdminProjectMember: (projectId: number, userId: number) =>
      request<AdminProjectDetailRecord>(`/api/admin/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    deleteProject: (projectId: number) =>
      request<void>(`/api/admin/projects/${projectId}`, { method: 'DELETE' }),

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

    adminDiscussions: () => request<AdminDiscussionSummary[]>('/api/admin/discussions'),
    updateDiscussionStatus: (discussionId: number, status: 'OPEN' | 'CLOSED') =>
      request<AdminDiscussionSummary>('/api/admin/discussions/status', {
        method: 'PUT',
        body: JSON.stringify({ discussionId, status }),
      }),
    deleteDiscussion: (discussionId: number) =>
      request<void>(`/api/admin/discussions/${discussionId}`, { method: 'DELETE' }),

    adminAssignments: () => request<AdminAssignmentSummary[]>('/api/admin/assignments'),
    deleteAssignment: (assignmentId: number) =>
      request<void>(`/api/admin/assignments/${assignmentId}`, { method: 'DELETE' }),

    adminDocuments: () => request<AdminDocumentSummary[]>('/api/admin/documents'),
    adminAudit: (params?: { scopeType?: string; scopeId?: number; limit?: number }) =>
      request<AdminAuditRecord[]>(`/api/admin/audit${buildQuery(params)}`),
    adminSystemOverview: () => request<AdminSystemOverviewRecord>('/api/admin/system'),
    adminSystemHealth: () => request<AdminSystemHealthRecord[]>('/api/admin/system/health'),
    adminSendAnnouncement: (payload: { title: string; content: string; sourcePath?: string; sourceLabel?: string }) =>
      request<AdminActionResultRecord>('/api/admin/system/announce', { method: 'POST', body: JSON.stringify(payload) }),
    adminRecomputeProgress: () => request<AdminActionResultRecord>('/api/admin/system/recompute-progress', { method: 'POST' }),
    adminScanStorage: () => request<AdminBulkActionResultRecord>('/api/admin/system/maintenance/scan-storage'),
    adminMigrateStorage: () => request<AdminActionResultRecord>('/api/admin/system/maintenance/migrate-storage', { method: 'POST' }),
    addUserCourseMembership: (userId: number, payload: { courseId: number; role?: string }) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/courses`, { method: 'POST', body: JSON.stringify(payload) }),
    removeUserCourseMembership: (userId: number, courseId: number) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/courses/${courseId}`, { method: 'DELETE' }),
    addUserTeamMembership: (userId: number, payload: { teamId: number }) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/teams`, { method: 'POST', body: JSON.stringify(payload) }),
    removeUserTeamMembership: (userId: number, teamId: number) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/teams/${teamId}`, { method: 'DELETE' }),
    addUserProjectMembership: (userId: number, payload: { projectId: number; ownerFlag?: boolean }) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/projects`, { method: 'POST', body: JSON.stringify(payload) }),
    removeUserProjectMembership: (userId: number, projectId: number) =>
      request<AdminUserDetailRecord>(`/api/admin/users/${userId}/projects/${projectId}`, { method: 'DELETE' }),
    adminStorageTree: () => request<AdminStorageTreeRecord[]>('/api/admin/storage/tree'),
    adminStorageFiles: () => request<AdminStorageItemRecord[]>('/api/admin/storage/files'),
    adminStorageRepos: () => request<AdminStorageItemRecord[]>('/api/admin/storage/repos'),
    adminStorageLogs: () => request<AdminStorageItemRecord[]>('/api/admin/storage/logs'),
    adminProjectSystemEntries: (projectId: number, path?: string) =>
      request<AdminStorageDirectoryRecord>(`/api/admin/storage/project-system?projectId=${projectId}${path ? `&path=${encodeURIComponent(path)}` : ''}`),
    adminProjectSystemFile: (projectId: number, path: string) =>
      request<AdminStorageFilePreviewRecord>(`/api/admin/storage/project-system/file?projectId=${projectId}&path=${encodeURIComponent(path)}`),
  };
}

function buildQuery(params?: { scopeType?: string; scopeId?: number; limit?: number }) {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.scopeType) search.set('scopeType', params.scopeType);
  if (params.scopeId != null) search.set('scopeId', String(params.scopeId));
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : '';
}
