import type { AuthSession } from '../types';
import type { RequestClient } from './base';

export function createAuthApi(request: RequestClient) {
  return {
    login: (email: string, password: string) =>
      request<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (payload: { name: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) =>
      request<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    me: () => request<AuthSession>('/api/auth/me'),
  };
}
