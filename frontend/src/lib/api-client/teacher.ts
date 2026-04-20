import type {
  AssignmentRecord,
  TeacherFeedbackRecord,
  TeacherOverview,
} from '../types';
import type { RequestClient } from './base';

export function createTeacherApi(request: RequestClient) {
  return {
    teacherOverview: () => request<TeacherOverview>('/api/teacher/overview'),
    assignments: () => request<AssignmentRecord[]>('/api/teacher/assignments'),
    feedbacks: () => request<TeacherFeedbackRecord[]>('/api/teacher/feedback'),
    createFeedback: (payload: { projectId: number; score: number; content: string }) =>
      request<TeacherFeedbackRecord>('/api/teacher/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  };
}
