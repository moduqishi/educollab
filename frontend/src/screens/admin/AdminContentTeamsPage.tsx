import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel } from './admin-layout';
import { teamFrontLinks } from './admin-content-utils';

export function AdminContentTeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');
  const [courseFilter, setCourseFilter] = React.useState('ALL');
  const teamsQ = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  if (teamsQ.isLoading || coursesQ.isLoading) return <PageLoading label="正在加载团队入口..." />;
  if (teamsQ.isError || coursesQ.isError) return <PageError title="团队入口加载失败" onRetry={() => { void teamsQ.refetch(); void coursesQ.refetch(); }} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (teamsQ.data || []).filter((item) => {
    const matchSearch = !search || `${item.name} ${item.courseName || ''} ${item.projectName || ''} ${item.leaderName || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === 'ALL' || String(item.courseId || '') === courseFilter;
    return matchSearch && matchCourse;
  });
  return (
    <AdminPanel title="团队入口页" description="按课程筛选团队后直接进入团队前台界面。">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索团队、课程、项目、队长..." /></div>
        <Select value={courseFilter} onValueChange={setCourseFilter}><SelectTrigger className="w-56"><SelectValue placeholder="所属课程" /></SelectTrigger><SelectContent><SelectItem value="ALL">全部课程</SelectItem>{(coursesQ.data || []).map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {!rows.length ? <PageEmpty title="没有匹配团队" message="请调整搜索或课程筛选。" /> : (
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">团队</th><th className="px-3 py-3">结构位置</th><th className="px-3 py-3">前台入口</th><th className="px-3 py-3 text-right">后台</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-b-0 align-top"><td className="px-3 py-3"><div className="font-medium">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">队长 {item.leaderName || '未设置'} · 成员 {item.memberCount}</div></td><td className="px-3 py-3 text-muted-foreground"><div>{item.courseName || '未关联课程'}</div><div className="text-xs">项目 {item.projectName || '未关联'} · 状态 {item.status}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{teamFrontLinks(item, returnTo).map((link) => <Button key={link.label} size="sm" variant="outline" onClick={() => navigate(link.href)}>{link.label}</Button>)}</div></td><td className="px-3 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => navigate(`/app/admin/teams/${item.id}/overview`)}>后台详情</Button></td></tr>)}</tbody></table></div>
      )}
    </AdminPanel>
  );
}
