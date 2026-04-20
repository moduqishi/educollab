import type { WeeklyReportRecord } from '@/lib/types';

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
