import React from 'react';
import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  MessageSquare,
  Bot,
  Bell,
  Settings,
  LogOut,
  Search,
  Plus,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  MessagesSquare,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/auth';
import { useApi } from '@/app/api';
import { zhCN } from '@/i18n/zh-CN';

type NavItem = { to: string; label: string; icon: any };

export function AppShell() {
  const { token, session, setSession, logout } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const meQuery = useQuery({
    queryKey: ['me', token],
    enabled: !!token && !session,
    queryFn: async () => api.me(),
  });

  React.useEffect(() => {
    if (meQuery.data) setSession(meQuery.data);
  }, [meQuery.data, setSession]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!session && meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        {zhCN.common.loading}
      </div>
    );
  }
  if (!session && meQuery.isError) {
    logout();
    return <Navigate to="/login" replace />;
  }
  if (!session) return null;

  const role = session.profile.role;

  const section = (location.pathname.split('/')[2] || '').toLowerCase();
  const sectionLabel =
    section === 'dashboard'
      ? '仪表盘'
      : section === 'projects'
        ? '项目'
        : section === 'teams'
          ? '团队'
          : section === 'tasks'
            ? '任务'
            : section === 'documents'
              ? '文档'
              : section === 'discussions'
                ? '讨论'
                : section === 'ai'
                  ? 'AI 助手'
                  : section === 'notifications'
                    ? '通知'
                    : section === 'settings'
                      ? '设置'
                      : section === 'teacher'
                        ? '教师端'
                        : '工作区';

  const studentNav: Array<NavItem & { id: string }> = [
    { id: 'dashboard', to: '/app/dashboard', label: zhCN.nav.dashboard, icon: LayoutDashboard },
    { id: 'teams', to: '/app/teams', label: zhCN.nav.teams, icon: Users },
    { id: 'projects', to: '/app/projects', label: zhCN.nav.projects, icon: FolderKanban },
    { id: 'tasks', to: '/app/tasks', label: zhCN.nav.tasks, icon: CheckSquare },
    { id: 'documents', to: '/app/documents', label: zhCN.nav.documents, icon: FileText },
    { id: 'discussions', to: '/app/discussions', label: zhCN.nav.discussions, icon: MessageSquare },
    { id: 'ai', to: '/app/ai', label: zhCN.nav.ai, icon: Bot },
  ];

  const teacherNav: Array<NavItem & { id: string }> = [
    { id: 'teacher-dashboard', to: '/app/teacher/dashboard', label: zhCN.nav.teacherDashboard, icon: GraduationCap },
    { id: 'projects', to: '/app/projects', label: zhCN.nav.projects, icon: FolderKanban },
    { id: 'teacher-assignments', to: '/app/teacher/assignments', label: zhCN.nav.teacherAssignments, icon: ClipboardCheck },
    { id: 'teacher-feedback', to: '/app/teacher/feedback', label: zhCN.nav.teacherFeedback, icon: MessagesSquare },
    { id: 'teacher-contributions', to: '/app/teacher/contributions', label: zhCN.nav.teacherContributions, icon: BarChart3 },
  ];

  const navItems = role === 'TEACHER' ? teacherNav : studentNav;

  const SidebarItem = ({ item, active }: { item: NavItem; active: boolean }) => (
    <NavLink
      to={item.to}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
        active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <item.icon size={20} className={cn('transition-transform duration-200', active ? 'scale-110' : 'group-hover:scale-110')} />
      <span className="font-medium">{item.label}</span>
      {active ? <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" /> : null}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar (DEMO-LOCKED) */}
      <aside className="w-64 h-screen border-r bg-white flex flex-col p-4 sticky top-0">
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <FolderKanban size={24} />
          </div>
          <h1 className="text-xl font-display font-bold text-primary">{zhCN.brand}</h1>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <SidebarItem key={item.to} item={item} active={location.pathname === item.to || location.pathname.startsWith(item.to + '/')} />
          ))}
        </div>

        <div className="mt-auto space-y-1">
          <NavLink
            to="/app/notifications"
            className={({ isActive }) =>
              cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Bell size={20} />
            <span className="font-medium">{zhCN.nav.notifications}</span>
          </NavLink>
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Settings size={20} />
            <span className="font-medium">{zhCN.nav.settings}</span>
          </NavLink>

          <Separator className="my-4" />

          <div className="flex items-center gap-3 px-4 py-2">
            <Avatar className="w-10 h-10 border-2 border-primary/10">
              <AvatarImage src={session.profile.avatar} />
              <AvatarFallback>{session.profile.name?.slice(0, 1) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{session.profile.name}</p>
              <p className="text-xs text-muted-foreground truncate">{role === 'TEACHER' ? zhCN.auth.teacher : zhCN.auth.student}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="退出登录"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar (DEMO-LOCKED) */}
        <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-semibold truncate">{sectionLabel}</h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize shrink-0">
              {role === 'TEACHER' ? 'teacher' : 'student'} view
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder={zhCN.common.searchPlaceholder} className="pl-10 bg-muted/50 border-none focus-visible:ring-1" />
            </div>

            <Button className="rounded-full px-5 gap-2" onClick={() => navigate('/app/projects/new')}>
              <Plus size={18} /> 新建项目
            </Button>

            <Button variant="outline" size="icon" className="relative rounded-full" onClick={() => navigate('/app/notifications')} title="通知">
              <Bell size={18} />
            </Button>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
