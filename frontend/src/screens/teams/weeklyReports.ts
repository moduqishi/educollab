import React from 'react';
import type { WeeklyReportRecord } from '@/lib/types';
import type { WeeklyReportDraft } from './types';

const REPORT_KEY = 'educollab.weekly-reports';

export function useWeeklyReports(teamId: number) {
  const [items, setItems] = React.useState<WeeklyReportRecord[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REPORT_KEY);
      const parsed: WeeklyReportRecord[] = raw ? JSON.parse(raw) : [];
      setItems(parsed.filter((item) => item.teamId === teamId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch {
      setItems([]);
    }
  }, [teamId]);

  const persist = React.useCallback((updater: (all: WeeklyReportRecord[]) => WeeklyReportRecord[]) => {
    const raw = window.localStorage.getItem(REPORT_KEY);
    const parsed: WeeklyReportRecord[] = raw ? JSON.parse(raw) : [];
    const next = updater(parsed);
    window.localStorage.setItem(REPORT_KEY, JSON.stringify(next));
    setItems(next.filter((item) => item.teamId === teamId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, [teamId]);

  return {
    items,
    createReport(payload: WeeklyReportDraft, currentUserId?: number, currentUserName?: string) {
      persist((all) => [
        {
          id: crypto.randomUUID(),
          teamId,
          authorId: currentUserId ?? 0,
          authorName: currentUserName || '当前成员',
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...all,
      ]);
    },
    updateReport(reportId: string, payload: WeeklyReportDraft) {
      persist((all) => all.map((item) => item.id === reportId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item));
    },
  };
}
