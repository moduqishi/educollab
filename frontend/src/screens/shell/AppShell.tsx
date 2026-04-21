import React from 'react';
import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { BarChart3, Bell, Bot, CheckSquare, ClipboardCheck, FileText, FolderKanban, GraduationCap, LayoutDashboard, LogOut, MessageSquare, MessagesSquare, Settings, UserCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/auth';
import { useApi } from '@/app/api';
import { zhCN } from '@/i18n/zh-CN';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export function AppShell() {
  const { token, session, setSession, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const meQuery = useQuery({
    queryKey: ['me', token],
    enabled: !!token && !session,
    queryFn: () => api.me(),
  });

  React.useEffect(() => {
    if (meQuery.data) setSession(meQuery.data);
  }, [meQuery.data, setSession]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!session && meQuery.isLoading) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">正在加载...</div>;
  if (!session && meQuery.isError) {
    logout();
    return <Navigate to="/login" replace />;
  }
  if (!session) return null;

  const isTeacher = session.profile.role === 'TEACHER';
  const isAdmin = session.profile.role === 'ADMIN';
  const pathname = location.pathname;
  const topSection = pathname.split('/')[2] || 'dashboard';

  const sectionLabelMap: Record<string, string> = {
    dashboard: '仪表盘',
    classes: '课程中心',
    teams: '团队工作台',
    projects: '项目',
    tasks: '待办',
    documents: '文档',
    messages: '消息',
    ai: 'AI 助手',
    notifications: '通知',
    profile: '个人中心',
    settings: '设置中心',
    teacher: '教师工作台',
    admin: '系统管理',
  };

  const studentNav: NavItem[] = [
    { to: '/app/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { to: '/app/classes', label: '课程', icon: Users },
    { to: '/app/teams', label: '团队', icon: Users },
    { to: '/app/projects', label: '项目', icon: FolderKanban },
    { to: '/app/tasks', label: '待办', icon: CheckSquare },
    { to: '/app/documents', label: '文档', icon: FileText },
    { to: '/app/messages', label: '消息', icon: MessageSquare },
    { to: '/app/ai', label: 'AI 助手', icon: Bot },
  ];

  const teacherNav: NavItem[] = [
    { to: '/app/teacher/dashboard', label: '教师工作台', icon: GraduationCap },
    { to: '/app/classes', label: '课程', icon: Users },
    { to: '/app/teams', label: '团队', icon: Users },
    { to: '/app/projects', label: '项目', icon: FolderKanban },
    { to: '/app/teacher/assignments', label: '作业', icon: ClipboardCheck },
    { to: '/app/teacher/feedback', label: '反馈', icon: MessagesSquare },
    { to: '/app/teacher/contributions', label: '总结总览', icon: BarChart3 },
  ];

  const adminNav: NavItem[] = [
    { to: '/app/admin', label: '系统概览', icon: LayoutDashboard },
    { to: '/app/admin/users', label: '用户管理', icon: Users },
    { to: '/app/admin/courses', label: '课程管理', icon: GraduationCap },
    { to: '/app/admin/projects', label: '项目管理', icon: FolderKanban },
    { to: '/app/admin/tasks', label: '任务管理', icon: CheckSquare },
    { to: '/app/admin/discussions', label: '讨论管理', icon: MessageSquare },
    { to: '/app/admin/assignments', label: '作业管理', icon: ClipboardCheck },
  ];

  const navItems = isAdmin ? adminNav : isTeacher ? teacherNav : studentNav;
  const sectionLabel = sectionLabelMap[topSection] || '工作区';

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-white p-4">
        <div className="mb-8 flex items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <FolderKanban size={24} />
          </div>
          <h1 className="text-xl font-display font-bold text-primary">{zhCN.brand}</h1>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                pathname === item.to || pathname.startsWith(`${item.to}/`) ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">{item.label}</span>
              {pathname === item.to || pathname.startsWith(`${item.to}/`) ? <motion.div layoutId="active-pill" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" /> : null}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto space-y-1">
          <NavLink to="/app/notifications" className={({ isActive }) => cn('flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200', isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <Bell size={20} />
            <span className="font-medium">通知</span>
          </NavLink>
          <NavLink to="/app/settings" className={({ isActive }) => cn('flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200', isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <Settings size={20} />
            <span className="font-medium">设置</span>
          </NavLink>

          <Separator className="my-4" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left transition-colors hover:bg-muted/70">
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src={session.profile.avatar} />
                    <AvatarFallback>{session.profile.name?.slice(0, 1) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{session.profile.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{isAdmin ? '管理员' : isTeacher ? '教师' : '学生'}</p>
                  </div>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-muted bg-white p-2 shadow-xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="font-semibold">{session.profile.name}</div>
                  <div className="text-xs text-muted-foreground">{session.profile.email}</div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/profile')} className="rounded-xl px-3 py-2"><UserCircle2 size={16} />个人中心</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')} className="rounded-xl px-3 py-2"><Settings size={16} />设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => { logout(); navigate('/login'); }} className="rounded-xl px-3 py-2"><LogOut size={16} />退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 px-8 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-4">
            <h2 className="truncate text-lg font-semibold">{sectionLabel}</h2>
            <Badge variant="outline" className="shrink-0 border-primary/20 bg-primary/5 text-primary">{isAdmin ? '管理员视图' : isTeacher ? '教师视图' : '学生视图'}</Badge>
          </div>

          <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigate('/app/notifications')} title="通知">
              <Bell size={18} />
            </Button>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
