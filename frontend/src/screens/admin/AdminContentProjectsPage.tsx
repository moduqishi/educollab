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
import { projectFrontLinks } from './admin-content-utils';

export function AdminContentProjectsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = React.useState('');
  const [courseFilter, setCourseFilter] = React.useState('ALL');
  const [teamFilter, setTeamFilter] = React.useState('ALL');
  const projectsQ = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const teamsQ = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  if (projectsQ.isLoading || coursesQ.isLoading || teamsQ.isLoading) return <PageLoading label="正在加载项目入口..." />;
  if (projectsQ.isError || coursesQ.isError || teamsQ.isError) return <PageError title="项目入口加载失败" onRetry={() => { void projectsQ.refetch(); void coursesQ.refetch(); void teamsQ.refetch(); }} />;
  const returnTo = `${location.pathname}${location.search}`;
  const rows = (projectsQ.data || []).filter((item) => {
    const matchSearch = !search || `${item.name} ${item.courseName || ''} ${item.teamName || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === 'ALL' || String(item.courseId || '') === courseFilter;
    const matchTeam = teamFilter === 'ALL' || String(item.teamId || '') === teamFilter;
    return matchSearch && matchCourse && matchTeam;
  });
  return (
    <AdminPanel title="项目入口页" description="按课程、团队下钻项目后直接进入前台真实业务界面。">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1 max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目、课程、团队..." /></div>
        <Select value={courseFilter} onValueChange={setCourseFilter}><SelectTrigger className="w-52"><SelectValue placeholder="所属课程" /></SelectTrigger><SelectContent><SelectItem value="ALL">全部课程</SelectItem>{(coursesQ.data || []).map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>)}</SelectContent></Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}><SelectTrigger className="w-52"><SelectValue placeholder="所属团队" /></SelectTrigger><SelectContent><SelectItem value="ALL">全部团队</SelectItem>{(teamsQ.data || []).map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}</SelectContent></Select>
      </div>
      {!rows.length ? <PageEmpty title="没有匹配项目" message="请调整筛选条件。" /> : (
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">项目</th><th className="px-3 py-3">结构位置</th><th className="px-3 py-3">前台入口</th><th className="px-3 py-3 text-right">后台</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-b last:border-b-0 align-top"><td className="px-3 py-3"><div className="font-medium">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">{item.type} · 状态 {item.status} · 进度 {item.progress}%</div></td><td className="px-3 py-3 text-muted-foreground"><div>{item.courseName || '未关联课程'}</div><div className="text-xs">{item.teamName || '未关联团队'} · 最近活跃 {item.lastActiveAt || '暂无'}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2">{projectFrontLinks(item, returnTo).map((link) => <Button key={link.label} size="sm" variant="outline" onClick={() => navigate(link.href)}>{link.label}</Button>)}</div></td><td className="px-3 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => navigate(`/app/admin/projects/${item.id}/overview`)}>后台详情</Button></td></tr>)}</tbody></table></div>
      )}
    </AdminPanel>
  );
}
