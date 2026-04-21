import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckSquare, ClipboardCheck, FolderKanban, TrendingUp, Users } from 'lucide-react';
import { PageHero } from '@/screens/shell/PageHero';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import type { AssignmentRecord, ClassRecord, TaskRecord } from '@/lib/types';
import { assignmentTodoLabel, assignmentTodoRank, compareDateAsc, taskTodoLabel, taskTodoRank } from '@/screens/tasks/studentTodoUtils';

export function DashboardPage() {
  const api = useApi();
  const { session } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    setTitle(['仪表盘']);
  }, []);

  if (!session) return null;
  if (session.profile.role === 'TEACHER') return <Navigate to="/app/teacher/dashboard" replace />;

  const dashboardQ = useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard() });
  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });
  const classesQ = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const assignmentQueries = useQueries({
    queries: (classesQ.data || []).map((course) => ({
      queryKey: ['classAssignments', course.id],
      queryFn: () => api.classAssignments(course.id),
      enabled: !!classesQ.data,
    })),
  });

  const assignments = buildAssignments(classesQ.data || [], assignmentQueries.map((query) => query.data || []))
    .sort((left, right) => {
      const rankDiff = assignmentTodoRank(left.currentUserSubmissionStatus) - assignmentTodoRank(right.currentUserSubmissionStatus);
      if (rankDiff !== 0) return rankDiff;
      return compareDateAsc(left.dueDate, right.dueDate);
    });
  const pendingAssignments = assignments.filter((assignment) => (assignment.currentUserSubmissionStatus ?? 'NOT_SUBMITTED') !== 'GRADED');
  const todayTasks = (tasksQ.data || [])
    .filter((task) => task.status !== 'DONE')
    .sort((left, right) => taskTodoRank(left, session.profile.id) - taskTodoRank(right, session.profile.id))
    .slice(0, 5);

  return (
    <div>
      <PageHero
        title="仪表盘"
        subtitle="今天先做什么，一进来就看清楚。先作业，后任务，再回到项目推进协作。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-2" onClick={() => navigate('/app/tasks')}>
              进入待办 <ArrowRight size={14} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/app/classes')}>
              进入我的课程
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/app/teams')}>
              进入我的团队
            </Button>
          </div>
        }
        right={
          <div className="hidden items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm md:flex">
            <TrendingUp size={16} className="text-primary" />
            <div className="text-xs text-muted-foreground">今天优先把要交的作业和我负责的任务处理掉。</div>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard title="待提交作业" value={pendingAssignments.length} icon={<ClipboardCheck size={18} />} tone="primary" loading={classesQ.isLoading || assignmentQueries.some((query) => query.isLoading)} onClick={() => navigate('/app/tasks?view=assignments')} />
            <StatCard title="今日任务" value={todayTasks.length} icon={<CheckSquare size={18} />} tone="neutral" loading={tasksQ.isLoading} onClick={() => navigate('/app/tasks?view=tasks&mine=1')} />
            <StatCard title="最近项目" value={dashboardQ.data?.projects.length} icon={<FolderKanban size={18} />} tone="neutral" loading={dashboardQ.isLoading} onClick={() => navigate('/app/projects')} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">待提交作业</h3>
                <Button variant="ghost" className="text-primary hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/app/tasks?view=assignments')}>
                  查看全部
                </Button>
              </div>
              <div className="space-y-3">
                {pendingAssignments.slice(0, 5).map((assignment) => {
                  const status = assignment.currentUserSubmissionStatus ?? 'NOT_SUBMITTED';
                  return (
                    <button
                      key={assignment.id}
                      className="w-full rounded-3xl border border-muted/60 bg-card p-5 text-left transition hover:shadow-sm"
                      onClick={() => navigate(`/app/classes/${assignment.classId}/assignments/${assignment.id}`)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold">{assignment.title}</div>
                            <Badge variant={status === 'RETURNED' ? 'destructive' : 'outline'}>{assignmentTodoLabel[status]}</Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>{assignment.className}</span>
                            <span>截止：{assignment.dueDate || '未设置'}</span>
                            <span>最近提交：{assignment.currentUserSubmittedAt || '暂无'}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm text-primary">
                          进入作业
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!pendingAssignments.length && !(classesQ.isLoading || assignmentQueries.some((query) => query.isLoading)) ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">当前没有需要优先处理的作业。</CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">今日任务</CardTitle>
                  <CardDescription>我负责且未完成的任务会优先展示。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayTasks.map((task) => (
                    <button
                      key={task.id}
                      className="w-full rounded-xl border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/app/projects/${task.projectId}/tasks/${task.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold">{task.title}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{task.projectName}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{taskTodoLabel[task.status]}</Badge>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground">截止：{task.dueDate || '未设置'} · 负责人：{task.assigneeName || '未指派'}</div>
                    </button>
                  ))}
                  {!todayTasks.length && !tasksQ.isLoading ? <div className="text-sm text-muted-foreground">今天没有紧急任务，去看看课程或团队最新进展吧。</div> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">最近项目</CardTitle>
                  <CardDescription>从这里快速回到当前最常用的项目工作区。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(dashboardQ.data?.projects || []).slice(0, 4).map((project) => (
                    <button
                      key={project.id}
                      className="w-full rounded-xl border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/app/projects/${project.id}/overview`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold">{project.name}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{project.courseName || '未关联课程'} · {project.teamName || '未关联团队'}</div>
                        </div>
                        <span className="text-xs font-semibold text-primary">{project.progress}%</span>
                      </div>
                    </button>
                  ))}
                  {!dashboardQ.isLoading && !(dashboardQ.data?.projects || []).length ? <div className="text-sm text-muted-foreground">还没有最近项目，先从课程团队进入项目工作区吧。</div> : null}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/app/projects')}>
                    查看我的项目
                    <ArrowRight size={14} />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  loading,
  onClick,
}: {
  title: string;
  value?: number;
  icon: React.ReactNode;
  tone: 'primary' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        tone === 'primary' ? 'border-none bg-primary text-primary-foreground shadow-xl shadow-primary/20' : 'shadow-sm',
        onClick && 'cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md',
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-sm font-medium', tone === 'primary' ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{title}</CardTitle>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tone === 'primary' ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground')}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-4xl font-bold', tone === 'primary' ? 'text-white' : 'text-foreground')}>{loading ? '...' : value ?? 0}</div>
      </CardContent>
    </Card>
  );
}

function buildAssignments(classes: ClassRecord[], groups: AssignmentRecord[][]) {
  return classes.flatMap((course, index) =>
    (groups[index] || []).map((assignment) => ({
      ...assignment,
      classId: assignment.classId ?? course.id,
      className: assignment.className ?? course.name,
    })),
  );
}
