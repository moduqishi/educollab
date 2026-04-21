import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FolderKanban,
  FolderTree,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PageError } from '@/screens/common/States';
import { taskTodoLabel } from '@/screens/tasks/studentTodoUtils';
import type { ProjectDetail, ProjectMilestoneTaskGroupRecord, TaskRecord, TaskTreeRecord } from '@/lib/types';
import { CreateProjectDialog } from './TeamDialogs';
import { useTeamDetail } from './TeamDetailLayout';
import type { TeamProjectFormPayload } from './types';

type Filter = 'ALL' | 'OPEN' | 'DONE' | 'MINE';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'OPEN', label: '未完成' },
  { value: 'DONE', label: '已完成' },
  { value: 'MINE', label: '仅我负责' },
];

export function TeamTasksTab() {
  const { detail, currentUserId, refresh } = useTeamDetail();
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<Filter>('ALL');
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<number, boolean>>({});

  const projectId = detail.project?.projectId;
  const projectQ = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: () => api.projectDetail(projectId as number),
    enabled: !!projectId,
  });

  const createProjectM = useMutation({
    mutationFn: (payload: TeamProjectFormPayload) => api.createTeamProject(detail.id, payload),
    onSuccess: async (project) => {
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]);
      navigate(`/app/projects/${project.id}/overview`);
    },
  });

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
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['projectDetail', projectId] }),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['classProjects'] }),
        qc.invalidateQueries({ queryKey: ['teamDetail', detail.id] }),
      ]);
    },
  });

  const completeMilestoneM = useMutation({
    mutationFn: (id: number) => api.completeProjectMilestone(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['projectDetail', projectId] }),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['teamDetail', detail.id] }),
      ]);
    },
  });

  const deleteTaskM = useMutation({
    mutationFn: (taskId: number) => api.deleteProjectTask(taskId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['projectDetail', projectId] }),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['teamDetail', detail.id] }),
      ]);
    },
  });

  if (!projectId || !detail.project) {
    return (
      <Card className="border-muted/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">项目任务树</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FolderKanban size={18} />
            </div>
            <div className="mt-4 text-lg font-semibold">当前团队还没有项目</div>
            <div className="mt-2 text-sm text-muted-foreground">先创建项目，系统会自动生成默认阶段里程碑，后续任务会挂在阶段树下面。</div>
            {detail.currentUserLeader && !detail.teacherView ? (
              <div className="mt-5">
                <CreateProjectDialog onSubmit={(payload) => createProjectM.mutateAsync(payload)} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projectQ.isLoading) {
    return <div className="py-8 text-sm text-muted-foreground">正在加载项目任务树...</div>;
  }

  if (projectQ.isError || !projectQ.data) {
    return <PageError title="项目任务加载失败" message="暂时无法读取团队关联项目的任务信息。" onRetry={() => projectQ.refetch()} />;
  }

  const projectDetail = projectQ.data;
  const canEdit = projectDetail.currentUserCanEdit;
  const activeMilestone = projectDetail.milestones.find((item) => item.status === 'ACTIVE') || projectDetail.milestones[0] || null;
  const milestoneTaskGroups = normalizeMilestoneTaskGroups(projectDetail);
  const filteredGroups = milestoneTaskGroups
    .map((group) => filterMilestoneGroup(group, filter, currentUserId))
    .filter((group) => group.rootTasks.length > 0 || group.milestone.status !== 'DONE');

  return (
    <div className="space-y-4">
      <Card className="border-muted/70 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1"><FolderTree size={12} /> 团队项目任务树</Badge>
                {activeMilestone ? <Badge>{`当前阶段：${activeMilestone.title}`}</Badge> : null}
                <Badge variant="secondary">进度 {projectDetail.project.progress}%</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-lg font-semibold">{projectDetail.project.name}</div>
                <Badge variant="outline">{projectDetail.project.type === 'CODE' ? '代码项目' : '非代码项目'}</Badge>
                <Badge variant={projectDetail.project.status === 'COMPLETED' ? 'secondary' : 'outline'}>
                  {projectDetail.project.status === 'COMPLETED' ? '已完成' : projectDetail.project.status === 'ARCHIVED' ? '已归档' : '进行中'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{projectDetail.milestones.length} 个阶段 · {projectDetail.tasks.length} 条任务</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${projectDetail.project.progress}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => navigate(`/app/projects/${projectDetail.project.id}/overview`)}>
                进入项目
              </Button>
              {canEdit ? null : (
                <Badge variant="secondary" className="rounded-full">只读查看</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/70 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Button key={item.value} variant={filter === item.value ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setFilter(item.value)}>
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">当前显示 {filteredGroups.reduce((sum, group) => sum + countTreeTasks(group.rootTasks), 0)} 条任务</div>
          </div>

          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const expanded = expandedMilestones[group.milestone.id] ?? group.milestone.status !== 'LOCKED';
              return (
                <div key={group.milestone.id} className={cn('rounded-2xl border border-muted/70 bg-background p-4', group.milestone.status === 'LOCKED' && 'opacity-70')}>
                  <div className="flex items-start justify-between gap-3 border-b border-dashed pb-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                      onClick={() =>
                        setExpandedMilestones((current) => ({
                          ...current,
                          [group.milestone.id]: !expanded,
                        }))
                      }
                    >
                      <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{group.milestone.title}</div>
                        <Badge variant={group.milestone.status === 'ACTIVE' ? 'default' : group.milestone.status === 'DONE' ? 'secondary' : 'outline'}>
                          {milestoneStatusLabel[group.milestone.status] ?? group.milestone.status}
                        </Badge>
                        <Badge variant="outline">权重 {group.milestone.weight}</Badge>
                        <Badge variant="outline">{group.milestone.completedTaskCount}/{group.milestone.taskCount}</Badge>
                      </div>
                      {group.milestone.description ? <div className="mt-1 text-sm text-muted-foreground">{group.milestone.description}</div> : null}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-sm">{group.milestone.progressPercent}%</span>
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate(`/app/projects/${projectDetail.project.id}/tasks/new?milestoneId=${group.milestone.id}`)}>
                          <Plus size={14} className="mr-1" /> 新建
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={group.milestone.status !== 'ACTIVE' || !group.milestone.canMarkDone || completeMilestoneM.isPending}
                          onClick={() => completeMilestoneM.mutate(group.milestone.id)}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> 完成
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className="mt-3 space-y-2">
                      {!group.rootTasks.length ? (
                        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">当前筛选下，这个阶段没有任务。</div>
                      ) : (
                        group.rootTasks.map((node) => (
                          <TaskNode
                            key={node.task.id}
                            node={node}
                            canEdit={canEdit}
                            onAdvance={(task) => updateTaskM.mutate({ task, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                            onOpen={(task) => navigate(`/app/projects/${task.projectId}/tasks/${task.id}`)}
                            onAddChild={(task) => navigate(`/app/projects/${task.projectId}/tasks/new?milestoneId=${task.milestoneId}&parentTaskId=${task.id}`)}
                            onDelete={async (task) => {
                              if (!window.confirm(`确认删除任务“${task.title}”吗？`)) return;
                              await deleteTaskM.mutateAsync(task.id);
                            }}
                            deletingTaskId={deleteTaskM.isPending ? deleteTaskM.variables : null}
                          />
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskNode({
  node,
  canEdit,
  onAdvance,
  onOpen,
  onAddChild,
  onDelete,
  deletingTaskId,
}: {
  node: TaskTreeRecord;
  canEdit: boolean;
  onAdvance: (task: TaskRecord) => void;
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
            <button className="mt-0.5 text-primary disabled:text-muted-foreground" onClick={() => onAdvance(task)} disabled={!canEdit || !task.canMarkDone}>
              {task.status === 'DONE' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className={cn('truncate font-medium', task.status === 'DONE' ? 'line-through text-muted-foreground' : '')}>{task.title}</div>
                <Badge variant={task.status === 'DONE' ? 'secondary' : 'outline'}>{taskTodoLabel[task.status]}</Badge>
                {task.hasChildren ? <Badge variant="outline">{task.childCount} 个子任务</Badge> : null}
                {task.blockedByMilestone ? <Badge variant="secondary" className="gap-1"><Lock size={10} /> 阶段锁定</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>负责人：{task.assigneeName || '未指派'}</span>
                <span>截止：{task.dueDate || '未设置'}</span>
                {task.hasChildren ? <span>聚合进度：{task.derivedProgressPercent}%</span> : null}
                {task.completedAt ? <span>完成于：{task.completedAt}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => onOpen(task)}>打开详情</Button>
            {canEdit && task.canCreateChild ? <Button variant="outline" size="sm" className="rounded-full" onClick={() => onAddChild(task)}>新建</Button> : null}
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-rose-600 hover:text-rose-700"
                disabled={task.hasChildren || deletingTaskId === task.id}
                onClick={() => onDelete(task)}
              >
                <Trash2 size={14} className="mr-1" /> 删除
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {task.hasChildren && expanded ? (
        <div className="ml-5 space-y-2 border-l border-dashed border-muted pl-4">
          {children.map((child) => (
            <TaskNode
              key={child.task.id}
              node={child}
              canEdit={canEdit}
              onAdvance={onAdvance}
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

function filterMilestoneGroup(group: ProjectMilestoneTaskGroupRecord, filter: Filter, currentUserId?: number) {
  return {
    ...group,
    rootTasks: group.rootTasks
      .map((node) => filterTaskTree(node, filter, currentUserId))
      .filter((node): node is TaskTreeRecord => !!node),
  };
}

function filterTaskTree(node: TaskTreeRecord, filter: Filter, currentUserId?: number): TaskTreeRecord | null {
  const filteredChildren = node.children
    .map((child) => filterTaskTree(child, filter, currentUserId))
    .filter((child): child is TaskTreeRecord => !!child);
  const matched =
    filter === 'ALL'
      ? true
      : filter === 'OPEN'
        ? node.task.status !== 'DONE'
        : filter === 'DONE'
          ? node.task.status === 'DONE'
          : !!currentUserId && node.task.assigneeId === currentUserId;
  if (!matched && !filteredChildren.length) return null;
  return { ...node, children: filteredChildren };
}

function countTreeTasks(nodes: TaskTreeRecord[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTreeTasks(node.children), 0);
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
