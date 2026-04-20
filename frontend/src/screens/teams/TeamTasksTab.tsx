import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTeamDetail } from './TeamDetailLayout';
import { CreateTaskDialog, EditTaskDialog } from './TeamDialogs';
import type { TeamTaskFormPayload } from './types';

type Filter = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'REVIEW', label: '审核中' },
  { value: 'DONE', label: '已完成' },
];

const STATUS_LABELS: Record<string, string> = {
  TODO: '待办',
  IN_PROGRESS: '进行中',
  REVIEW: '审核中',
  DONE: '已完成',
};

export function TeamTasksTab() {
  const { detail } = useTeamDetail();
  const api = useApi();
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<Filter>('ALL');

  const createTaskM = useMutation({
    mutationFn: (payload: TeamTaskFormPayload) => api.createGroupTaskTeamTask(detail.id, payload),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', detail.id] }); },
  });

  const updateTaskM = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: TeamTaskFormPayload }) =>
      api.updateGroupTaskTeamTask(taskId, payload),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', detail.id] }); },
  });

  const canEdit = detail.currentUserLeader && !detail.teacherView;
  const filtered = filter === 'ALL' ? detail.tasks : detail.tasks.filter(t => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.value === 'ALL' ? detail.tasks.length : detail.tasks.filter(t => t.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">队内任务</CardTitle>
            {canEdit && <CreateTaskDialog members={detail.members} onSubmit={p => createTaskM.mutateAsync(p)} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!filtered.length ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {filter === 'ALL' ? '暂无队内任务' : '该分类下没有任务'}
            </div>
          ) : (
            filtered.map(task => (
              <div key={task.id} className="rounded-2xl border border-muted/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>负责人：{task.assigneeName || '暂未指定'}</span>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {STATUS_LABELS[task.status] || task.status}
                      </Badge>
                      {task.dueDate && <span>截止：{task.dueDate}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <EditTaskDialog
                      task={task}
                      members={detail.members}
                      onSubmit={p => updateTaskM.mutateAsync({ taskId: task.id, payload: p })}
                    />
                  )}
                </div>
                {task.description ? <div className="mt-3 text-sm text-muted-foreground">{task.description}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}