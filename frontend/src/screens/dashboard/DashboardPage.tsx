import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bell, CheckSquare, FileText, FolderKanban, TrendingUp } from 'lucide-react';
import { PageHero } from '@/screens/shell/PageHero';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';

export function DashboardPage() {
  const api = useApi();
  const { session } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    setTitle(['仪表盘']);
  }, []);

  if (!session) return null;
  if (session.profile.role === 'TEACHER') return <Navigate to="/app/teacher/dashboard" replace />;

  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard(),
  });

  const summary = q.data;

  const priorityLabel: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
  };

  return (
    <div>
      <PageHero
        title="仪表盘"
        subtitle="查看今天的进展、待办与最新更新。"
        actions={
          <>
            <Button className="gap-2" onClick={() => navigate('/app/classes')}>
              前往课程创建项目 <ArrowRight size={14} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/app/notifications')}>
              查看通知 <Bell size={14} />
            </Button>
          </>
        }
        right={
          <div className="hidden items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm md:flex">
            <TrendingUp size={16} className="text-primary" />
            <div className="text-xs text-muted-foreground">让协作变得清晰、可追踪。</div>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard title="活跃项目" value={summary?.activeProjects} icon={<FolderKanban size={18} />} tone="primary" loading={q.isLoading} onClick={() => navigate('/app/projects?status=ACTIVE')} />
            <StatCard title="待处理任务" value={summary?.pendingTasks} icon={<CheckSquare size={18} />} tone="neutral" loading={q.isLoading} onClick={() => navigate('/app/tasks')} />
            <StatCard title="未读通知" value={summary?.unreadNotifications} icon={<Bell size={18} />} tone="neutral" loading={q.isLoading} onClick={() => navigate('/app/notifications')} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">最近项目</h3>
                <Button variant="ghost" className="text-primary hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/app/projects')}>
                  查看全部
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(summary?.projects || []).map((p) => (
                  <Card
                    key={p.id}
                    className="group cursor-pointer overflow-hidden border-muted/60 transition-all hover:shadow-md"
                    onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                  >
                    <div className={cn('h-1.5 w-full', p.type === 'CODE' ? 'bg-primary' : 'bg-emerald-500')} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
                          {p.type === 'CODE' ? '代码项目' : '非代码项目'}
                        </Badge>
                        <span className="text-[10px] font-semibold text-muted-foreground">{p.courseName}</span>
                      </div>
                      <CardTitle className="text-lg transition-colors group-hover:text-primary">{p.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">进度</span>
                        <span className="font-bold">{p.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t bg-muted/10 py-3 text-[11px] text-muted-foreground">
                      <span>{p.teamName}</span>
                      <span>截止：{p.dueDate || '未设置'}</span>
                    </CardFooter>
                  </Card>
                ))}
                {!q.isLoading && !(summary?.projects || []).length ? (
                  <Card className="md:col-span-2">
                    <CardContent className="p-8 text-center text-muted-foreground">
            还没有项目。请先在课程的组队任务中完成组队，再创建项目。
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">紧急任务</CardTitle>
                  <CardDescription>优先处理这些事项</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(summary?.urgentTasks || []).map((t) => (
                    <div
                      key={t.id}
                      className="cursor-pointer rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/app/projects/${t.projectId}/tasks/${t.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold">{t.title}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.projectName}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {priorityLabel[t.priority]}
                        </Badge>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground">截止：{t.dueDate || '未设置'}</div>
                    </div>
                  ))}
                  {!q.isLoading && !(summary?.urgentTasks || []).length ? <div className="text-sm text-muted-foreground">暂无紧急任务。</div> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">最近文档</CardTitle>
                  <CardDescription>最新更新的协作文档。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(summary?.documents || []).map((d) => (
                    <button
                      key={d.id}
                      className="w-full rounded-xl border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/30"
                      onClick={() => navigate(`/app/projects/${d.projectId}/documents/${d.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="line-clamp-1 text-sm font-semibold">{d.title}</div>
                        <FileText size={14} className="text-muted-foreground" />
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{d.projectName}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">更新时间：{d.updatedAt}</div>
                    </button>
                  ))}
                  {!q.isLoading && !(summary?.documents || []).length ? <div className="text-sm text-muted-foreground">暂无文档。</div> : null}
                </CardContent>
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
        onClick && 'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]'
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
