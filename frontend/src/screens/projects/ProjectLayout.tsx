import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, CheckSquare, FileText, GitBranch, MessageSquare, Share2, Settings, Users, Package } from 'lucide-react';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProjectDetail } from '@/lib/types';

const ProjectDetailContext = React.createContext<{
  detail: ProjectDetail;
  refresh: () => Promise<void>;
} | null>(null);

export function useProjectDetail() {
  const ctx = React.useContext(ProjectDetailContext);
  if (!ctx) throw new Error('useProjectDetail must be used within ProjectLayout');
  return ctx;
}

export function ProjectLayout() {
  const api = useApi();
  const nav = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();

  if (!id) return <Navigate to="/app/projects" replace />;

  const q = useQuery({
    queryKey: ['projectDetail', id],
    queryFn: () => api.projectDetail(id),
  });

  const detail = q.data;
  const backTo = detail?.project.teamId
    ? `/app/teams/${detail.project.teamId}/overview`
    : detail?.project.courseId
      ? `/app/projects?courseId=${detail.project.courseId}`
      : '/app/projects';

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['projectDetail', id] });
    await qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const currentPageKey = React.useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((item) => item === 'projects');
    return idx >= 0 && parts.length > idx + 2 ? parts[idx + 2] : 'overview';
  }, [location.pathname]);

  React.useEffect(() => {
    if (!detail) return;
    void api.trackProjectVisit(id, currentPageKey);
  }, [api, currentPageKey, detail, id]);

  if (q.isLoading || !detail) {
    return <div className="px-8 py-10 text-muted-foreground">{q.isLoading ? '正在加载项目...' : '项目不存在或无权访问。'}</div>;
  }

  const isCode = detail.project.type === 'CODE';

  const tabs = [
    { to: `/app/projects/${id}/overview`, label: '概览', icon: BarChart3 },
    { to: `/app/projects/${id}/tasks`, label: '任务', icon: CheckSquare },
    { to: `/app/projects/${id}/reports`, label: '总结', icon: FileText },
    { to: `/app/projects/${id}/discussions`, label: '讨论', icon: MessageSquare },
    { to: `/app/projects/${id}/documents`, label: '文档', icon: FileText },
    { to: `/app/projects/${id}/messages`, label: '消息', icon: MessageSquare },
    ...(isCode ? [{ to: `/app/projects/${id}/repository/files`, label: '仓库', icon: GitBranch }] : []),
    ...(isCode ? [{ to: `/app/projects/${id}/releases`, label: '发布', icon: Package }] : []),
    { to: `/app/projects/${id}/members`, label: '成员', icon: Users },
  ];

  return (
    <ProjectDetailContext.Provider value={{ detail, refresh }}>
      <div className="px-8 pt-6 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav(backTo)} title={detail.project.teamId ? '返回所属团队' : '返回项目列表'}>
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">
                  {isCode ? '代码项目' : '非代码项目'}
                </Badge>
                {!detail?.currentUserCanEdit ? <Badge variant="secondary" className="rounded-full">只读查看</Badge> : null}
                <span className="truncate">{detail.project.courseName || '未关联课程'}</span>
                {detail.project.teamName ? <span className="truncate">/ {detail.project.teamName}</span> : null}
              </div>
              <h1 className="mt-2 truncate text-4xl font-display font-bold tracking-tight">{detail.project.name}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                  } catch {
                    // ignore
                  }
                }}
              >
                <Share2 size={16} /> 分享
              </Button>

              <Dialog>
                <DialogTrigger render={<Button className="gap-2 rounded-full" />}>
                  <Settings size={16} /> 设置
                </DialogTrigger>
                <DialogContent className="max-w-[720px]">
                  <DialogHeader>
                    <DialogTitle>项目设置</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>项目名称</Label>
                      <Input readOnly value={detail.project.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>所属团队</Label>
                      <Input readOnly value={detail.project.teamName || '未关联团队'} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>项目描述</Label>
                      <Input readOnly value={detail.project.description || '暂无描述'} />
                    </div>
                    <div className="space-y-2">
                    <Label>所属课程</Label>
                    <Input readOnly value={detail.project.courseName || '未关联课程'} />
                    </div>
                    <div className="space-y-2">
                      <Label>截止日期</Label>
                      <Input readOnly value={detail.project.dueDate || '未设置'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">关闭</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
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
    </ProjectDetailContext.Provider>
  );
}
