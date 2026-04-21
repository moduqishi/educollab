import React from 'react';
import { NavLink, Outlet, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, ClipboardList, FileText, FolderKanban, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdminOverrideBanner, useAdminOverrideState } from '@/components/admin/AdminOverrideBanner';
import type { ClassDetail } from '@/lib/types';

const ClassDetailContext = React.createContext<{
  detail: ClassDetail;
  refresh: () => Promise<void>;
  isTeacher: boolean;
  classId: number;
} | null>(null);

export function useClassDetail() {
  const ctx = React.useContext(ClassDetailContext);
  if (!ctx) throw new Error('useClassDetail must be used within ClassDetailLayout');
  return ctx;
}

export function ClassDetailLayout() {
  const api = useApi();
  const nav = useNavigate();
  const location = useLocation();
  const { classId } = useParams();
  const id = Number(classId);
  const qc = useQueryClient();
  const { session } = useAuth();

  if (!id) return <Navigate to="/app/classes" replace />;

  const q = useQuery({
    queryKey: ['classDetail', id],
    queryFn: () => api.classDetail(id),
  });

  const detail = q.data;
  const isAdmin = session?.profile.role === 'ADMIN';
  const isTeacher = session?.profile.role === 'TEACHER' || isAdmin;
  const adminMode = location.pathname.startsWith('/app/admin/courses/');
  const { enabled: adminOverride } = useAdminOverrideState();
  const basePath = adminMode ? `/app/admin/courses/${id}` : `/app/classes/${id}`;
  const backTo = adminMode ? '/app/admin/courses' : '/app/classes';

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['classDetail', id] });
    await qc.invalidateQueries({ queryKey: ['classes'] });
  };

  React.useEffect(() => {
    if (detail) {
      setTitle([detail.classInfo.name, '课程详情']);
    }
  }, [detail]);

  if (q.isLoading || !detail) {
    return (
      <div className="px-8 py-10 text-muted-foreground">
        {q.isLoading ? '正在加载课程...' : '课程不存在或无权访问。'}
      </div>
    );
  }

  const tabs = [
    { to: `/app/classes/${id}/overview`, label: '概览', icon: BookOpen },
    { to: `/app/classes/${id}/members`, label: '成员', icon: Users },
    { to: `/app/classes/${id}/teams`, label: '团队', icon: Users },
    { to: `/app/classes/${id}/projects`, label: '项目', icon: FolderKanban },
    { to: `/app/classes/${id}/assignments`, label: '作业', icon: ClipboardList },
    { to: `/app/classes/${id}/files`, label: '文件', icon: FileText },
  ];

  return (
    <ClassDetailContext.Provider value={{ detail, refresh, isTeacher, classId: id }}>
      <div className="px-8 pt-6 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => nav(backTo)}
                  title={adminMode ? '返回课程管理' : '返回课程列表'}
                >
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">
                  课程
                </Badge>
                {adminMode ? <Badge variant="secondary" className="rounded-full">管理员视图</Badge> : null}
              </div>
              <h1 className="mt-2 truncate text-4xl font-display font-bold tracking-tight">
                {detail.classInfo.name}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                教师：{detail.classInfo.teacherName || '未分配'}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {detail.classInfo.classCode}
              </Badge>
            </div>
          </div>

          <AdminOverrideBanner description="管理员正在课程前台界面中接管成员、团队、项目、作业和文件操作。" />

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {[
              ...tabs.map((t) => ({
                ...t,
                to: `${basePath}/${t.label === '概览' ? 'overview' : t.label === '成员' ? 'members' : t.label === '团队' ? 'teams' : t.label === '项目' ? 'projects' : t.label === '作业' ? 'assignments' : 'files'}`,
              })),
              ...(adminMode ? [
                { to: `${basePath}/import`, label: '导入', icon: ClipboardList },
                { to: `${basePath}/audit`, label: '审计', icon: BookOpen },
              ] : []),
            ].map((t) => (
              <NavLink
                key={t.to}
                to={adminOverride ? `${t.to}${location.search}` : t.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-muted text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
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
    </ClassDetailContext.Provider>
  );
}
