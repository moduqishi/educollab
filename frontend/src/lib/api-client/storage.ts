import type {
  StorageEntryRecord,
  StorageFolderRecord,
  StorageWorkspaceRecord,
} from '../types';
import { toApiBase } from '../mappers';
import type { RequestClient } from './base';

export function createStorageApi(request: RequestClient) {
  return {
    storageWorkspace: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, includeSystem = false) =>
      request<StorageWorkspaceRecord>(`/api/storage/tree?scopeType=${scopeType}&scopeId=${scopeId}&includeSystem=${includeSystem}`),
    storageFolder: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path = '') =>
      request<StorageFolderRecord>(`/api/storage/entries?scopeType=${scopeType}&scopeId=${scopeId}&path=${encodeURIComponent(path)}`),
    createStorageFolder: (payload: { scopeType: 'COURSE' | 'TEAM' | 'PROJECT'; scopeId: number; parentPath?: string | null; name: string }) =>
      request<StorageEntryRecord>('/api/storage/folders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    uploadStorageFile: async (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path: string, file: File) => {
      const form = new FormData();
      form.append('scopeType', scopeType);
      form.append('scopeId', String(scopeId));
      form.append('path', path);
      form.append('file', file);
      return request<StorageEntryRecord>('/api/storage/files', { method: 'POST', body: form });
    },
    renameStorageEntry: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path: string, name: string) =>
      request<StorageEntryRecord>('/api/storage/entries', {
        method: 'PATCH',
        body: JSON.stringify({ scopeType, scopeId, path, name }),
      }),
    moveStorageEntry: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path: string, targetPath: string) =>
      request<StorageEntryRecord>('/api/storage/entries/move', {
        method: 'POST',
        body: JSON.stringify({ scopeType, scopeId, path, targetPath }),
      }),
    deleteStorageEntry: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path: string) =>
      request<void>(`/api/storage/entries?scopeType=${scopeType}&scopeId=${scopeId}&path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
    batchDeleteStorageEntries: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, entryPaths: string[]) =>
      request<void>('/api/storage/entries/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ scopeType, scopeId, entryPaths }),
      }),
    batchMoveStorageEntries: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, entryPaths: string[], targetPath: string) =>
      request<void>('/api/storage/entries/batch-move', {
        method: 'POST',
        body: JSON.stringify({ scopeType, scopeId, entryPaths, targetPath }),
      }),
    downloadStorageEntryUrl: (scopeType: 'COURSE' | 'TEAM' | 'PROJECT', scopeId: number, path: string) => {
      const token = localStorage.getItem('educollab.token');
      const base = toApiBase(`/api/storage/download?scopeType=${scopeType}&scopeId=${scopeId}&path=${encodeURIComponent(path)}`);
      return token ? `${base}&access_token=${encodeURIComponent(token)}` : base;
    },
  };
}
