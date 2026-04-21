import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { buildAdminOverrideUrl } from '@/components/admin/AdminOverrideBanner';

export function AdminContentRepositoriesPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const projectsQ = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });
  if (projectsQ.isLoading) return <PageLoading label="正在加载仓库入口..." />;
  if (projectsQ.isError) return <PageError title="仓库入口加载失败" onRetry={() => projectsQ.refetch()} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (projectsQ.data || []).filter((item) => item.type === 'CODE');
  return (
    <AdminPanel title="仓库入口页" description="代码项目仓库统一跳到项目前台仓库页，管理员以真实 Git Web 视图接管。">
      {!rows.length ? <PageEmpty title="暂无代码仓库" message="当前没有代码项目。" /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">项目</th><th className="px-3 py-3">结构位置</th><th className="px-3 py-3 text-right">操作</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-b-0"><td className="px-3 py-3"><div className="font-medium">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">状态 {item.status} · 进度 {item.progress}%</div></td><td className="px-3 py-3 text-muted-foreground">{item.courseName || '未关联课程'} / {item.teamName || '未关联团队'}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => navigate(buildAdminOverrideUrl(`/app/projects/${item.id}/repository/files`, returnTo))}>打开仓库前台页</Button><Button size="sm" variant="ghost" onClick={() => navigate(`/app/admin/projects/${item.id}/overview`)}>后台详情</Button></div></td></tr>)}</tbody></table></div>}
    </AdminPanel>
  );
}
