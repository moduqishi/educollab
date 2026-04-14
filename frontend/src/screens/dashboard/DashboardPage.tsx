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
import { zhCN } from '@/i18n/zh-CN';

export function DashboardPage() {
  const api = useApi();
  const { session } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    setTitle([zhCN.page.dashboardTitle]);
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
            <Button className="gap-2" onClick={() => navigate('/app/projects/new')}>
              新建项目 <ArrowRight size={14} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/app/notifications')}>
              查看通知 <Bell size={14} />
            </Button>
          </>
        }
        right={
          <div className="hidden md:flex items-center gap-2 p-3 rounded-2xl bg-white border shadow-sm">
            <TrendingUp size={16} className="text-primary" />
            <div className="text-xs text-muted-foreground">让协作变得清晰、可追踪。</div>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="活跃项目" value={summary?.activeProjects} icon={<FolderKanban size={18} />} tone="primary" loading={q.isLoading} />
            <StatCard title="待处理任务" value={summary?.pendingTasks} icon={<CheckSquare size={18} />} tone="neutral" loading={q.isLoading} />
            <StatCard title="未读通知" value={summary?.unreadNotifications} icon={<Bell size={18} />} tone="neutral" loading={q.isLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold">最近项目</h3>
                <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5" onClick={() => navigate('/app/projects')}>
                  查看全部
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(summary?.projects || []).map((p) => (
                  <Card
                    key={p.id}
                    className="group hover:shadow-md transition-all border-muted/60 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/app/projects/${p.id}/overview`)}
                  >
                    <div className={cn('h-1.5 w-full', p.type === 'CODE' ? 'bg-primary' : 'bg-emerald-500')} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                          {p.type === 'CODE' ? '代码项目' : '非代码项目'}
                        </Badge>
                        <span className="text-[10px] font-semibold text-muted-foreground">{p.courseName}</span>
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">进度</span>
                        <span className="font-bold">{p.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/10 py-3 text-[11px] text-muted-foreground flex justify-between">
                      <span>{p.teamName}</span>
                      <span>截止：{p.dueDate || '未设置'}</span>
                    </CardFooter>
                  </Card>
                ))}
                {!q.isLoading && !(summary?.projects || []).length && (
                  <Card className="md:col-span-2">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      还没有项目。点击「新建项目」开始你的第一次协作。
                    </CardContent>
                  </Card>
                )}
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
                    <div key={t.id} className="p-3 rounded-xl border bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold line-clamp-1">{t.title}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.projectName}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {priorityLabel[t.priority]}
                        </Badge>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground">截止：{t.dueDate || '未设置'}</div>
                    </div>
                  ))}
                  {!q.isLoading && !(summary?.urgentTasks || []).length && <div className="text-sm text-muted-foreground">暂无紧急任务。</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">最近文档</CardTitle>
                  <CardDescription>最新更新的协作文档</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(summary?.documents || []).map((d) => (
                    <button
                      key={d.id}
                      className="w-full text-left p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/app/projects/${d.projectId}/documents/${d.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold line-clamp-1">{d.title}</div>
                        <FileText size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{d.projectName}</div>
                      <div className="text-[10px] text-muted-foreground mt-2">更新时间：{d.updatedAt}</div>
                    </button>
                  ))}
                  {!q.isLoading && !(summary?.documents || []).length && <div className="text-sm text-muted-foreground">暂无文档。</div>}
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
}: {
  title: string;
  value?: number;
  icon: React.ReactNode;
  tone: 'primary' | 'neutral';
  loading?: boolean;
}) {
  return (
    <Card className={cn(tone === 'primary' ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-none' : 'shadow-sm')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-sm font-medium', tone === 'primary' ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{title}</CardTitle>
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', tone === 'primary' ? 'bg-white/15 text-white' : 'bg-muted text-muted-foreground')}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-4xl font-bold', tone === 'primary' ? 'text-white' : 'text-foreground')}>{loading ? '—' : value ?? 0}</div>
      </CardContent>
    </Card>
  );
}
