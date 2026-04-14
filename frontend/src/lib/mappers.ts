import type { AppDocument, AppProject, AppRole, AppTask, BackendRole, DocumentRecord, ProjectRecord, TaskRecord } from './types';

function normalizeApiBase(raw: string) {
  // Dockerfile historically passed http://host:8080/api, which would cause /api/api/... in our client.
  const trimmed = (raw || '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

const API_BASE = normalizeApiBase((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080');
const COLLAB_BASE = (import.meta as any).env?.VITE_COLLAB_BASE_URL || 'ws://localhost:1234';

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
  return {
    ...doc,
    preview: doc.excerpt || stripHtml(doc.currentContent).slice(0, 120),
    collabUrl: `${COLLAB_BASE}/${doc.collabKey}`,
  };
}

export function stripHtml(content: string) {
  return (content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toApiBase(path: string) {
  return `${API_BASE}${path}`;
}
