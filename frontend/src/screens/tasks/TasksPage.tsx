import React from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  Filter,
  FolderKanban,
  Search,
  UserCircle2,
  X,
} from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { AssignmentRecord, ClassRecord, TaskRecord } from '@/lib/types';
import {
  assignmentTodoLabel,
  assignmentTodoRank,
  compareDateAsc,
  isActionableAssignment,
  isDueThisWeek,
  nextTaskStatus,
  StudentTodoView,
  taskTodoLabel,
  taskTodoRank,
} from './studentTodoUtils';

export function TasksPage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();

  React.useEffect(() => setTitle(['待办']), []);

  const isStudent = session?.profile.role === 'STUDENT';
  const search = params.get('q') || '';
  const view = (params.get('view') || 'all') as StudentTodoView;
  const onlyWeek = params.get('range') === 'week';
  const onlyMine = params.get('mine') === '1';

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const classesQ = useQuery({ queryKey: ['classes'], queryFn: () => api.classes(), enabled: isStudent });
  const assignmentQueries = useQueries({
    queries: (classesQ.data || []).map((course) => ({
      queryKey: ['classAssignments', course.id],
      queryFn: () => api.classAssignments(course.id),
      enabled: isStudent,
    })),
  });

  const quickUpdateM = useMutation({
    mutationFn: (task: TaskRecord) =>
      api.saveTask(
        {
          projectId: task.projectId,
          milestoneId: task.milestoneId || undefined,
          parentTaskId: task.parentTaskId || undefined,
          sortOrder: task.sortOrder || undefined,
          title: task.title,
          description: task.description,
          status: nextTaskStatus(task.status),
          assigneeId: task.assigneeId || undefined,
          dueDate: task.dueDate || undefined,
          priority: task.priority,
        },
        task.id,
      ),
    onSuccess: async (_task, original) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['tasks'] }),
        qc.invalidateQueries({ queryKey: ['projectDetail', original.projectId] }),
      ]);
    },
  });

  const setParam = React.useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(params);
      if (!value) next.delete(key);
      else next.set(key, value);
      setParams(next);
    },
    [params, setParams],
  );

  if (tasksQ.isLoading || projectsQ.isLoading || (isStudent && classesQ.isLoading)) {
    return <PageLoading label="正在整理待办..." />;
  }
  if (tasksQ.isError || projectsQ.isError || (isStudent && classesQ.isError)) {
    return <PageError title="待办加载失败" onRetry={() => { void tasksQ.refetch(); void projectsQ.refetch(); void classesQ.refetch(); }} />;
  }
  if (isStudent && assignmentQueries.some((query) => query.isLoading)) {
    return <PageLoading label="正在整理课程作业..." />;
  }
  if (isStudent && assignmentQueries.some((query) => query.isError)) {
    return <PageError title="课程作业加载失败" onRetry={() => assignmentQueries.forEach((query) => void query.refetch())} />;
  }

  if (!isStudent) {
    return <LegacyTaskList tasks={tasksQ.data || []} search={search} setParam={setParam} navigate={navigate} />;
  }

  const classes = classesQ.data || [];
  const assignments = buildAssignmentItems(classes, assignmentQueries.map((query) => query.data || []));
  const tasks = tasksQ.data || [];
  const projects = projectsQ.data || [];
  const loweredSearch = search.trim().toLowerCase();

  const filteredAssignments = assignments
    .filter((assignment) => {
      if (onlyWeek && !isDueThisWeek(assignment.dueDate)) return false;
      if (loweredSearch) {
        const haystack = `${assignment.title} ${assignment.className || ''} ${assignment.summary || ''}`.toLowerCase();
        if (!haystack.includes(loweredSearch)) return false;
      }
      return true;
    })
    .sort((left, right) => {
      const rankDiff = assignmentTodoRank(left.currentUserSubmissionStatus) - assignmentTodoRank(right.currentUserSubmissionStatus);
      if (rankDiff !== 0) return rankDiff;
      return compareDateAsc(left.dueDate, right.dueDate);
    });

  const filteredTasks = tasks
    .filter((task) => {
      if (onlyWeek && !isDueThisWeek(task.dueDate)) return false;
      if (onlyMine && task.assigneeId !== session?.profile.id) return false;
      if (loweredSearch) {
        const haystack = `${task.title} ${task.projectName || ''} ${task.description || ''}`.toLowerCase();
        if (!haystack.includes(loweredSearch)) return false;
      }
      return true;
    })
    .sort((left, right) => taskTodoRank(left, session?.profile.id) - taskTodoRank(right, session?.profile.id));

  const assignmentGroups = groupAssignments(filteredAssignments);
  const taskGroups = groupTasks(filteredTasks);
  const actionableAssignments = filteredAssignments.filter(isActionableAssignment);
  const assignedTasks = filteredTasks.filter((task) => task.assigneeId === session?.profile.id && task.status !== 'DONE');
  const projectCount = new Set(filteredTasks.map((task) => task.projectId)).size;

  return (
    <div>
      <PageHero
        title="待办"
        subtitle="先处理课程作业，再推进项目任务。作业按课程组织，任务按项目组织。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-2" onClick={() => navigate('/app/classes')}>
              进入我的课程
              <ArrowRight size={14} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/app/teams')}>
              进入我的团队
            </Button>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard title="待处理作业" value={actionableAssignments.length} hint="待提交、草稿与已退回会优先显示" icon={ClipboardCheck} />
            <SummaryCard title="我负责的任务" value={assignedTasks.length} hint="按项目聚合展示，优先看未完成事项" icon={UserCircle2} />
            <SummaryCard title="涉及项目" value={projectCount} hint="从待办可直接回到所属项目继续推进" icon={FolderKanban} />
          </div>

          <Card className="border-muted/70">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'assignments', label: '仅作业' },
                  { value: 'tasks', label: '仅任务' },
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={view === item.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParam('view', item.value === 'all' ? null : item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={onlyWeek ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setParam('range', onlyWeek ? null : 'week')}>
                  <Clock3 size={14} />
                  只看本周
                </Button>
                <Button variant={onlyMine ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setParam('mine', onlyMine ? null : '1')}>
                  <Filter size={14} />
                  只看我负责
                </Button>
                <div className="relative w-full min-w-[220px] lg:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setParam('q', event.target.value || null)}
                    placeholder="搜索作业、项目或任务..."
                    className="h-9 pl-9 pr-9"
                  />
                  {search ? (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setParam('q', null)}
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {(view === 'all' || view === 'assignments') && (
            <SectionCard
              title="作业"
              subtitle="按课程分组，优先展示待提交与已退回的作业。"
              count={filteredAssignments.length}
            >
              {assignmentGroups.length ? (
                <div className="space-y-5">
                  {assignmentGroups.map((group) => (
                    <div key={`${group.classId}-${group.className}`} className="rounded-3xl border border-muted/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold">{group.className}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{group.items.length} 份作业</div>
                        </div>
                        {group.classId ? (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/app/classes/${group.classId}/assignments`)}>
                            进入课程作业
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {group.items.map((assignment) => {
                          const status = assignment.currentUserSubmissionStatus ?? 'NOT_SUBMITTED';
                          return (
                            <button
                              key={assignment.id}
                              className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-muted/10 px-4 py-3 text-left transition hover:bg-muted/20"
                              onClick={() => navigate(`/app/classes/${assignment.classId}/assignments/${assignment.id}`)}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate font-medium">{assignment.title}</div>
                                  <Badge variant={status === 'RETURNED' ? 'destructive' : status === 'GRADED' ? 'secondary' : 'outline'}>
                                    {assignmentTodoLabel[status]}
                                  </Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>截止：{assignment.dueDate || '未设置'}</span>
                                  <span>最近提交：{assignment.currentUserSubmittedAt || '暂无'}</span>
                                  <span>得分：{assignment.currentUserScore ?? '未评分'}</span>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-sm text-primary">
                                进入作业
                                <ArrowRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PageEmpty title="当前筛选下没有作业" message="可以切换筛选条件，或者进入课程页查看全部作业。" />
              )}
            </SectionCard>
          )}

          {(view === 'all' || view === 'tasks') && (
            <SectionCard
              title="任务"
              subtitle="按项目分组，保持轻量 to-do 风格，直接推进日常协作。"
              count={filteredTasks.length}
            >
              {taskGroups.length ? (
                <div className="space-y-5">
                  {taskGroups.map((group) => {
                    const project = projects.find((item) => item.id === group.projectId);
                    return (
                      <div key={group.projectId} className="rounded-3xl border border-muted/70 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">{group.projectName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {project?.teamName || '未关联团队'} · {group.items.length} 条任务
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/app/projects/${group.projectId}/tasks`)}>
                            进入项目
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((task) => (
                            <TaskTodoRow
                              key={task.id}
                              task={task}
                              busy={quickUpdateM.isPending && quickUpdateM.variables?.id === task.id}
                              currentUserId={session?.profile.id}
                              onToggle={() => quickUpdateM.mutate(task)}
                              onOpen={() => navigate(`/app/projects/${task.projectId}/tasks/${task.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <PageEmpty title="当前筛选下没有任务" message="可以切换筛选条件，或进入团队/项目继续创建与推进任务。" />
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function LegacyTaskList({
  tasks,
  search,
  setParam,
  navigate,
}: {
  tasks: TaskRecord[];
  search: string;
  setParam: (key: string, value?: string | null) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const filtered = tasks.filter((task) => {
    if (!search.trim()) return true;
    const keyword = search.trim().toLowerCase();
    return `${task.title} ${task.projectName || ''}`.toLowerCase().includes(keyword);
  });

  return (
    <div>
      <PageHero
        title="任务"
        subtitle="教师 / 管理员仍可在这里查看全量任务列表。"
        actions={
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setParam('q', event.target.value || null)} placeholder="搜索任务..." className="h-9 pl-9 pr-9" />
            {search ? (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setParam('q', null)}>
                <X size={14} />
              </button>
            ) : null}
          </div>
        }
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1200px] space-y-3">
          {filtered.map((task) => (
            <TaskTodoRow key={task.id} task={task} onOpen={() => navigate(`/app/projects/${task.projectId}/tasks/${task.id}`)} />
          ))}
          {!filtered.length ? <PageEmpty title="没有匹配的任务" message="请尝试其他关键词。" /> : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Card className="border-muted/70">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={18} />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <Badge variant="outline">{count} 项</Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function TaskTodoRow({
  task,
  currentUserId,
  busy,
  onToggle,
  onOpen,
}: {
  task: TaskRecord;
  currentUserId?: number;
  busy?: boolean;
  onToggle?: () => void;
  onOpen: () => void;
}) {
  const isDone = task.status === 'DONE';
  const mine = currentUserId && task.assigneeId === currentUserId;
  return (
    <div
      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-muted/10 px-4 py-3 text-left transition hover:bg-muted/20"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          className="mt-0.5 text-primary disabled:opacity-50"
          onClick={(event) => {
            event.stopPropagation();
            onToggle?.();
          }}
          disabled={!onToggle || busy}
        >
          {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`truncate font-medium ${isDone ? 'text-muted-foreground line-through' : ''}`}>{task.title}</div>
            <Badge variant={task.status === 'DONE' ? 'secondary' : mine ? 'default' : 'outline'}>{taskTodoLabel[task.status]}</Badge>
            {mine ? <Badge variant="outline">我负责</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>负责人：{task.assigneeName || '未指派'}</span>
            <span>截止：{task.dueDate || '未设置'}</span>
            <span>{task.projectName}</span>
          </div>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-sm text-primary">
        查看
        <ArrowRight size={14} />
      </span>
    </div>
  );
}

function buildAssignmentItems(classes: ClassRecord[], groups: AssignmentRecord[][]) {
  return classes.flatMap((course, index) =>
    (groups[index] || []).map((assignment) => ({
      ...assignment,
      classId: assignment.classId ?? course.id,
      className: assignment.className ?? course.name,
    })),
  );
}

function groupAssignments(assignments: AssignmentRecord[]) {
  const grouped = new Map<string, { classId?: number | null; className: string; items: AssignmentRecord[] }>();
  assignments.forEach((assignment) => {
    const key = `${assignment.classId ?? 'none'}-${assignment.className || '未关联课程'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        classId: assignment.classId,
        className: assignment.className || '未关联课程',
        items: [],
      });
    }
    grouped.get(key)!.items.push(assignment);
  });
  return Array.from(grouped.values());
}

function groupTasks(tasks: TaskRecord[]) {
  const grouped = new Map<number, { projectId: number; projectName: string; items: TaskRecord[] }>();
  tasks.forEach((task) => {
    if (!grouped.has(task.projectId)) {
      grouped.set(task.projectId, { projectId: task.projectId, projectName: task.projectName, items: [] });
    }
    grouped.get(task.projectId)!.items.push(task);
  });
  return Array.from(grouped.values());
}
