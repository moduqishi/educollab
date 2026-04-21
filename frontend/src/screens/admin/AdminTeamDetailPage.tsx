import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FolderKanban, Plus, Shield, Trash2, Users } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

export function AdminTeamDetailPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { teamId } = useParams();
  const id = Number(teamId);
  const tab = location.pathname.split('/').filter(Boolean).at(-1) || 'overview';
  const [form, setForm] = React.useState({ name: '', status: 'FORMING', groupOrder: '', leaderUserId: '' });
  const [memberUserId, setMemberUserId] = React.useState('');

  React.useEffect(() => {
    setTitle(['系统管理', '团队详情']);
  }, []);

  const detailQ = useQuery({ queryKey: ['adminTeamDetail', id], queryFn: () => api.adminTeamDetail(id), enabled: !!id });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const storageQ = useQuery({ queryKey: ['adminStorageFiles'], queryFn: () => api.adminStorageFiles() });
  const saveM = useMutation({
    mutationFn: () => api.updateAdminTeam(id, { name: form.name, status: form.status, groupOrder: form.groupOrder ? Number(form.groupOrder) : null, leaderUserId: form.leaderUserId ? Number(form.leaderUserId) : null }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['adminTeamDetail', id] }),
        qc.invalidateQueries({ queryKey: ['adminTeams'] }),
      ]);
    },
  });
  const addMemberM = useMutation({ mutationFn: () => api.addAdminTeamMember(id, Number(memberUserId)), onSuccess: async () => { setMemberUserId(''); await qc.invalidateQueries({ queryKey: ['adminTeamDetail', id] }); } });
  const removeMemberM = useMutation({ mutationFn: (userId: number) => api.removeAdminTeamMember(id, userId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['adminTeamDetail', id] }); } });
  const transferLeaderM = useMutation({ mutationFn: (leaderUserId: number) => api.transferAdminTeamLeader(id, leaderUserId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['adminTeamDetail', id] }); await qc.invalidateQueries({ queryKey: ['adminTeams'] }); } });

  React.useEffect(() => {
    const detail = detailQ.data?.teamDetail;
    if (detail) {
      setTitle(['系统管理', detail.name]);
      setForm({ name: detail.name, status: detail.status || 'FORMING', groupOrder: detail.groupOrder ? String(detail.groupOrder) : '', leaderUserId: detail.leaderId ? String(detail.leaderId) : '' });
    }
  }, [detailQ.data]);

  if (detailQ.isLoading || coursesQ.isLoading || storageQ.isLoading) return <PageLoading label="正在加载团队详情..." />;
  if (detailQ.isError || coursesQ.isError || storageQ.isError || !detailQ.data) return <PageError title="团队详情加载失败" onRetry={() => { void detailQ.refetch(); void coursesQ.refetch(); void storageQ.refetch(); }} />;

  const detail = detailQ.data;
  const team = detail.teamDetail;
  const files = (storageQ.data || []).filter((item) => item.teamId === id);

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button variant="ghost" className="-ml-3 mb-2 gap-2" onClick={() => navigate('/app/admin/teams')}><ArrowLeft size={16} />返回团队管理</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users size={16} />团队管理后台</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{team.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{team.courseName || '未关联课程'} · 队长 {team.leaderName || '未设置'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">成员 {team.members.length}</Badge>
            <Badge variant={team.project ? 'outline' : 'secondary'}>{team.project ? '已关联项目' : '未关联项目'}</Badge>
            <Badge variant="outline">{team.status || 'FORMING'}</Badge>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => navigate(`/app/admin/teams/${id}/${value}`)} className="space-y-6">
          <TabsList variant="line" className="rounded-2xl border border-muted bg-white p-1">
            <TabsTrigger value="overview" className="rounded-xl px-4">概览</TabsTrigger>
            <TabsTrigger value="members" className="rounded-xl px-4">成员</TabsTrigger>
            <TabsTrigger value="project" className="rounded-xl px-4">关联项目</TabsTrigger>
            <TabsTrigger value="files" className="rounded-xl px-4">文件</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl px-4">审计</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">团队信息</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="space-y-1.5 md:col-span-2"><Label>团队名称</Label><Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div><div className="space-y-1.5"><Label>状态</Label><Select value={form.status} onValueChange={(value) => setForm((v) => ({ ...v, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FORMING">FORMING</SelectItem><SelectItem value="LOCKED">LOCKED</SelectItem><SelectItem value="ARCHIVED">ARCHIVED</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label>组序</Label><Input value={form.groupOrder} onChange={(e) => setForm((v) => ({ ...v, groupOrder: e.target.value }))} /></div><div className="space-y-1.5 md:col-span-2"><Label>队长</Label><Select value={form.leaderUserId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, leaderUserId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">未设置</SelectItem>{team.members.map((member) => <SelectItem key={member.userId} value={String(member.userId)}>{member.name}</SelectItem>)}</SelectContent></Select></div><div className="md:col-span-2 flex gap-2"><Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? '保存中...' : '保存团队信息'}</Button>{form.leaderUserId ? <Button variant="outline" onClick={() => transferLeaderM.mutate(Number(form.leaderUserId))} disabled={transferLeaderM.isPending}>确认转移队长</Button> : null}</div></CardContent></Card>
              <Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">上下游关系</CardTitle></CardHeader><CardContent className="space-y-4"><InfoRow label="所属课程" value={team.courseName || '未关联课程'} /><InfoRow label="项目" value={team.project?.projectName || '未关联项目'} /><InfoRow label="任务摘要" value={`${team.tasks.length} 条团队任务`} /><InfoRow label="文件条目" value={`${files.length} 条`} />{team.project?.projectId ? <Button variant="outline" onClick={() => navigate(`/app/admin/projects/${team.project?.projectId}/overview`)}>打开关联项目</Button> : null}</CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">添加成员</CardTitle></CardHeader><CardContent className="space-y-4"><Select value={memberUserId || '__empty__'} onValueChange={(value) => setMemberUserId(value === '__empty__' ? '' : value)}><SelectTrigger><SelectValue placeholder="选择课程成员" /></SelectTrigger><SelectContent><SelectItem value="__empty__">请选择</SelectItem>{detail.memberCandidates.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} · {item.email}</SelectItem>)}</SelectContent></Select><Button className="gap-2" disabled={!memberUserId || addMemberM.isPending} onClick={() => addMemberM.mutate()}><Plus size={14} />添加到团队</Button></CardContent></Card>
              <Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">成员列表</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">姓名</th><th className="px-3 py-2">邮箱</th><th className="px-3 py-2">身份</th><th className="px-3 py-2 text-right">操作</th></tr></thead><tbody>{team.members.map((member) => <tr key={member.userId} className="border-b last:border-b-0"><td className="px-3 py-3 font-medium">{member.name}</td><td className="px-3 py-3 text-muted-foreground">{member.email}</td><td className="px-3 py-3">{member.leader ? <Badge>队长</Badge> : <Badge variant="outline">成员</Badge>}</td><td className="px-3 py-3 text-right"><Button size="sm" variant="outline" className="text-destructive" disabled={member.leader || removeMemberM.isPending} onClick={() => removeMemberM.mutate(member.userId)}><Trash2 size={14} /></Button></td></tr>)}</tbody></table></div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="project"><Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">关联项目</CardTitle></CardHeader><CardContent>{!team.project ? <PageEmpty title="未绑定项目" message="这支团队还没有关联项目。" icon={FolderKanban} /> : <div className="rounded-2xl border px-4 py-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium">{team.project.projectName}</div><div className="mt-1 text-sm text-muted-foreground">{team.project.description || '暂无描述'} · 进度 {team.project.projectProgress || 0}%</div></div><Button variant="outline" onClick={() => navigate(`/app/admin/projects/${team.project?.projectId}/overview`)}>打开项目</Button></div></div>}</CardContent></Card></TabsContent>
          <TabsContent value="files">
            <StorageWorkspace
              scopeType="TEAM"
              scopeId={id}
              title="团队文件 Explorer"
              description="团队成员可协作管理普通文件；管理员可在这里直接维护团队文件夹结构，并继续进入下游项目。"
            />
          </TabsContent>
          <TabsContent value="audit"><Card className="border-muted/70"><CardHeader className="pb-3"><CardTitle className="text-base">管理员审计</CardTitle></CardHeader><CardContent>{!detail.audits.length ? <PageEmpty title="暂无审计" message="当前团队暂无管理员操作记录。" icon={Shield} /> : <div className="space-y-3">{detail.audits.map((item) => <div key={item.id} className="rounded-2xl border px-4 py-3"><div className="font-medium">{item.actionType}</div><div className="mt-1 text-sm text-muted-foreground">{item.detail || '无附加说明'}</div><div className="mt-1 text-xs text-muted-foreground">{item.adminName || '管理员'} · {item.createdAt}</div></div>)}</div>}</CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border px-4 py-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-medium">{value}</div></div>; }
