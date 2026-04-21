import React from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, CheckSquare, FileText, FolderKanban, Settings, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AdminOverrideBanner, useAdminOverrideState } from '@/components/admin/AdminOverrideBanner';
import type { TeamDetailRecord } from '@/lib/types';
import { PageError } from '@/screens/common/States';

const TeamDetailContext = React.createContext<{
  detail: TeamDetailRecord;
  refresh: () => Promise<void>;
  currentUserId?: number;
  currentUserName?: string;
  teamId: number;
} | null>(null);

export function useTeamDetail() {
  const ctx = React.useContext(TeamDetailContext);
  if (!ctx) throw new Error('useTeamDetail must be used within TeamDetailLayout');
  return ctx;
}

export function TeamDetailLayout() {
  const api = useApi();
  const nav = useNavigate();
  const location = useLocation();
  const { teamId } = useParams();
  const id = Number(teamId);
  const qc = useQueryClient();
  const { session } = useAuth();

  if (!id) return <Navigate to="/app/teams" replace />;

  const detailQ = useQuery({
    queryKey: ['teamDetail', id],
    queryFn: () => api.teamDetail(id),
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['teamDetail', id] }),
      qc.invalidateQueries({ queryKey: ['teams'] }),
      qc.invalidateQueries({ queryKey: ['projects'] }),
    ]);
  };

  const detail = detailQ.data;
  const adminMode = location.pathname.startsWith('/app/admin/teams/');
  const { enabled: adminOverride } = useAdminOverrideState();
  const basePath = adminMode ? `/app/admin/teams/${id}` : `/app/teams/${id}`;
  const backTo = adminMode ? '/app/admin/teams' : detail?.courseId ? `/app/classes/${detail.courseId}/teams` : '/app/teams';

  React.useEffect(() => {
    if (detail?.name) setTitle([detail.name, '团队详情']);
  }, [detail?.name]);

  if (detailQ.isLoading) {
    return <div className="px-8 py-10 text-muted-foreground">正在加载团队...</div>;
  }

  if (detailQ.isError) {
    const error = detailQ.error;
    const status = error instanceof ApiError ? error.status : 500;
    return (
      <PageError
        title={status === 404 ? '团队不存在' : status === 403 ? '无权访问该团队' : '团队详情加载失败'}
        message={status === 404 ? '这支团队可能已被删除。' : status === 403 ? '你当前没有权限查看这个团队。' : '暂时无法读取团队详情，请稍后重试。'}
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  if (!detail) {
    return <PageError title="团队不存在" message="没有找到对应团队。" onRetry={() => detailQ.refetch()} />;
  }

  const tabs = [
    { to: `${basePath}/overview`, label: '概览', icon: BarChart3 },
    { to: `${basePath}/members`, label: '成员', icon: Users },
    { to: `${basePath}/projects`, label: '项目', icon: FolderKanban },
    { to: `${basePath}/tasks`, label: '任务', icon: CheckSquare },
    { to: `${basePath}/files`, label: '文件', icon: FileText },
    { to: `${basePath}/reports`, label: '总结', icon: FileText },
    ...(adminMode ? [{ to: `${basePath}/audit`, label: '审计', icon: Settings }] : []),
  ];

  const teamTypeLabel = detail.source === 'COURSE' ? '课程团队' : '独立团队';

  return (
    <TeamDetailContext.Provider value={{ detail, refresh, currentUserId: session?.profile.id, currentUserName: session?.profile.name, teamId: id }}>
      <div className="px-8 pt-6 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav(backTo)} title={adminMode ? '返回团队管理' : '返回团队列表'}>
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">{teamTypeLabel}</Badge>
                {adminMode ? <Badge variant="secondary" className="rounded-full">管理员视图</Badge> : null}
                {detail.groupOrder ? <Badge variant="secondary" className="rounded-full">{`第 ${detail.groupOrder} 组`}</Badge> : null}
                <span className="truncate">{detail.courseName || '未关联课程'}</span>
              </div>
              <h1 className="mt-2 truncate text-4xl font-display font-bold tracking-tight">{detail.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {detail.courseName || '未关联课程'} · 队长：{detail.leaderName || '未设置'}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="rounded-full">{detail.members.length} 人</Badge>
              {detail.teacherView ? <Badge variant="secondary" className="rounded-full">教师只读视图</Badge> : null}

              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" size="icon" className="rounded-full gap-2" title="团队设置">
                    <Settings size={16} />
                  </Button>
                } />
                <DialogContent className="max-w-[640px]">
                  <DialogHeader><DialogTitle>团队信息</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                    <Field label="团队名称" value={detail.name} />
                    <Field label="团队类型" value={teamTypeLabel} />
                    <Field label="所属课程" value={detail.courseName || '未关联课程'} />
                    <Field label="队长" value={detail.leaderName || '未设置'} />
                    <Field label="状态" value={detail.status || 'FORMING'} />
                    <Field label="成员数量" value={`${detail.members.length} 人`} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline">关闭</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <AdminOverrideBanner description="管理员正在团队前台界面中接管成员、项目、任务、文件和总结工作流。" />

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={adminOverride ? `${t.to}${location.search}` : t.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )
                }
              >
                <t.icon size={16} />
                {t.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </div>
    </TeamDetailContext.Provider>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly value={value} />
    </div>
  );
}
