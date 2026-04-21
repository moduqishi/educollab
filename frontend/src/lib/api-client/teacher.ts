import type {
  AssignmentRecord,
  TeacherAssignmentCourseRecord,
  TeacherContributionReportRecord,
  TeacherFeedbackRecord,
  TeacherOverview,
  TeacherSummaryRecord,
} from '../types';
import type { RequestClient } from './base';

export function createTeacherApi(request: RequestClient) {
  return {
    teacherOverview: () => request<TeacherOverview>('/api/teacher/overview'),
    teacherSummary: (params?: { courseId?: number; rangeType?: string; anchorDate?: string; startDate?: string; endDate?: string }) =>
      request<TeacherSummaryRecord>(`/api/teacher/summary${buildSummaryQuery(params)}`),
    teacherContributions: (courseId?: number, weekStart?: string) =>
      request<TeacherContributionReportRecord>(`/api/teacher/contributions${buildQuery(courseId, weekStart)}`),
    assignments: () => request<AssignmentRecord[]>('/api/teacher/assignments'),
    assignmentCourses: () => request<TeacherAssignmentCourseRecord[]>('/api/teacher/assignment-courses'),
    feedbacks: () => request<TeacherFeedbackRecord[]>('/api/teacher/feedback'),
    createFeedback: (payload: { projectId: number; score: number; content: string }) =>
      request<TeacherFeedbackRecord>('/api/teacher/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  };
}

function buildQuery(courseId?: number, weekStart?: string) {
  const params = new URLSearchParams();
  if (courseId != null) params.set('courseId', String(courseId));
  if (weekStart) params.set('weekStart', weekStart);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildSummaryQuery(params?: { courseId?: number; rangeType?: string; anchorDate?: string; startDate?: string; endDate?: string }) {
  const search = new URLSearchParams();
  if (params?.courseId != null) search.set('courseId', String(params.courseId));
  if (params?.rangeType) search.set('rangeType', params.rangeType);
  if (params?.anchorDate) search.set('anchorDate', params.anchorDate);
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  const query = search.toString();
  return query ? `?${query}` : '';
}
