import type { AssignmentRecord, AssignmentSubmissionStatus, TaskRecord } from '@/lib/types';

export type StudentTodoView = 'all' | 'assignments' | 'tasks';

export const assignmentTodoLabel: Record<AssignmentSubmissionStatus, string> = {
  NOT_SUBMITTED: '未开始',
  DRAFT: '草稿（待提交）',
  SUBMITTED: '待批改',
  RETURNED: '已退回',
  GRADED: '已评分',
};

export const taskTodoLabel: Record<TaskRecord['status'], string> = {
  TODO: '待办',
  IN_PROGRESS: '进行中',
  REVIEW: '进行中',
  DONE: '已完成',
};

export function assignmentTodoRank(status?: AssignmentSubmissionStatus | null) {
  switch (status) {
    case 'RETURNED':
      return 0;
    case 'DRAFT':
      return 1;
    case 'NOT_SUBMITTED':
    case null:
    case undefined:
      return 2;
    case 'SUBMITTED':
      return 3;
    case 'GRADED':
      return 4;
    default:
      return 9;
  }
}

export function taskTodoRank(task: TaskRecord, currentUserId?: number | null) {
  const mine = !!currentUserId && task.assigneeId === currentUserId;
  const dueScore = dateDistanceScore(task.dueDate);
  const statusScore = task.status === 'DONE' ? 30 : task.status === 'TODO' ? 0 : 10;
  return (mine ? -20 : 0) + dueScore + statusScore;
}

export function nextTaskStatus(status: TaskRecord['status']): TaskRecord['status'] {
  if (status === 'TODO') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS' || status === 'REVIEW') return 'DONE';
  return 'TODO';
}

export function isDueThisWeek(date?: string | null) {
  if (!date) return false;
  const target = parseDateOnly(date);
  if (!target) return false;
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return target >= start && target <= end;
}

export function compareDateAsc(left?: string | null, right?: string | null) {
  const leftTime = parseDateOnly(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = parseDateOnly(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
}

export function isActionableAssignment(assignment: AssignmentRecord) {
  return (assignment.currentUserSubmissionStatus ?? 'NOT_SUBMITTED') !== 'GRADED';
}

function dateDistanceScore(date?: string | null) {
  const parsed = parseDateOnly(date);
  if (!parsed) return 20;
  const diff = parsed.getTime() - Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < 0) return -10;
  if (diff <= dayMs) return -8;
  if (diff <= dayMs * 3) return -4;
  if (diff <= dayMs * 7) return 0;
  return 8;
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
