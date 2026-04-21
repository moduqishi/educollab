import type {
  AiReply,
  DashboardSummary,
  DiscussionDetail,
  DiscussionPost,
  NotificationDetail,
  NotificationItem,
  ProjectSummaryRecord,
  ProjectDetail,
  ProjectActivityEventRecord,
  ProjectWeeklyReportRecord,
  ProjectMilestoneRecord,
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
    projectMilestones: (id: number) => request<ProjectMilestoneRecord[]>(`/api/projects/${id}/milestones`),
    projectSummary: (id: number, params?: { rangeType?: string; anchorDate?: string; startDate?: string; endDate?: string; memberId?: number | null }) =>
      request<ProjectSummaryRecord>(`/api/projects/${id}/summary${buildSummaryQuery(params)}`),
    projectSummaryActivity: (id: number, params?: { rangeType?: string; anchorDate?: string; startDate?: string; endDate?: string; memberId?: number | null }) =>
      request<ProjectActivityEventRecord[]>(`/api/projects/${id}/summary/activity${buildSummaryQuery(params)}`),
    projectWeeklyReport: (id: number, weekStart?: string) =>
      request<ProjectWeeklyReportRecord>(`/api/projects/${id}/reports/weekly${weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ''}`),
    projectActivity: (id: number, weekStart?: string) =>
      request<ProjectActivityEventRecord[]>(`/api/projects/${id}/activity${weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ''}`),
    trackProjectVisit: (id: number, pageKey?: string) =>
      request<void>(`/api/projects/${id}/activity/visit`, { method: 'POST', body: JSON.stringify({ pageKey }) }),
    projectMemberCandidates: (id: number) => request<ProjectMemberCandidate[]>(`/api/projects/${id}/member-candidates`),
    createProject: (payload: { teamId: number; courseId?: number; groupTaskId?: number; name: string; description: string; type: 'CODE' | 'NON_CODE'; dueDate?: string; initRepository: boolean }) =>
      request<ProjectRecord>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
    createProjectMilestone: (projectId: number, payload: { title: string; description?: string; weight?: number }) =>
      request<ProjectMilestoneRecord>(`/api/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(payload) }),
    completeProjectMilestone: (id: number) =>
      request<ProjectMilestoneRecord>(`/api/projects/milestones/${id}/complete`, { method: 'POST' }),
    updateProjectMilestone: (id: number, payload: { title: string; description?: string; weight?: number }) =>
      request<ProjectMilestoneRecord>(`/api/projects/milestones/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteProjectMilestone: (id: number) =>
      request<void>(`/api/projects/milestones/${id}`, { method: 'DELETE' }),
    addProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    tasks: () => request<TaskRecord[]>('/api/tasks'),
    saveTask: (payload: { projectId: number; milestoneId?: number; parentTaskId?: number; sortOrder?: number; title: string; description: string; status: TaskRecord['status']; assigneeId?: number; dueDate?: string; priority: TaskRecord['priority'] }, id?: number) =>
      request<TaskRecord>(id ? `/api/tasks/${id}` : '/api/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
    deleteProjectTask: (taskId: number) =>
      request<void>(`/api/tasks/${taskId}`, { method: 'DELETE' }),
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

function buildSummaryQuery(params?: { rangeType?: string; anchorDate?: string; startDate?: string; endDate?: string; memberId?: number | null }) {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.rangeType) search.set('rangeType', params.rangeType);
  if (params.anchorDate) search.set('anchorDate', params.anchorDate);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.memberId != null) search.set('memberId', String(params.memberId));
  const query = search.toString();
  return query ? `?${query}` : '';
}
