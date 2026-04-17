import type {
  ChangePasswordPayload,
  CourseRecord,
  TeamRecord,
  UpdateMyProfilePayload,
  UserProfile,
} from '../types';
import type { RequestClient } from './base';

export function createUserApi(request: RequestClient) {
  return {
    users: () => request<UserProfile[]>('/api/users'),
    userMe: () => request<UserProfile>('/api/users/me'),
    updateMyProfile: (payload: UpdateMyProfilePayload) => request<UserProfile>('/api/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
    uploadMyAvatar: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<UserProfile>('/api/users/me/avatar', { method: 'POST', body: form });
    },
    changeMyPassword: (payload: ChangePasswordPayload) => request<void>('/api/users/me/change-password', { method: 'POST', body: JSON.stringify(payload) }),
    courses: () => request<CourseRecord[]>('/api/courses'),
    teams: () => request<TeamRecord[]>('/api/teams'),
    createTeam: (payload: { name: string; courseId: number; leaderId: number; memberIds: number[] }) =>
      request<TeamRecord>('/api/teams', { method: 'POST', body: JSON.stringify(payload) }),
  };
}
