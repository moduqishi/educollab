import React from 'react';
import { NavLink, Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, CheckSquare, FileText, GitBranch, MessageSquare, Share2, Settings, Users, Tag, Package } from 'lucide-react';
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
  const { projectId } = useParams();
  const id = Number(projectId);
  const qc = useQueryClient();

  if (!id) return <Navigate to="/app/projects" replace />;

  const q = useQuery({
    queryKey: ['projectDetail', id],
    queryFn: () => api.projectDetail(id),
  });

  const detail = q.data;

  // 注意：标题由各子路由页面（概览/任务/讨论/文档/仓库）分别设置，避免父层覆盖子层标题。

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['projectDetail', id] });
    await qc.invalidateQueries({ queryKey: ['projects'] });
  };

  if (q.isLoading || !detail) {
    return (
      <div className="px-8 py-10 text-muted-foreground">
        {q.isLoading ? '加载项目中…' : '项目不存在或无权限访问。'}
      </div>
    );
  }

  const isCode = detail.project.type === 'CODE';

  const tabs = [
    { to: `/app/projects/${id}/overview`, label: 'Overview', icon: BarChart3 },
    { to: `/app/projects/${id}/tasks`, label: 'Tasks', icon: CheckSquare },
    { to: `/app/projects/${id}/discussions`, label: 'Discussions', icon: MessageSquare },
    { to: `/app/projects/${id}/documents`, label: 'Documents', icon: FileText },
    ...(isCode ? [{ to: `/app/projects/${id}/repository/files`, label: 'Repository', icon: GitBranch }] : []),
    ...(isCode ? [{ to: `/app/projects/${id}/releases`, label: 'Releases', icon: Package }] : []),
    { to: `/app/projects/${id}/members`, label: 'Members', icon: Users },
  ];

  return (
    <ProjectDetailContext.Provider value={{ detail, refresh }}>
      <div className="px-8 pt-6 pb-10">
        <div className="max-w-[1500px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav('/app/projects')} title="Back">
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">
                  {isCode ? 'Code Project' : 'Non-code Project'}
                </Badge>
                <span className="truncate">{detail.project.courseName || '—'}</span>
              </div>
              <h1 className="mt-2 text-4xl font-display font-bold tracking-tight truncate">{detail.project.name}</h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="rounded-full gap-2"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                  } catch {
                    // ignore
                  }
                }}
              >
                <Share2 size={16} /> Share
              </Button>

              <Dialog>
                <DialogTrigger render={<Button className="rounded-full gap-2" />}>
                  <Settings size={16} /> Settings
                </DialogTrigger>
                <DialogContent className="max-w-[720px]">
                  <DialogHeader>
                    <DialogTitle>Project Settings</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Input readOnly value={detail.project.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Team</Label>
                      <Input readOnly value={detail.project.teamName || '—'} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Input readOnly value={detail.project.description || '—'} />
                    </div>
                    <div className="space-y-2">
                      <Label>Course</Label>
                      <Input readOnly value={detail.project.courseName || '—'} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input readOnly value={detail.project.dueDate || '—'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors',
                    isActive ? 'bg-muted text-foreground shadow-sm' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
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
