import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { fileScopeLink } from './admin-content-utils';

export function AdminContentFilesPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const teamsQ = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  const projectsQ = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });
  if (coursesQ.isLoading || teamsQ.isLoading || projectsQ.isLoading) return <PageLoading label="正在加载文件入口..." />;
  if (coursesQ.isError || teamsQ.isError || projectsQ.isError) return <PageError title="文件入口加载失败" onRetry={() => { void coursesQ.refetch(); void teamsQ.refetch(); void projectsQ.refetch(); }} />;
  const returnTo = `${location.pathname}${location.search}`;
  const items = [
    ...(coursesQ.data || []).slice(0, 8).map((item) => ({ key: `c-${item.id}`, title: item.name, subtitle: '课程文件空间', href: fileScopeLink({ courseId: item.id }, returnTo), adminHref: `/app/admin/courses/${item.id}/overview` })),
    ...(teamsQ.data || []).slice(0, 8).map((item) => ({ key: `t-${item.id}`, title: item.name, subtitle: `${item.courseName || '未关联课程'} · 团队文件空间`, href: fileScopeLink({ teamId: item.id }, returnTo), adminHref: `/app/admin/teams/${item.id}/overview` })),
    ...(projectsQ.data || []).slice(0, 12).map((item) => ({ key: `p-${item.id}`, title: item.name, subtitle: `${item.courseName || '未关联课程'} / ${item.teamName || '未关联团队'} · 项目文件空间`, href: fileScopeLink({ projectId: item.id }, returnTo), adminHref: `/app/admin/projects/${item.id}/overview` })),
  ];
  return (
    <AdminPanel title="文件入口页" description="课程、团队、项目文件统一从这里跳到前台 Explorer，管理员以接管态管理真实文件界面。">
      {!items.length ? <PageEmpty title="暂无文件入口" message="当前没有可用课程、团队或项目。" /> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.key} className="rounded-2xl border border-muted/70 p-4"><div className="font-medium">{item.title}</div><div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div><div className="mt-4 flex flex-wrap gap-2">{item.href ? <Button size="sm" variant="outline" onClick={() => navigate(item.href)}>打开前台文件页</Button> : null}<Button size="sm" variant="ghost" onClick={() => navigate(item.adminHref)}>后台详情</Button></div></div>)}</div>}
    </AdminPanel>
  );
}
