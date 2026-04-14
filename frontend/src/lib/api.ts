import type {
  AiReply,
  AssignmentRecord,
  AuthSession,
  CourseRecord,
  DashboardSummary,
  DiscussionPost,
  DiscussionDetail,
  DocumentRecord,
  DocumentVersionRecord,
  FileAssetRecord,
  GitBlobView,
  GitCloneInfo,
  GitTokenCreateResponse,
  GitTokenItem,
  GitTreeEntry,
  NotificationItem,
  ProjectDetail,
  ProjectRecord,
  TaskRecord,
  TeacherFeedbackRecord,
  TeacherOverview,
  TeamRecord,
  UserProfile,
} from './types';
import { toApiBase } from './mappers';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientOptions {
  getToken: () => string | null;
  onUnauthorized: () => void;
}

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    const token = options.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(toApiBase(path), { ...init, headers });
    if (response.status === 401) {
      options.onUnauthorized();
      throw new ApiError('登录状态已失效，请重新登录', 401);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || `请求失败: ${response.status}`, response.status);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return undefined as T;
  }

  return {
    login: (email: string, password: string) => request<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (payload: { name: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) =>
      request<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    me: () => request<AuthSession>('/api/auth/me'),
    users: () => request<UserProfile[]>('/api/users'),
    courses: () => request<CourseRecord[]>('/api/courses'),
    teams: () => request<TeamRecord[]>('/api/teams'),
    createTeam: (payload: { name: string; courseId: number; leaderId: number; memberIds: number[] }) =>
      request<TeamRecord>('/api/teams', { method: 'POST', body: JSON.stringify(payload) }),
    dashboard: () => request<DashboardSummary>('/api/projects/dashboard'),
    projects: () => request<ProjectRecord[]>('/api/projects'),
    projectDetail: (id: number) => request<ProjectDetail>(`/api/projects/${id}`),
    createProject: (payload: { teamId: number; courseId: number; name: string; description: string; type: 'CODE' | 'NON_CODE'; dueDate?: string; initRepository: boolean }) =>
      request<ProjectRecord>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
    addProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeProjectMember: (projectId: number, userId: number) => request<void>(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    tasks: () => request<TaskRecord[]>('/api/tasks'),
    saveTask: (payload: { projectId: number; title: string; description: string; status: TaskRecord['status']; assigneeId?: number; dueDate?: string; priority: TaskRecord['priority'] }, id?: number) =>
      request<TaskRecord>(id ? `/api/tasks/${id}` : '/api/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }),
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
    documents: () => request<DocumentRecord[]>('/api/documents'),
    documentDetail: (id: number) => request<DocumentRecord>(`/api/documents/${id}`),
    createDocument: (payload: { projectId: number; title: string; currentContent: string }) =>
      request<DocumentRecord>('/api/documents', { method: 'POST', body: JSON.stringify(payload) }),
    createOfficeDocument: async (payload: { projectId: number; title: string; ext: 'docx' | 'xlsx' | 'pptx'; file?: File | null }) => {
      const form = new FormData();
      form.append('projectId', String(payload.projectId));
      form.append('title', payload.title);
      form.append('ext', payload.ext);
      if (payload.file) form.append('file', payload.file);
      return request<DocumentRecord>('/api/documents/office', { method: 'POST', body: form });
    },
    renameDocument: (id: number, title: string) => request<DocumentRecord>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    deleteDocument: (id: number) => request<void>(`/api/documents/${id}`, { method: 'DELETE' }),
    autosaveDocument: (id: number, payload: { currentContent: string; excerpt: string; saveVersion: boolean; versionLabel?: string }) =>
      request<DocumentRecord>(`/api/documents/${id}/autosave`, { method: 'POST', body: JSON.stringify(payload) }),
    documentVersions: (id: number) => request<DocumentVersionRecord[]>(`/api/documents/${id}/versions`),
    saveDocumentVersion: (id: number, payload: { currentContent: string; versionLabel: string }) =>
      request<DocumentVersionRecord>(`/api/documents/${id}/versions`, { method: 'POST', body: JSON.stringify({ currentContent: payload.currentContent, versionLabel: payload.versionLabel, saveVersion: true, excerpt: '' }) }),
    restoreDocumentVersion: (versionId: number) => request<DocumentRecord>(`/api/documents/versions/${versionId}/restore`, { method: 'POST' }),
    saveOfficeDocument: async (docId: number, file: File, opts?: { createVersion?: boolean; versionLabel?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (opts?.createVersion) form.append('createVersion', 'true');
      if (opts?.versionLabel) form.append('versionLabel', opts.versionLabel);
      return request<DocumentRecord>(`/api/documents/${docId}/office/save`, { method: 'POST', body: form });
    },
    files: (ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT' | 'DISCUSSION_POST', ownerId: number) => request<FileAssetRecord[]>(`/api/files?ownerType=${ownerType}&ownerId=${ownerId}`),
    uploadFile: async (ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT' | 'DISCUSSION_POST', ownerId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('ownerType', ownerType);
      form.append('ownerId', String(ownerId));
      return request<FileAssetRecord>('/api/files', { method: 'POST', body: form });
    },
    downloadFileUrl: (id: number) => toApiBase(`/api/files/${id}/download`),
    notifications: () => request<NotificationItem[]>('/api/notifications'),
    markNotificationRead: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
    teacherOverview: () => request<TeacherOverview>('/api/teacher/overview'),
    assignments: () => request<AssignmentRecord[]>('/api/teacher/assignments'),
    feedbacks: () => request<TeacherFeedbackRecord[]>('/api/teacher/feedback'),
    createFeedback: (payload: { projectId: number; score: number; content: string }) =>
      request<TeacherFeedbackRecord>('/api/teacher/feedback', { method: 'POST', body: JSON.stringify(payload) }),
    initRepository: (projectId: number) => request<void>(`/api/git/repositories/init/${projectId}`, { method: 'POST' }),
    branches: (projectId: number) => request<string[]>(`/api/git/projects/${projectId}/branches`),
    createBranch: (projectId: number, name: string) => request<void>('/api/git/branches', { method: 'POST', body: JSON.stringify({ projectId, name }) }),
    commits: (projectId: number) => request<ProjectDetail['commits']>(`/api/git/projects/${projectId}/commits`),
    filesTree: (projectId: number) => request<Array<{ path: string; type: string }>>(`/api/git/projects/${projectId}/files`),
    gitTree: (projectId: number, path?: string) => request<GitTreeEntry[]>(`/api/git/projects/${projectId}/tree${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    gitBlob: (projectId: number, path: string) => request<GitBlobView>(`/api/git/projects/${projectId}/blob?path=${encodeURIComponent(path)}`),
    gitCloneInfo: (projectId: number) => request<GitCloneInfo>(`/api/git/projects/${projectId}/clone-info`),
    gitTokens: () => request<GitTokenItem[]>('/api/git/tokens'),
    createGitToken: (payload: { name: string; expiresInDays?: number }) =>
      request<GitTokenCreateResponse>('/api/git/tokens', { method: 'POST', body: JSON.stringify(payload) }),
    revokeGitToken: (id: number) => request<void>(`/api/git/tokens/${id}`, { method: 'DELETE' }),
    createMergeRequest: (payload: { projectId: number; title: string; sourceBranch: string; targetBranch: string }) =>
      request<ProjectDetail['mergeRequests'][number]>('/api/git/merge-requests', { method: 'POST', body: JSON.stringify(payload) }),
    mergeMergeRequest: (id: number) => request<ProjectDetail['mergeRequests'][number]>(`/api/git/merge-requests/${id}/merge`, { method: 'POST' }),
    createRelease: (payload: { projectId: number; version: string; title: string; description: string }) =>
      request<ProjectDetail['releases'][number]>('/api/git/releases', { method: 'POST', body: JSON.stringify(payload) }),
    aiChat: (prompt: string, scenario: string) => request<AiReply>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ prompt, scenario }) }),
  };
}
