import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { courseFrontLinks } from './admin-content-utils';

export function AdminContentCoursesPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');
  const q = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  if (q.isLoading) return <PageLoading label="正在加载课程入口..." />;
  if (q.isError) return <PageError title="课程入口加载失败" onRetry={() => q.refetch()} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (q.data || []).filter((item) => !search || `${item.name} ${item.classCode} ${item.teacherName || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <AdminPanel title="课程入口页" description="按课程进入全部前台课程界面，管理员以接管态处理成员、团队、项目、作业和文件。">
      <div className="mb-4 flex max-w-md items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索课程名、班级码、教师..." />
        </div>
      </div>
      {!rows.length ? <PageEmpty title="没有匹配课程" message="请调整搜索条件。" /> : (
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">课程</th><th className="px-3 py-3">教师 / 结构</th><th className="px-3 py-3">前台入口</th><th className="px-3 py-3 text-right">后台</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-b-0 align-top"><td className="px-3 py-3"><div className="font-medium">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">{item.classCode}</div></td><td className="px-3 py-3 text-muted-foreground"><div>{item.teacherName || '未分配教师'}</div><div className="text-xs">成员 {item.memberCount} · 团队 {item.teamCount || 0} · 项目 {item.projectCount || 0}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{courseFrontLinks(item, returnTo).map((link) => <Button key={link.label} size="sm" variant="outline" onClick={() => navigate(link.href)}>{link.label}</Button>)}</div></td><td className="px-3 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => navigate(`/app/admin/courses/${item.id}/overview`)}>后台详情</Button></td></tr>)}</tbody></table></div>
      )}
    </AdminPanel>
  );
}
