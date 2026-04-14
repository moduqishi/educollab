import type { AppDocument, AppProject, AppRole, AppTask, BackendRole, DocumentRecord, ProjectRecord, TaskRecord } from './types';

function normalizeApiBase(raw: string) {
  // Dockerfile historically passed http://host:8080/api, which would cause /api/api/... in our client.
  const trimmed = (raw || '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

function defaultApiBase() {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const proto = window.location.protocol || 'http:';
  const host = window.location.hostname || 'localhost';
  return `${proto}//${host}:8080`;
}

function defaultCollabBase() {
  if (typeof window === 'undefined') return 'ws://localhost:1234';
  const isHttps = window.location.protocol === 'https:';
  const proto = isHttps ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  return `${proto}//${host}:1234`;
}

export const API_BASE = normalizeApiBase((import.meta as any).env?.VITE_API_BASE_URL || defaultApiBase());
export const COLLAB_BASE = (import.meta as any).env?.VITE_COLLAB_BASE_URL || defaultCollabBase();

export function mapRole(role: BackendRole): AppRole {
  return role === 'TEACHER' ? 'teacher' : 'student';
}

export function mapProject(project: ProjectRecord): AppProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    typeLabel: project.type === 'CODE' ? '代码项目' : '非代码项目',
    statusLabel: project.status === 'ACTIVE' ? '进行中' : project.status === 'COMPLETED' ? '已完成' : '已归档',
    progress: project.progress,
    courseName: project.courseName,
    teamName: project.teamName,
    dueDate: project.dueDate || '未设置',
    memberAvatars: project.memberAvatars,
    isCode: project.type === 'CODE',
  };
}

export function mapTask(task: TaskRecord): AppTask {
  const labels = {
    TODO: '待开始',
    IN_PROGRESS: '进行中',
    REVIEW: '待验收',
    DONE: '已完成',
  } as const;
  const priorityLabels = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
  } as const;

  return {
    ...task,
    statusLabel: labels[task.status],
    priorityLabel: priorityLabels[task.priority],
    dueDate: task.dueDate || '未设置',
  };
}

export function mapDocument(doc: DocumentRecord): AppDocument {
  const kind = (doc.kind || 'NOTE') as string;
  return {
    ...doc,
    preview:
      kind === 'OFFICE'
        ? doc.excerpt || `Office 文档（${doc.officeExt || 'file'}）`
        : doc.excerpt || stripHtml(doc.currentContent || '').slice(0, 120),
    collabUrl: `${COLLAB_BASE}/${doc.collabKey}`,
  };
}

export function stripHtml(content: string) {
  return (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toApiBase(path: string) {
  return `${API_BASE}${path}`;
}
