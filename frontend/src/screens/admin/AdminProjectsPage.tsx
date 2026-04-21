import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderKanban, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminProjectSummary } from '@/lib/types';
import { AdminPageIntro, AdminPanel, AdminStatGrid } from './admin-layout';

const typeLabels: Record<string, string> = { CODE: '代码项目', NON_CODE: '非代码项目' };

export function AdminProjectsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [courseFilter, setCourseFilter] = React.useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProjectSummary | null>(null);

  React.useEffect(() => { setTitle(['系统管理', '项目管理']); }, []);

  const q = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const updateStatusM = useMutation({ mutationFn: ({ projectId, status }: { projectId: number; status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' }) => api.updateProjectStatus(projectId, status), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['adminProjects'] }); } });
  const deleteM = useMutation({ mutationFn: (projectId: number) => api.deleteProject(projectId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['adminProjects'] }); setDeleteTarget(null); } });

  if (q.isLoading || coursesQ.isLoading) return <PageLoading label="正在加载项目管理数据..." />;
  if (q.isError || coursesQ.isError) return <PageError onRetry={() => { void q.refetch(); void coursesQ.refetch(); }} title="项目列表加载失败" />;

  const rows = (q.data || []).filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || (item.courseName || '').toLowerCase().includes(keyword) || (item.teamName || '').toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesCourse = courseFilter === 'ALL' || String(item.courseId) === courseFilter;
    return matchesKeyword && matchesStatus && matchesType && matchesCourse;
  });
  const unboundTeams = rows.filter((project) => !project.teamName).length;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <AdminPageIntro
          eyebrow="管理员后台 / 结构末端资产"
          title="项目管理"
          description="项目是课程和团队结构下的资产对象。管理员主要在这里维护归属、成员、状态、文件、仓库与总结，不把它当作普通用户项目页。"
          badges={<Badge variant="outline">项目 {q.data?.length || 0}</Badge>}
        />

        <AdminStatGrid items={[
          { label: '项目总数', value: rows.length, hint: '课程与团队下的资产节点' },
          { label: '未绑定团队项目', value: unboundTeams, hint: '建议回到项目详情补齐团队归属', tone: unboundTeams > 0 ? 'danger' : 'success' },
          { label: '代码项目', value: rows.filter((item) => item.type === 'CODE').length, hint: '含仓库存储与提交记录' },
          { label: '管理目标', value: '归属 + 资产', hint: '看结构、文件、仓库、日志和总结' },
        ]} />

        <AdminPanel title="筛选与检索" description="按课程、团队、状态和类型筛选。">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="搜索项目名、课程、团队..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Select value={courseFilter} onValueChange={setCourseFilter}><SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部课程</SelectItem>{(coursesQ.data || []).map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部状态</SelectItem><SelectItem value="ACTIVE">进行中</SelectItem><SelectItem value="COMPLETED">已完成</SelectItem><SelectItem value="ARCHIVED">已归档</SelectItem></SelectContent></Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full lg:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部类型</SelectItem><SelectItem value="CODE">代码项目</SelectItem><SelectItem value="NON_CODE">非代码项目</SelectItem></SelectContent></Select>
          </div>
        </AdminPanel>

        <AdminPanel title="项目列表" description="先看上级课程 / 团队，再进入项目详情继续维护文件、仓库、日志和总结。">
          {!rows.length ? <PageEmpty title="没有匹配项目" message="请调整筛选条件后再试。" icon={FolderKanban} /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3 font-medium">项目</th><th className="px-3 py-3 font-medium">结构位置</th><th className="px-3 py-3 font-medium">进度 / 阶段</th><th className="px-3 py-3 font-medium">成员 / 活跃</th><th className="px-3 py-3 font-medium">状态</th><th className="px-3 py-3 font-medium text-right">操作</th></tr></thead><tbody>{rows.map((project) => <tr key={project.id} className="border-b last:border-b-0 align-top"><td className="px-3 py-3"><div className="font-medium">{project.name}</div><div className="mt-1 text-xs text-muted-foreground">{typeLabels[project.type] || project.type} · {project.createdAt}</div></td><td className="px-3 py-3 text-muted-foreground"><div>{project.courseName || '未关联课程'}</div><div className="text-xs">{project.teamName || '未关联团队'}</div></td><td className="px-3 py-3"><div className="w-40"><div className="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>加权进度</span><span>{project.progress}%</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${project.progress}%` }} /></div></div><div className="mt-2 text-xs text-muted-foreground">当前阶段：{project.currentMilestoneTitle || '未开始'}</div></td><td className="px-3 py-3 text-muted-foreground"><div>成员 {project.memberCount || 0}</div><div className="text-xs">最近活跃：{project.lastActiveAt || '暂无记录'}</div></td><td className="px-3 py-3"><Select value={project.status} onValueChange={(value) => updateStatusM.mutate({ projectId: project.id, status: value as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' })} disabled={updateStatusM.isPending}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">进行中</SelectItem><SelectItem value="COMPLETED">已完成</SelectItem><SelectItem value="ARCHIVED">已归档</SelectItem></SelectContent></Select></td><td className="px-3 py-3"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/projects/${project.id}/overview`)}>结构详情</Button><Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(project)}><Trash2 size={14} /></Button></div></td></tr>)}</tbody></table></div>}
        </AdminPanel>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>确认删除项目</DialogTitle></DialogHeader><div className="py-2 text-sm text-muted-foreground">确定删除项目 <strong>{deleteTarget?.name}</strong> 吗？该项目的任务、讨论、文档与总结数据都将被一并清理。</div><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button><Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)} disabled={deleteM.isPending}>{deleteM.isPending ? '删除中...' : '确认删除'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
