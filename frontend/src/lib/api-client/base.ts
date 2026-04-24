import { API_BASE, toApiBase } from '../mappers';

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

export type RequestClient = <T>(path: string, init?: RequestInit) => Promise<T>;

const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

function resolveAssetUrl(value: string) {
  if (!value) return value;
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('/')) {
    return `${API_BASE}${value}`;
  }
  return `${API_BASE}/${value.replace(/^\/+/, '')}`;
}

function normalizeApiPayload<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeApiPayload(item)) as T;
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'avatar' && typeof value === 'string') {
      normalized[key] = resolveAssetUrl(value);
      continue;
    }

    if (key === 'memberAvatars' && Array.isArray(value)) {
      normalized[key] = value.map((item) => (typeof item === 'string' ? resolveAssetUrl(item) : item));
      continue;
    }

    normalized[key] = normalizeApiPayload(value);
  }

  return normalized as T;
}

export function createRequestClient(options: ApiClientOptions): RequestClient {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const payload = (await response.json()) as { message?: string };
          throw new ApiError(payload?.message || `请求失败: ${response.status}`, response.status);
        } catch {
          throw new ApiError(`请求失败: ${response.status}`, response.status);
        }
      }
      const text = await response.text();
      throw new ApiError(text || `请求失败: ${response.status}`, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as T;
      return normalizeApiPayload(payload);
    }

    return undefined as T;
  };
}
