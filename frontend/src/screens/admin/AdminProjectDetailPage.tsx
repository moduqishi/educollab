import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, FolderKanban, GitBranch, Plus, Trash2, Users } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProjectRepositoryExplorer } from '@/components/storage/ProjectRepositoryExplorer';
import { ProjectSystemExplorer } from '@/components/storage/ProjectSystemExplorer';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminBreadcrumbs, AdminInfoRow, AdminPageIntro, AdminPanel, AdminSidebarSection, AdminStatGrid } from './admin-layout';

export function AdminProjectDetailPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const id = Number(projectId);
  const tab = location.pathname.split('/').filter(Boolean).at(-1) || 'overview';
  const [form, setForm] = React.useState({ name: '', description: '', status: 'ACTIVE', courseId: '', teamId: '', dueDate: '' });
  const [memberUserId, setMemberUserId] = React.useState('');

  React.useEffect(() => setTitle(['系统管理', '项目详情']), []);

  const detailQ = useQuery({ queryKey: ['adminProjectDetail', id], queryFn: () => api.adminProjectDetail(id), enabled: !!id });
  const storageQ = useQuery({ queryKey: ['adminStorageFiles'], queryFn: () => api.adminStorageFiles() });
  const reposQ = useQuery({ queryKey: ['adminStorageRepos'], queryFn: () => api.adminStorageRepos() });
  const logsQ = useQuery({ queryKey: ['adminStorageLogs'], queryFn: () => api.adminStorageLogs() });
  const saveM = useMutation({ mutationFn: () => api.updateAdminProject(id, { projectId: id, name: form.name, description: form.description, status: form.status, courseId: form.courseId ? Number(form.courseId) : null, teamId: form.teamId ? Number(form.teamId) : null, dueDate: form.dueDate || null }), onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['adminProjectDetail', id] }), qc.invalidateQueries({ queryKey: ['adminProjects'] }), qc.invalidateQueries({ queryKey: ['projectDetail', id] })]); } });
  const addMemberM = useMutation({ mutationFn: () => api.addAdminProjectMember(id, { userId: Number(memberUserId) }), onSuccess: async () => { setMemberUserId(''); await qc.invalidateQueries({ queryKey: ['adminProjectDetail', id] }); } });
  const removeMemberM = useMutation({ mutationFn: (userId: number) => api.removeAdminProjectMember(id, userId), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['adminProjectDetail', id] }); } });

  React.useEffect(() => {
    const detail = detailQ.data?.projectDetail;
    if (detail) {
      setTitle(['系统管理', detail.project.name]);
      setForm({ name: detail.project.name, description: detail.project.description || '', status: detail.project.status || 'ACTIVE', courseId: detail.project.courseId ? String(detail.project.courseId) : '', teamId: detail.project.teamId ? String(detail.project.teamId) : '', dueDate: detail.project.dueDate || '' });
    }
  }, [detailQ.data]);

  if (detailQ.isLoading || storageQ.isLoading || reposQ.isLoading || logsQ.isLoading) return <PageLoading label="正在加载项目详情..." />;
  if (detailQ.isError || storageQ.isError || reposQ.isError || logsQ.isError || !detailQ.data) return <PageError title="项目详情加载失败" onRetry={() => { void detailQ.refetch(); void storageQ.refetch(); void reposQ.refetch(); void logsQ.refetch(); }} />;

  const detail = detailQ.data;
  const project = detail.projectDetail;
  const files = (storageQ.data || []).filter((item) => item.projectId === id);
  const repoItems = (reposQ.data || []).filter((item) => item.projectId === id);
  const logItems = (logsQ.data || []).filter((item) => item.projectId === id);
  const memberCandidates = detail.memberCandidates.filter((user) => !project.members.some((member) => member.id === user.id));
  const activeMilestone = project.milestones.find((item) => item.status === 'ACTIVE');
  const unassignedTasks = project.tasks.filter((item) => !item.assigneeName).length;
  const doneTasks = project.tasks.filter((item) => item.status === 'DONE').length;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <AdminBreadcrumbs items={[
          { label: '系统管理', onClick: () => navigate('/app/admin') },
          { label: '项目管理', onClick: () => navigate('/app/admin/projects') },
          ...(project.project.courseId ? [{ label: project.project.courseName || `课程 ${project.project.courseId}`, onClick: () => navigate(`/app/admin/courses/${project.project.courseId}/overview`) }] : []),
          ...(project.project.teamId ? [{ label: project.project.teamName || `团队 ${project.project.teamId}`, onClick: () => navigate(`/app/admin/teams/${project.project.teamId}/overview`) }] : []),
          { label: project.project.name, active: true },
        ]} />

        <AdminPageIntro
          eyebrow={<Button variant="ghost" className="-ml-3 gap-2" onClick={() => navigate('/app/admin/projects')}><ArrowLeft size={16} />返回项目管理</Button>}
          title={project.project.name}
          description="管理员项目页应先维护归属关系、成员、文件、仓库和日志，而不是像普通项目成员一样在这里日常使用项目。"
          badges={(
            <>
              <Badge variant="outline">状态 {project.project.status}</Badge>
              <Badge variant="outline">进度 {project.project.progress}%</Badge>
              <Badge variant="outline">成员 {project.members.length}</Badge>
              <Badge variant="outline">代码仓库 {repoItems.length}</Badge>
            </>
          )}
        />

        <AdminStatGrid
          columns="xl:grid-cols-4"
          items={[
            { label: '归属课程', value: project.project.courseName || '未关联', hint: '上游课程对象' },
            { label: '归属团队', value: project.project.teamName || '未关联', hint: '建议项目挂在团队下', tone: project.project.teamName ? 'success' : 'danger' },
            { label: '结构摘要', value: `${doneTasks}/${project.tasks.length}`, hint: `已完成任务 ${doneTasks} · 未分配任务 ${unassignedTasks}` },
            { label: '资产条目', value: `${files.length + repoItems.length + logItems.length}`, hint: `文件 ${files.length} · 仓库 ${repoItems.length} · 日志 ${logItems.length}` },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel title="归属与结构摘要" description="项目是课程和团队结构下的资产节点，应先确认归属、成员、仓库和日志是否完整。">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AdminInfoRow label="课程" value={project.project.courseName || '未关联课程'} tone={project.project.courseName ? 'success' : 'danger'} />
              <AdminInfoRow label="团队" value={project.project.teamName || '未关联团队'} tone={project.project.teamName ? 'success' : 'danger'} />
              <AdminInfoRow label="当前里程碑" value={activeMilestone?.title || '未激活'} />
              <AdminInfoRow label="任务完成" value={`${doneTasks}/${project.tasks.length}`} />
              <AdminInfoRow label="讨论 / 文档" value={`${project.stats.discussionCount} / ${project.stats.documentCount}`} />
              <AdminInfoRow label="提交 / 发布" value={`${project.stats.commitCount} / ${project.stats.releaseCount}`} />
            </div>
          </AdminPanel>

          <div className="space-y-6">
            <AdminSidebarSection title="资产跳转">
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/app/admin/storage')}>打开文件与存储</Button>
              {project.project.courseId ? <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/app/admin/courses/${project.project.courseId}/overview`)}>返回所属课程</Button> : null}
              {project.project.teamId ? <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/app/admin/teams/${project.project.teamId}/overview`)}>返回所属团队</Button> : null}
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/app/projects/${id}/reports`)}>查看项目总结页</Button>
            </AdminSidebarSection>

            <AdminSidebarSection title="异常提示">
              <AdminInfoRow label="未分配任务" value={unassignedTasks} tone={unassignedTasks > 0 ? 'danger' : 'success'} />
              <AdminInfoRow label="仓库条目" value={repoItems.length} tone={repoItems.length > 0 ? 'success' : 'danger'} />
              <AdminInfoRow label="日志条目" value={logItems.length} tone={logItems.length > 0 ? 'success' : 'danger'} />
            </AdminSidebarSection>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => navigate(`/app/admin/projects/${id}/${value}`)} className="space-y-6">
          <TabsList variant="line" className="rounded-2xl border border-muted bg-white p-1">
            <TabsTrigger value="overview" className="rounded-xl px-4">概览</TabsTrigger>
            <TabsTrigger value="members" className="rounded-xl px-4">成员</TabsTrigger>
            <TabsTrigger value="structure" className="rounded-xl px-4">结构摘要</TabsTrigger>
            <TabsTrigger value="assets" className="rounded-xl px-4">文件 / 仓库 / 日志</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-xl px-4">总结</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl px-4">审计</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminPanel title="项目基础信息" description="在这里维护项目元信息与归属，不把这里当成普通项目业务页。">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>项目名称</Label><Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>项目描述</Label><textarea className="min-h-[120px] w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none" value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>状态</Label><Select value={form.status} onValueChange={(value) => setForm((v) => ({ ...v, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">进行中</SelectItem><SelectItem value="COMPLETED">已完成</SelectItem><SelectItem value="ARCHIVED">已归档</SelectItem></SelectContent></Select></div>
                <div className="space-y-1.5"><Label>截止日期</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((v) => ({ ...v, dueDate: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>所属课程</Label><Select value={form.courseId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, courseId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">未关联课程</SelectItem>{detail.courseOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>所属团队</Label><Select value={form.teamId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, teamId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">未关联团队</SelectItem>{detail.teamOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="md:col-span-2"><Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? '保存中...' : '保存项目信息'}</Button></div>
              </div>
            </AdminPanel>
          </TabsContent>

          <TabsContent value="members">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <AdminPanel title="添加项目成员" description="管理员维护项目成员关系。">
                <div className="space-y-4">
                  <Select value={memberUserId || '__empty__'} onValueChange={(value) => setMemberUserId(value === '__empty__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="选择成员" /></SelectTrigger>
                    <SelectContent><SelectItem value="__empty__">请选择</SelectItem>{memberCandidates.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} · {item.email}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button className="gap-2" disabled={!memberUserId || addMemberM.isPending} onClick={() => addMemberM.mutate()}><Plus size={14} />添加到项目</Button>
                </div>
              </AdminPanel>
              <AdminPanel title="项目成员" description="成员应与项目归属、团队归属保持一致。">
                <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">姓名</th><th className="px-3 py-2">角色</th><th className="px-3 py-2 text-right">操作</th></tr></thead><tbody>{project.members.map((member) => <tr key={member.id} className="border-b last:border-b-0"><td className="px-3 py-3 font-medium">{member.name}</td><td className="px-3 py-3 text-muted-foreground">{member.role || '成员'}</td><td className="px-3 py-3 text-right"><Button size="sm" variant="outline" className="text-destructive" onClick={() => removeMemberM.mutate(member.id)} disabled={removeMemberM.isPending}><Trash2 size={14} /></Button></td></tr>)}</tbody></table></div>
              </AdminPanel>
            </div>
          </TabsContent>

          <TabsContent value="structure">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SimplePanel title="里程碑结构" rows={project.milestones.map((item) => `${item.title} · ${item.status} · 权重 ${item.weight}`)} empty="当前没有里程碑。" />
              <SimplePanel title="任务结构" rows={project.tasks.slice(0, 16).map((item) => `${item.title} · ${item.status} · ${item.assigneeName || '未分配'}`)} empty="当前没有任务。" />
            </div>
          </TabsContent>

          <TabsContent value="assets">
            <div className="space-y-6">
              <StorageWorkspace
                scopeType="PROJECT"
                scopeId={id}
                title="项目文件 Explorer"
                description="管理员直接维护项目 files 空间；仓库与 system 目录在下方以只读 Explorer 形式浏览。"
              />
              <ProjectRepositoryExplorer projectId={id} title="项目仓库 Explorer" description="仓库按代码树浏览，不再只显示扁平路径列表。" />
              <ProjectSystemExplorer projectId={id} title="项目 system Explorer" description="activity-logs、summary-cache 与 audit 都按资源管理器结构显示。" />
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <SimplePanel title="总结与活跃轨迹" rows={[
              `请从项目总结页查看完整图表：/app/projects/${id}/reports`,
              `当前统计：贡献相关日志/摘要数据已由项目总结工作台消费`,
              `项目活动体量：任务 ${project.stats.taskCount} / 讨论 ${project.stats.discussionCount} / 提交 ${project.stats.commitCount}`,
            ]} empty="暂无总结" />
          </TabsContent>

          <TabsContent value="audit"><SimplePanel title="管理员审计" rows={detail.audits.map((item) => `${item.actionType} · ${item.detail || '无附加说明'} · ${item.createdAt}`)} empty="当前项目暂无管理员操作记录。" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SimplePanel({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return <AdminPanel title={title} description="管理员摘要视图。">{!rows.length ? <PageEmpty title={`暂无${title}`} message={empty} icon={Users} /> : <div className="space-y-3">{rows.map((row, index) => <div key={`${row}-${index}`} className="rounded-2xl border px-4 py-3 text-sm">{row}</div>)}</div>}</AdminPanel>;
}
