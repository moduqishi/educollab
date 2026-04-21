import type {
  DocumentRecord,
  DocumentVersionRecord,
  FileAssetRecord,
} from '../types';
import { toApiBase } from '../mappers';
import type { RequestClient } from './base';

export function createDocumentApi(request: RequestClient) {
  return {
    documents: () => request<DocumentRecord[]>('/api/documents'),
    documentDetail: (id: number) => request<DocumentRecord>(`/api/documents/${id}`),
    createDocument: (payload: { projectId: number; title: string; currentContent: string }) =>
      request<DocumentRecord>('/api/documents', { method: 'POST', body: JSON.stringify(payload) }),
    createOfficeDocument: async (payload: { projectId: number; title: string; ext: 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx'; file?: File | null }) => {
      const form = new FormData();
      form.append('projectId', String(payload.projectId));
      form.append('title', payload.title);
      form.append('ext', payload.ext);
      if (payload.file) form.append('file', payload.file);
      return request<DocumentRecord>('/api/documents/office', { method: 'POST', body: form });
    },
    ensureDocumentFromProjectFile: (projectId: number, path: string) =>
      request<DocumentRecord>('/api/documents/from-project-file', {
        method: 'POST',
        body: JSON.stringify({ projectId, path }),
      }),
    renameDocument: (id: number, title: string) => request<DocumentRecord>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    deleteDocument: (id: number) => request<void>(`/api/documents/${id}`, { method: 'DELETE' }),
    autosaveDocument: (id: number, payload: { currentContent: string; excerpt: string; saveVersion: boolean; versionLabel?: string }) =>
      request<DocumentRecord>(`/api/documents/${id}/autosave`, { method: 'POST', body: JSON.stringify(payload) }),
    documentVersions: (id: number) => request<DocumentVersionRecord[]>(`/api/documents/${id}/versions`),
    saveDocumentVersion: (id: number, payload: { currentContent: string; versionLabel: string }) =>
      request<DocumentVersionRecord>(`/api/documents/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ currentContent: payload.currentContent, versionLabel: payload.versionLabel, saveVersion: true, excerpt: '' }),
      }),
    restoreDocumentVersion: (versionId: number) => request<DocumentRecord>(`/api/documents/versions/${versionId}/restore`, { method: 'POST' }),
    saveOfficeDocument: async (docId: number, file: File, opts?: { createVersion?: boolean; versionLabel?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (opts?.createVersion) form.append('createVersion', 'true');
      if (opts?.versionLabel) form.append('versionLabel', opts.versionLabel);
      return request<DocumentRecord>(`/api/documents/${docId}/office/save`, { method: 'POST', body: form });
    },
    files: (ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT' | 'DISCUSSION_POST' | 'ASSIGNMENT_SUBMISSION' | 'CHAT_MESSAGE', ownerId: number) => request<FileAssetRecord[]>(`/api/files?ownerType=${ownerType}&ownerId=${ownerId}`),
    uploadFile: async (ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT' | 'DISCUSSION_POST' | 'ASSIGNMENT_SUBMISSION' | 'CHAT_MESSAGE', ownerId: number, file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('ownerType', ownerType);
      form.append('ownerId', String(ownerId));
      return request<FileAssetRecord>('/api/files', { method: 'POST', body: form });
    },
    downloadFileUrl: (id: number) => {
      const token = localStorage.getItem('educollab.token');
      const base = toApiBase(`/api/files/${id}/download`);
      return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
    },
  };
}
