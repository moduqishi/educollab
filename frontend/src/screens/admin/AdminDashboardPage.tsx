import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, FolderKanban, CheckSquare, MessageSquare, ClipboardCheck, TrendingUp } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading } from '@/screens/common/States';

export function AdminDashboardPage() {
  const api = useApi();
  const navigate = useNavigate();
  React.useEffect(() => { setTitle(['系统管理', '系统概览']); }, []);

  const q = useQuery({ queryKey: ['adminStats'], queryFn: () => api.adminStats() });
  if (q.isLoading) return <PageLoading label="正在加载系统数据..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const s = q.data!;

  const metrics = [
    { title: '总用户数', value: s.totalUsers, icon: Users, href: '/app/admin/users', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: '学生数', value: s.totalStudents, icon: Users, href: '/app/admin/users', color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: '教师数', value: s.totalTeachers, icon: GraduationCap, href: '/app/admin/users', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: '课程数', value: s.totalCourses, icon: BookOpen, href: '/app/admin/courses', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: '项目总数', value: s.totalProjects, icon: FolderKanban, href: '/app/admin/projects', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { title: '任务总数', value: s.totalTasks, icon: CheckSquare, href: '/app/admin/tasks', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: '讨论总数', value: s.totalDiscussions, icon: MessageSquare, href: '/app/admin/discussions', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { title: '作业总数', value: s.totalAssignments, icon: ClipboardCheck, href: '/app/admin/assignments', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1500px] space-y-8">
        {/* 顶部标题区 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">系统概览</h1>
            <p className="mt-1 text-sm text-muted-foreground">查看 EduCollab 平台整体运行状态</p>
          </div>
          <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary px-3 py-1.5 text-sm font-medium">
            管理员视图
          </Badge>
        </div>

        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <Card
                key={i}
                className="group cursor-pointer border-muted/70 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                onClick={() => navigate(metric.href)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl ${metric.bg} p-3 transition-transform duration-300 group-hover:scale-110`}>
                      <Icon size={22} className={metric.color} />
                    </div>
                    <TrendingUp size={16} className="text-muted-foreground/40" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold tracking-tight">{metric.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{metric.title}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 快捷入口 */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-muted-foreground">快捷管理</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: '用户管理', href: '/app/admin/users', icon: Users },
              { label: '课程管理', href: '/app/admin/courses', icon: BookOpen },
              { label: '项目管理', href: '/app/admin/projects', icon: FolderKanban },
              { label: '任务管理', href: '/app/admin/tasks', icon: CheckSquare },
              { label: '讨论管理', href: '/app/admin/discussions', icon: MessageSquare },
              { label: '作业管理', href: '/app/admin/assignments', icon: ClipboardCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className="cursor-pointer border-muted/70 transition-all hover:border-primary/30 hover:bg-muted/30 hover:shadow-md"
                  onClick={() => navigate(item.href)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Icon size={18} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
