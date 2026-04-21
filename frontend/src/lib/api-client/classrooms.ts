import type {
  AssignmentRecord,
  AssignmentSubmissionRecord,
  ClassDetail,
  ClassInvitation,
  ClassProjectRecord,
  ClassRecord,
  GroupTaskRecord,
  GroupTaskSubTaskRecord,
  GroupTaskTeamDetail,
  GroupTaskTeamRecord,
  ProjectRecord,
  TeamRecord,
} from '../types';
import type { RequestClient } from './base';

export function createClassroomApi(request: RequestClient) {
  return {
    classes: () => request<ClassRecord[]>('/api/classes'),
    classDetail: (id: number) => request<ClassDetail>(`/api/classes/${id}`),
    createClass: (payload: { name: string }) => request<ClassRecord>('/api/classes', { method: 'POST', body: JSON.stringify(payload) }),
    joinClassByCode: (classCode: string) => request<ClassRecord>('/api/classes/join-by-code', { method: 'POST', body: JSON.stringify({ classCode }) }),
    resetClassCode: (id: number) => request<ClassRecord>(`/api/classes/${id}/reset-code`, { method: 'POST' }),
    inviteToClass: (id: number, email: string) => request<ClassInvitation>(`/api/classes/${id}/invitations`, { method: 'POST', body: JSON.stringify({ email }) }),
    pendingClassInvitations: () => request<ClassInvitation[]>('/api/classes/invitations'),
    acceptClassInvitation: (id: number) => request<void>(`/api/classes/invitations/${id}/accept`, { method: 'POST' }),
    rejectClassInvitation: (id: number) => request<void>(`/api/classes/invitations/${id}/reject`, { method: 'POST' }),
    classAssignments: (id: number) => request<AssignmentRecord[]>(`/api/classes/${id}/assignments`),
    classTeams: (id: number) => request<TeamRecord[]>(`/api/classes/${id}/teams`),
    classProjects: (id: number) => request<ClassProjectRecord[]>(`/api/classes/${id}/projects`),
    createAssignment: (id: number, payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string }) =>
      request<AssignmentRecord>(`/api/classes/${id}/assignments`, { method: 'POST', body: JSON.stringify(payload) }),
    updateAssignment: (classId: number, assignmentId: number, payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string }) =>
      request<AssignmentRecord>(`/api/classes/${classId}/assignments/${assignmentId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    deleteClassAssignment: (classId: number, assignmentId: number) =>
      request<void>(`/api/classes/${classId}/assignments/${assignmentId}`, { method: 'DELETE' }),
    closeAssignment: (classId: number, assignmentId: number) =>
      request<AssignmentRecord>(`/api/classes/${classId}/assignments/${assignmentId}/close`, { method: 'POST' }),
    reopenAssignment: (classId: number, assignmentId: number) =>
      request<AssignmentRecord>(`/api/classes/${classId}/assignments/${assignmentId}/reopen`, { method: 'POST' }),
    myAssignmentSubmission: (classId: number, assignmentId: number) =>
      request<AssignmentSubmissionRecord>(`/api/classes/${classId}/assignments/${assignmentId}/submissions/me`),
    saveMyAssignmentDraft: (classId: number, assignmentId: number, payload: { content?: string; submissionUrl?: string; linkedProjectId?: number | null; linkedDocumentId?: number | null }) =>
      request<AssignmentSubmissionRecord>(`/api/classes/${classId}/assignments/${assignmentId}/submissions/me/draft`, { method: 'PUT', body: JSON.stringify(payload) }),
    submitMyAssignment: (classId: number, assignmentId: number, payload: { content?: string; submissionUrl?: string; linkedProjectId?: number | null; linkedDocumentId?: number | null }) =>
      request<AssignmentSubmissionRecord>(`/api/classes/${classId}/assignments/${assignmentId}/submissions/me/submit`, { method: 'POST', body: JSON.stringify(payload) }),
    deleteMyAssignmentAttachment: (classId: number, assignmentId: number, fileId: number) =>
      request<AssignmentSubmissionRecord>(`/api/classes/${classId}/assignments/${assignmentId}/submissions/me/attachments/${fileId}`, { method: 'DELETE' }),
    assignmentSubmissions: (classId: number, assignmentId: number) =>
      request<AssignmentSubmissionRecord[]>(`/api/classes/${classId}/assignments/${assignmentId}/submissions`),
    reviewAssignmentSubmission: (
      classId: number,
      assignmentId: number,
      submissionId: number,
      payload: { status: 'RETURNED' | 'GRADED'; score?: number | null; teacherFeedback?: string },
    ) => request<AssignmentSubmissionRecord>(`/api/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}/review`, { method: 'PUT', body: JSON.stringify(payload) }),
    classGroupTasks: (id: number) => request<GroupTaskRecord[]>(`/api/classes/${id}/group-tasks`),
    createGroupTask: (id: number, payload: { title: string; description: string; minMembers?: number; maxMembers?: number; dueDate?: string }) =>
      request<GroupTaskRecord>(`/api/classes/${id}/group-tasks`, { method: 'POST', body: JSON.stringify(payload) }),
    groupTaskDetail: (id: number) => request<GroupTaskRecord>(`/api/group-tasks/${id}`),
    createGroupTaskTeam: (id: number, payload: { name: string }) => request<GroupTaskTeamRecord>(`/api/group-tasks/${id}/teams`, { method: 'POST', body: JSON.stringify(payload) }),
    groupTaskTeamDetail: (id: number) => request<GroupTaskTeamDetail>(`/api/group-task-teams/${id}`),
    joinGroupTaskTeam: (id: number) => request<GroupTaskTeamRecord>(`/api/group-task-teams/${id}/join`, { method: 'POST' }),
    leaveGroupTaskTeam: (id: number) => request<GroupTaskTeamRecord | null>(`/api/group-task-teams/${id}/leave`, { method: 'POST' }),
    transferGroupTaskLeader: (id: number, leaderUserId: number) =>
      request<GroupTaskTeamRecord>(`/api/group-task-teams/${id}/transfer-leader`, { method: 'POST', body: JSON.stringify({ leaderUserId }) }),
    groupTaskTeamTasks: (id: number) => request<GroupTaskSubTaskRecord[]>(`/api/group-task-teams/${id}/tasks`),
    createGroupTaskTeamTask: (id: number, payload: { title: string; description: string; status?: string; assigneeId?: number; dueDate?: string }) =>
      request<GroupTaskSubTaskRecord>(`/api/group-task-teams/${id}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
    updateGroupTaskTeamTask: (id: number, payload: { title: string; description: string; status?: string; assigneeId?: number; dueDate?: string }) =>
      request<GroupTaskSubTaskRecord>(`/api/group-task-teams/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    createGroupTaskTeamProject: (id: number, payload: { name: string; description: string; type: 'CODE' | 'NON_CODE'; dueDate?: string; initRepository: boolean }) =>
      request<ProjectRecord>(`/api/group-task-teams/${id}/project`, { method: 'POST', body: JSON.stringify(payload) }),
    removeGroupTaskTeamMember: (teamId: number, userId: number) =>
      request<void>(`/api/group-task-teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
  };
}
