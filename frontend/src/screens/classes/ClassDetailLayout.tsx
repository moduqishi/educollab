import React from 'react';
import { NavLink, Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, ClipboardList, FolderKanban, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  const isTeacher = session?.profile.role === 'TEACHER';

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
                  onClick={() => nav('/app/classes')}
                  title="返回课程列表"
                >
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">
                  课程
                </Badge>
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

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
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
