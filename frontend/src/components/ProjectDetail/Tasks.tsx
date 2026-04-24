import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  FolderTree,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ProjectDetail, ProjectMilestoneRecord, ProjectMilestoneTaskGroupRecord, TaskRecord, TaskTreeRecord } from '@/lib/types';
import { taskTodoLabel } from '@/screens/tasks/studentTodoUtils';

export function Tasks({ detail }: { detail: ProjectDetail }) {
  const navigate = useNavigate();
  const api = useApi();
  const { session } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<'ALL' | 'OPEN' | 'DONE' | 'MINE'>('ALL');
  const [editingMilestone, setEditingMilestone] = React.useState<ProjectMilestoneRecord | null>(null);
  const milestoneTaskGroups = React.useMemo(
    () => normalizeMilestoneTaskGroups(detail),
    [detail],
  );
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      milestoneTaskGroups.map((group) => [group.milestone.id, group.milestone.status !== 'LOCKED']),
    ),
  );

  React.useEffect(() => {
    setExpandedMilestones((current) => {
      const next = { ...current };
      for (const group of milestoneTaskGroups) {
        if (next[group.milestone.id] === undefined) {
          next[group.milestone.id] = group.milestone.status !== 'LOCKED';
        }
      }
      return next;
    });
  }, [milestoneTaskGroups]);

  const updateTaskM = useMutation({
    mutationFn: ({ task, status }: { task: TaskRecord; status: TaskRecord['status'] }) =>
      api.saveTask(
        {
          projectId: task.projectId,
          milestoneId: task.milestoneId || undefined,
          parentTaskId: task.parentTaskId || undefined,
          sortOrder: task.sortOrder || undefined,
          title: task.title,
          description: task.description,
          status,
          assigneeId: task.assigneeId || undefined,
          dueDate: task.dueDate || undefined,
          priority: task.priority,
        },
        task.id,
      ),
    onSuccess: async (task) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tasks'] }),
        qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] }),
        qc.invalidateQueries({ queryKey: ['taskFiles', task.id] }),
      ]);
    },
  });

  const createMilestoneM = useMutation({
    mutationFn: (payload: { title: string; description: string; weight: number }) =>
      api.createProjectMilestone(detail.project.id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] });
    },
  });

  const updateMilestoneM = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { title: string; description: string; weight: number } }) =>
      api.updateProjectMilestone(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] });
      setEditingMilestone(null);
    },
  });

  const deleteMilestoneM = useMutation({
    mutationFn: (id: number) => api.deleteProjectMilestone(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] });
    },
  });

  const deleteTaskM = useMutation({
    mutationFn: (taskId: number) => api.deleteProjectTask(taskId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tasks'] }),
        qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] }),
        qc.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  const completeMilestoneM = useMutation({
    mutationFn: (id: number) => api.completeProjectMilestone(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projectDetail', detail.project.id] });
      await qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const activeMilestone = detail.milestones?.find((item) => item.status === 'ACTIVE') || detail.milestones?.[0] || null;
  const canDeleteMilestone = !!session?.profile && (
    session.profile.role === 'TEACHER' ||
    (detail.members?.some((member) => member.id === session.profile.id && member.owner) ?? false)
  );
  const filteredGroups = milestoneTaskGroups
    .map((group) => filterMilestoneGroup(group, filter, session?.profile.id))
    .filter((group) => group.rootTasks.length > 0 || group.milestone.status !== 'DONE');

  return (
    <div className="space-y-5">
      <Card className="border-muted/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1"><FolderTree size={12} /> 阶段任务树</Badge>
              {activeMilestone ? <Badge>{`当前阶段：${activeMilestone.title}`}</Badge> : null}
              <Badge variant="secondary">总进度 {detail.project.progress}%</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${detail.project.progress}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {detail.currentUserCanEdit ? (
              <MilestoneDialog
                triggerLabel="创建里程碑"
                saving={createMilestoneM.isPending}
                onSubmit={async (payload) => {
                  await createMilestoneM.mutateAsync(payload);
                }}
              />
            ) : (
              <Badge variant="secondary">当前项目只读</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
            {[
              { value: 'ALL', label: '全部', count: detail.tasks?.length ?? 0 },
              { value: 'OPEN', label: '未完成', count: detail.tasks?.filter((task) => task.status !== 'DONE').length ?? 0 },
              { value: 'DONE', label: '已完成', count: detail.tasks?.filter((task) => task.status === 'DONE').length ?? 0 },
              { value: 'MINE', label: '仅我负责', count: detail.tasks?.filter((task) => task.assigneeId === session?.profile.id).length ?? 0 },
            ].map((item) => (
              <Button key={item.value} variant={filter === item.value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(item.value as typeof filter)}>
                {item.label} · {item.count}
              </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">{detail.milestones?.length ?? 0} 个阶段 · {detail.tasks?.length ?? 0} 条任务</div>
      </div>

      <div className="space-y-4">
        {filteredGroups.map((group) => {
          const expanded = expandedMilestones[group.milestone.id] ?? group.milestone.status !== 'LOCKED';
          const totalTasks = countTreeTasks(group.rootTasks);
          const completedTasks = countDoneTasks(group.rootTasks);
          return (
            <Card key={group.milestone.id} className={cn('border-muted/70 shadow-sm', group.milestone.status === 'LOCKED' && 'opacity-70')}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() =>
                      setExpandedMilestones((current) => ({
                        ...current,
                        [group.milestone.id]: !expanded,
                      }))
                    }
                  >
                    <span className="mt-0.5 text-muted-foreground">{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{group.milestone.title}</CardTitle>
                        <Badge variant={group.milestone.status === 'ACTIVE' ? 'default' : group.milestone.status === 'DONE' ? 'secondary' : 'outline'}>
                          {milestoneStatusLabel[group.milestone.status] ?? group.milestone.status}
                        </Badge>
                        <Badge variant="outline">权重 {group.milestone.weight}</Badge>
                        <Badge variant="outline">{completedTasks}/{totalTasks} 完成</Badge>
                      </div>
                      {group.milestone.description ? <div className="mt-1 text-sm text-muted-foreground">{group.milestone.description}</div> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>阶段进度 {group.milestone.progressPercent}%</span>
                        {group.milestone.activatedAt ? <span>激活于 {group.milestone.activatedAt}</span> : null}
                        {group.milestone.completedAt ? <span>完成于 {group.milestone.completedAt}</span> : null}
                      </div>
                    </div>
                  </button>

                  {detail.currentUserCanEdit ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => navigate(`/app/projects/${detail.project.id}/tasks/new?milestoneId=${group.milestone.id}`)}
                      >
                        <Plus size={14} /> 新建
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={group.milestone.status !== 'ACTIVE' || !group.milestone.canMarkDone || completeMilestoneM.isPending}
                        onClick={async () => {
                          await completeMilestoneM.mutateAsync(group.milestone.id);
                        }}
                      >
                        <CheckCircle2 size={14} /> 完成
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingMilestone(group.milestone)}>
                        <Pencil size={14} /> 编辑
                      </Button>
                      {canDeleteMilestone ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-rose-600 hover:text-rose-700"
                          disabled={deleteMilestoneM.isPending}
                          onClick={async () => {
                            if (!window.confirm(`确认删除里程碑“${group.milestone.title}”吗？`)) return;
                            await deleteMilestoneM.mutateAsync(group.milestone.id);
                          }}
                        >
                          <Trash2 size={14} /> 删除
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              {expanded ? (
                <CardContent className="space-y-3">
                  {!group.rootTasks.length ? (
                    <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      当前筛选下，这个阶段还没有任务。
                    </div>
                  ) : (
                    group.rootTasks.map((node) => (
                      <TaskTreeNode
                        key={node.task.id}
                        node={node}
                        canEdit={detail.currentUserCanEdit}
                        onToggleDone={(task) => updateTaskM.mutate({ task, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                        onOpen={(task) => navigate(`/app/projects/${detail.project.id}/tasks/${task.id}`)}
                        onAddChild={(task) =>
                          navigate(`/app/projects/${detail.project.id}/tasks/new?milestoneId=${task.milestoneId}&parentTaskId=${task.id}`)
                        }
                        onDelete={async (task) => {
                          if (!window.confirm(`确认删除任务“${task.title}”吗？`)) return;
                          await deleteTaskM.mutateAsync(task.id);
                        }}
                        deletingTaskId={deleteTaskM.isPending ? deleteTaskM.variables : null}
                      />
                    ))
                  )}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      <MilestoneDialog
        open={!!editingMilestone}
        onOpenChange={(open) => {
          if (!open) setEditingMilestone(null);
        }}
        triggerLabel="编辑里程碑"
        initialValue={editingMilestone}
        saving={updateMilestoneM.isPending}
        onSubmit={async (payload) => {
          await updateMilestoneM.mutateAsync({ id: editingMilestone!.id, payload });
        }}
      />
    </div>
  );
}

function TaskTreeNode({
  node,
  canEdit,
  onToggleDone,
  onOpen,
  onAddChild,
  onDelete,
  deletingTaskId,
}: {
  node: TaskTreeRecord;
  canEdit: boolean;
  onToggleDone: (task: TaskRecord) => void;
  onOpen: (task: TaskRecord) => void;
  onAddChild: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void | Promise<void>;
  deletingTaskId?: number | null;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const { task, children } = node;

  return (
    <div className="space-y-2">
      <div className={cn('rounded-2xl border border-muted/70 bg-muted/10 px-4 py-3', task.blockedByMilestone && 'opacity-70')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {task.hasChildren ? (
              <button type="button" className="mt-0.5 text-muted-foreground" onClick={() => setExpanded((value) => !value)}>
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : null}
            <button
              className="mt-0.5 text-primary disabled:text-muted-foreground"
              onClick={() => onToggleDone(task)}
              disabled={!canEdit || !task.canMarkDone}
              title={task.status === 'DONE' ? '重开任务' : '标记完成'}
            >
              {task.status === 'DONE' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className={cn('truncate font-medium', task.status === 'DONE' ? 'line-through text-muted-foreground' : '')}>{task.title}</div>
                <Badge variant={task.status === 'DONE' ? 'secondary' : 'outline'}>{taskTodoLabel[task.status]}</Badge>
                <Badge variant="outline" className="gap-1"><Flag size={11} />{task.priority}</Badge>
                {task.hasChildren ? <Badge variant="outline">{task.childCount} 个子任务</Badge> : null}
                {task.blockedByMilestone ? <Badge variant="secondary" className="gap-1"><Lock size={10} /> 阶段锁定</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>负责人：{task.assigneeName || '未指派'}</span>
                <span>截止：{task.dueDate || '未设置'}</span>
                <span>创建于：{task.createdAt}</span>
                {task.completedAt ? <span>完成于：{task.completedAt}</span> : null}
                {task.hasChildren ? <span>聚合进度：{task.derivedProgressPercent}%</span> : null}
              </div>
              {task.description ? <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{task.description}</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpen(task)}>打开详情</Button>
            {canEdit && task.canCreateChild ? <Button variant="outline" size="sm" onClick={() => onAddChild(task)}>新建</Button> : null}
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 hover:text-rose-700"
                disabled={task.hasChildren || deletingTaskId === task.id}
                onClick={() => onDelete(task)}
              >
                删除
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {task.hasChildren && expanded ? (
        <div className="ml-5 space-y-2 border-l border-dashed border-muted pl-4">
          {children.map((child) => (
            <TaskTreeNode
              key={child.task.id}
              node={child}
              canEdit={canEdit}
              onToggleDone={onToggleDone}
              onOpen={onOpen}
              onAddChild={onAddChild}
              onDelete={onDelete}
              deletingTaskId={deletingTaskId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type FilteredMilestoneGroup = ProjectMilestoneTaskGroupRecord;

function filterMilestoneGroup(group: ProjectMilestoneTaskGroupRecord, filter: 'ALL' | 'OPEN' | 'DONE' | 'MINE', currentUserId?: number) {
  return {
    ...group,
    rootTasks: group.rootTasks
      .map((node) => filterTaskTree(node, filter, currentUserId))
      .filter((node): node is TaskTreeRecord => !!node),
  };
}

function filterTaskTree(node: TaskTreeRecord, filter: 'ALL' | 'OPEN' | 'DONE' | 'MINE', currentUserId?: number): TaskTreeRecord | null {
  const filteredChildren = node.children
    .map((child) => filterTaskTree(child, filter, currentUserId))
    .filter((child): child is TaskTreeRecord => !!child);
  const matched = matchesFilter(node.task, filter, currentUserId);
  if (!matched && !filteredChildren.length) return null;
  return { ...node, children: filteredChildren };
}

function matchesFilter(task: TaskRecord, filter: 'ALL' | 'OPEN' | 'DONE' | 'MINE', currentUserId?: number) {
  if (filter === 'OPEN') return task.status !== 'DONE';
  if (filter === 'DONE') return task.status === 'DONE';
  if (filter === 'MINE') return !!currentUserId && task.assigneeId === currentUserId;
  return true;
}

function countTreeTasks(nodes: TaskTreeRecord[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTreeTasks(node.children), 0);
}

function countDoneTasks(nodes: TaskTreeRecord[]): number {
  return nodes.reduce((sum, node) => sum + (node.task.status === 'DONE' ? 1 : 0) + countDoneTasks(node.children), 0);
}

const milestoneStatusLabel: Record<string, string> = {
  LOCKED: '未激活',
  ACTIVE: '进行中',
  DONE: '已完成',
};

function normalizeMilestoneTaskGroups(detail: ProjectDetail): ProjectMilestoneTaskGroupRecord[] {
  if (Array.isArray(detail.milestoneTaskGroups)) {
    return detail.milestoneTaskGroups;
  }

  const tasks = Array.isArray(detail.tasks) ? detail.tasks : [];
  const milestones = Array.isArray(detail.milestones) ? detail.milestones : [];
  const byParent = new Map<number | null, TaskRecord[]>();

  for (const task of tasks) {
    const key = task.parentTaskId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(task);
    byParent.set(key, list);
  }

  const buildNode = (task: TaskRecord): TaskTreeRecord => ({
    task,
    children: (byParent.get(task.id) ?? []).map(buildNode),
  });

  return milestones.map((milestone) => ({
    milestone,
    rootTasks: tasks
      .filter((task) => task.milestoneId === milestone.id && (task.parentTaskId == null || !tasks.some((item) => item.id === task.parentTaskId)))
      .map(buildNode),
  }));
}

function MilestoneDialog({
  open,
  onOpenChange,
  triggerLabel,
  initialValue,
  saving,
  onSubmit,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel: string;
  initialValue?: Partial<ProjectMilestoneRecord> | null;
  saving?: boolean;
  onSubmit: (payload: { title: string; description: string; weight: number }) => Promise<void>;
}) {
  const [innerOpen, setInnerOpen] = React.useState(false);
  const controlled = typeof open === 'boolean';
  const actualOpen = controlled ? open : innerOpen;
  const setOpen = controlled ? onOpenChange || (() => {}) : setInnerOpen;
  const [title, setTitle] = React.useState(initialValue?.title || '');
  const [description, setDescription] = React.useState(initialValue?.description || '');
  const [weight, setWeight] = React.useState(String(initialValue?.weight || 1));

  React.useEffect(() => {
    setTitle(initialValue?.title || '');
    setDescription(initialValue?.description || '');
    setWeight(String(initialValue?.weight || 1));
  }, [initialValue?.title, initialValue?.description, initialValue?.weight, actualOpen]);

  return (
    <Dialog open={actualOpen} onOpenChange={setOpen}>
      {controlled ? null : <DialogTrigger render={<Button variant="outline">{triggerLabel}</Button>} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue?.id ? '编辑里程碑' : triggerLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>阶段名称</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：开发实现" />
          </div>
          <div className="space-y-2">
            <Label>阶段说明</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="写清楚这个阶段关注什么成果" className="min-h-[120px]" />
          </div>
          <div className="space-y-2">
            <Label>权重</Label>
            <Input type="number" min={1} value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button
            disabled={!title.trim() || saving}
            onClick={async () => {
              await onSubmit({
                title: title.trim(),
                description: description.trim(),
                weight: Math.max(1, Number(weight) || 1),
              });
              setOpen(false);
            }}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
