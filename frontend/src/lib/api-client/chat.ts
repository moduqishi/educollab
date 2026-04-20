import type { RequestClient } from './base';

export interface ChatRoomRecord {
  id: number;
  roomType: 'PROJECT' | 'COURSE';
  projectId: number | null;
  projectName: string | null;
  courseId: number | null;
  courseName: string | null;
  name: string;
  memberCount: number;
  messageCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface ChatMessageRecord {
  id: number;
  roomId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  content: string | null;
  fileAssetId: number | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
}

export function createChatApi(request: RequestClient) {
  return {
    chatRooms: () => request<ChatRoomRecord[]>('/api/chat/rooms'),
    chatMessages: (roomId: number, page = 0, size = 50) =>
      request<ChatMessageRecord[]>(`/api/chat/rooms/${roomId}/messages?page=${page}&size=${size}`),
    sendChatMessage: (roomId: number, payload: { content?: string; fileAssetId?: number; fileName?: string; fileSizeBytes?: number; mimeType?: string }) =>
      request<ChatMessageRecord>(`/api/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
    getChatProjectRoom: (projectId: number) => request<ChatRoomRecord>(`/api/chat/rooms/project/${projectId}`),
    getChatCourseRoom: (courseId: number) => request<ChatRoomRecord>(`/api/chat/rooms/course/${courseId}`),
  };
}