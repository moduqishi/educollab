import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPageIntro, AdminPanel, AdminStatGrid } from './admin-layout';

export function AdminTeamsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState<'ALL' | 'COURSE' | 'STANDALONE'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'FORMING' | 'LOCKED' | 'ARCHIVED'>('ALL');
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', courseId: '', groupOrder: '', leaderUserId: '' });
  React.useEffect(() => { setTitle(['系统管理', '团队管理']); }, []);

  const q = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const usersQ = useQuery({ queryKey: ['adminUsers'], queryFn: () => api.adminUsers() });
  const createM = useMutation({
    mutationFn: () => api.createAdminTeam({ name: form.name, courseId: form.courseId ? Number(form.courseId) : null, groupOrder: form.groupOrder ? Number(form.groupOrder) : null, leaderUserId: form.leaderUserId ? Number(form.leaderUserId) : null, memberIds: form.leaderUserId ? [Number(form.leaderUserId)] : [], status: 'FORMING' }),
    onSuccess: async () => {
      setOpen(false);
      setForm({ name: '', courseId: '', groupOrder: '', leaderUserId: '' });
      await qc.invalidateQueries({ queryKey: ['adminTeams'] });
    },
  });

  if (q.isLoading || coursesQ.isLoading || usersQ.isLoading) return <PageLoading label="正在加载团队列表..." />;
  if (q.isError || coursesQ.isError || usersQ.isError) return <PageError onRetry={() => { void q.refetch(); void coursesQ.refetch(); void usersQ.refetch(); }} title="团队列表加载失败" />;

  const rows = (q.data || []).filter((item) => {
    const hit = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.courseName || '').toLowerCase().includes(search.toLowerCase()) || (item.leaderName || '').toLowerCase().includes(search.toLowerCase());
    const sourceOk = sourceFilter === 'ALL' || item.source === sourceFilter;
    const statusOk = statusFilter === 'ALL' || item.status === statusFilter;
    return hit && sourceOk && statusOk;
  });
  const missingLeader = rows.filter((row) => row.missingLeader).length;
  const missingProject = rows.filter((row) => row.missingProject).length;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <AdminPageIntro
          eyebrow="管理员后台 / 课程下游结构"
          title="团队管理"
          description="团队是课程下的中间层结构，主要负责承接成员、队长和项目归属。管理员在这里维护组序、队长、成员迁移和异常团队。"
          actions={<Button className="gap-2" onClick={() => setOpen(true)}><Plus size={14} />新建团队</Button>}
          badges={<Badge variant="outline">团队 {q.data?.length || 0}</Badge>}
        />

        <AdminStatGrid items={[
          { label: '团队总数', value: rows.length, hint: '课程结构中的中间层' },
          { label: '缺队长团队', value: missingLeader, hint: '应优先补齐领导关系', tone: missingLeader > 0 ? 'danger' : 'success' },
          { label: '缺项目团队', value: missingProject, hint: '适合继续绑定到课程项目', tone: missingProject > 0 ? 'danger' : 'success' },
          { label: '管理关系', value: '课程 → 团队 → 项目', hint: '团队负责承上启下' },
        ]} />

        <AdminPanel title="筛选与检索" description="按课程、队长、来源和状态过滤团队。">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索团队、课程或队长..." />
            </div>
            <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}><SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部来源</SelectItem><SelectItem value="COURSE">课程团队</SelectItem><SelectItem value="STANDALONE">独立团队</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">全部状态</SelectItem><SelectItem value="FORMING">FORMING</SelectItem><SelectItem value="LOCKED">LOCKED</SelectItem><SelectItem value="ARCHIVED">ARCHIVED</SelectItem></SelectContent></Select>
          </div>
        </AdminPanel>

        <AdminPanel title="团队列表" description="团队不应孤立存在，应清楚地看到它属于哪个课程、承接哪些成员、是否绑定项目。">
          {!rows.length ? <PageEmpty title="没有匹配团队" message="请调整筛选条件。" icon={Users} /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2 font-medium">团队</th><th className="px-3 py-2 font-medium">上级课程</th><th className="px-3 py-2 font-medium">队长 / 成员</th><th className="px-3 py-2 font-medium">下级项目</th><th className="px-3 py-2 font-medium">异常</th><th className="px-3 py-2 font-medium text-right">操作</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0 align-top">
                      <td className="px-3 py-3"><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.groupOrder ? `第 ${row.groupOrder} 组` : '未设置组序'} · {row.status}</div></td>
                      <td className="px-3 py-3 text-muted-foreground">{row.courseName || '未关联课程'}</td>
                      <td className="px-3 py-3 text-muted-foreground"><div>{row.leaderName || '未设置队长'}</div><div className="text-xs">成员 {row.memberCount}</div></td>
                      <td className="px-3 py-3 text-muted-foreground">{row.projectName || '未绑定项目'}</td>
                      <td className="px-3 py-3">{row.missingLeader || row.missingProject ? <div className="flex flex-wrap gap-2">{row.missingLeader ? <Badge variant="destructive">缺队长</Badge> : null}{row.missingProject ? <Badge variant="secondary">缺项目</Badge> : null}</div> : <Badge variant="outline">正常</Badge>}</td>
                      <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" onClick={() => nav(`/app/admin/teams/${row.id}/overview`)}>结构详情</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>新建团队</DialogTitle></DialogHeader><div className="grid grid-cols-1 gap-4 py-2"><div className="space-y-1.5"><Label>团队名称</Label><Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div><div className="space-y-1.5"><Label>所属课程</Label><Select value={form.courseId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, courseId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">独立团队</SelectItem>{(coursesQ.data || []).map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>组序</Label><Input value={form.groupOrder} onChange={(e) => setForm((v) => ({ ...v, groupOrder: e.target.value }))} /></div><div className="space-y-1.5"><Label>队长</Label><Select value={form.leaderUserId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, leaderUserId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">暂不设置</SelectItem>{(usersQ.data || []).filter((user) => user.role !== 'ADMIN').map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={!form.name.trim() || createM.isPending} onClick={() => createM.mutate()}>{createM.isPending ? '创建中...' : '创建团队'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
