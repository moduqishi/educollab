import type {
  GitBlobView,
  GitCloneInfo,
  GitTokenCreateResponse,
  GitTokenItem,
  GitTreeEntry,
  ProjectDetail,
} from '../types';
import type { RequestClient } from './base';

export function createGitApi(request: RequestClient) {
  return {
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
  };
}
