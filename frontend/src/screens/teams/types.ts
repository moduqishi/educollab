import type { TaskRecord, WeeklyReportRecord } from '@/lib/types';

export type TeamTaskFormPayload = {
  title: string;
  description: string;
  status?: string;
  assigneeId?: number;
  dueDate?: string;
};

export type TeamProjectFormPayload = {
  name: string;
  description: string;
  type: 'CODE' | 'NON_CODE';
  dueDate?: string;
  initRepository: boolean;
};

export type WeeklyReportDraft = Omit<WeeklyReportRecord, 'id' | 'teamId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>;

export type TeamTaskTreeItem = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: TaskRecord['status'];
  assigneeId?: number | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  priority: TaskRecord['priority'];
};

export type TeamProjectTaskGroup = {
  projectId: number;
  projectName: string;
  projectStatus?: string | null;
  progress: number;
  totalTaskCount: number;
  completedTaskCount: number;
  canEdit: boolean;
  items: TeamTaskTreeItem[];
};
