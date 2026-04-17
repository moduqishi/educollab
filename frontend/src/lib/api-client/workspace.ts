import type {
  AiReply,
  DashboardSummary,
  DiscussionDetail,
  DiscussionPost,
  NotificationDetail,
  NotificationItem,
  ProjectDetail,
  ProjectMemberCandidate,
  ProjectRecord,
  TaskRecord,
} from '../types';
import type { RequestClient } from './base';

export function createWorkspaceApi(request: RequestClient) {
  return {
    dashboard: () => request<DashboardSummary>('/api/projects/dashboard'),
    projects: () => request<ProjectRecord[]>('/api/projects'),
    projectDetail: (id: number) => request<ProjectDetail>(`/api/projects/${id}`),
    projectMemberCandidates: (id: number) => request<ProjectMemberCandidate[]>(`/api/projects/${id}/member-candidates`),
    createProject: (payload: { teamId: number; courseId: number; groupTaskId?: number; name: string; description: string; type: 'CODE' | 'NON_CODE'; dueDate?: string; initRepository: boolean }) =>
      request<ProjectRecord>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
    addProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    tasks: () => request<TaskRecord[]>('/api/tasks'),
    saveTask: (payload: { projectId: number; title: string; description: string; status: TaskRecord['status']; assigneeId?: number; dueDate?: string; priority: TaskRecord['priority'] }, id?: number) =>
      request<TaskRecord>(id ? `/api/tasks/${id}` : '/api/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
    deleteTaskAttachment: (taskId: number, fileId: number) =>
      request<void>(`/api/tasks/${taskId}/attachments/${fileId}`, { method: 'DELETE' }),
    discussions: () => request<DiscussionPost[]>('/api/discussions'),
    discussionDetail: (id: number) => request<DiscussionDetail>(`/api/discussions/${id}`),
    createDiscussion: (payload: { projectId: number; title: string; content: string; category: string }) =>
      request<DiscussionDetail>('/api/discussions', { method: 'POST', body: JSON.stringify(payload) }),
    updateDiscussion: (id: number, payload: { status?: string; category?: string }) =>
      request<DiscussionDetail>(`/api/discussions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    replyDiscussion: (id: number, content: string) =>
      request<DiscussionDetail>(`/api/discussions/${id}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),
    linkedDiscussionTasks: (id: number) => request<TaskRecord[]>(`/api/discussions/${id}/tasks`),
    linkDiscussionTask: (id: number, taskId: number) => request<TaskRecord[]>(`/api/discussions/${id}/tasks/${taskId}`, { method: 'POST' }),
    unlinkDiscussionTask: (id: number, taskId: number) => request<TaskRecord[]>(`/api/discussions/${id}/tasks/${taskId}`, { method: 'DELETE' }),
    notifications: () => request<NotificationItem[]>('/api/notifications'),
    notificationDetail: (id: number) => request<NotificationDetail>(`/api/notifications/${id}`),
    markNotificationRead: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllNotificationsRead: () => request<void>('/api/notifications/read-all', { method: 'POST' }),
    aiChat: (prompt: string, scenario: string) => request<AiReply>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ prompt, scenario }) }),
  };
}
