import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileUp, FolderKanban, GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminBreadcrumbs, AdminInfoRow, AdminPageIntro, AdminPanel, AdminSidebarSection, AdminStatGrid } from './admin-layout';

const tabs = ['overview', 'members', 'teams', 'projects', 'assignments', 'import', 'files', 'audit'] as const;
type TabKey = (typeof tabs)[number];

export function AdminCourseDetailPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams();
  const id = Number(classId);
  const activeTab = (location.pathname.split('/').filter(Boolean).at(-1) || 'overview') as TabKey;
  const [form, setForm] = React.useState({ name: '', classCode: '', teacherId: '' });
  const [memberUserId, setMemberUserId] = React.useState('');
  const [memberRole, setMemberRole] = React.useState('STUDENT');
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => setTitle(['系统管理', '课程详情']), []);

  const detailQ = useQuery({ queryKey: ['adminCourseDetail', id], queryFn: () => api.adminCourseDetail(id), enabled: !!id });
  const usersQ = useQuery({ queryKey: ['adminUsers'], queryFn: () => api.adminUsers() });
  const storageQ = useQuery({ queryKey: ['adminStorageFiles'], queryFn: () => api.adminStorageFiles() });
  const previewM = useMutation({ mutationFn: (upload: File) => api.previewCourseImport(id, upload) });
  const executeM = useMutation({
    mutationFn: (upload: File) => api.executeCourseImport(id, upload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['adminCourseDetail', id] }),
        qc.invalidateQueries({ queryKey: ['adminCourses'] }),
      ]);
    },
  });
  const saveM = useMutation({
    mutationFn: () => api.updateCourse(id, form.name, form.classCode, form.teacherId ? Number(form.teacherId) : null),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['adminCourseDetail', id] }),
        qc.invalidateQueries({ queryKey: ['adminCourses'] }),
      ]);
    },
  });
  const addMemberM = useMutation({
    mutationFn: () => api.addAdminCourseMember(id, { userId: Number(memberUserId), role: memberRole }),
    onSuccess: async () => {
      setMemberUserId('');
      await qc.invalidateQueries({ queryKey: ['adminCourseDetail', id] });
    },
  });
  const removeMemberM = useMutation({
    mutationFn: (userId: number) => api.removeAdminCourseMember(id, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminCourseDetail', id] });
    },
  });

  React.useEffect(() => {
    if (detailQ.data) {
      setTitle(['系统管理', detailQ.data.classInfo.name]);
      setForm({
        name: detailQ.data.classInfo.name,
        classCode: detailQ.data.classInfo.classCode,
        teacherId: detailQ.data.teacherOptions.find((item) => item.name === detailQ.data.classInfo.teacherName)?.id?.toString() || '',
      });
    }
  }, [detailQ.data]);

  if (detailQ.isLoading || usersQ.isLoading || storageQ.isLoading) return <PageLoading label="正在加载课程详情..." />;
  if (detailQ.isError || usersQ.isError || storageQ.isError || !detailQ.data) {
    return <PageError title="课程详情加载失败" onRetry={() => { void detailQ.refetch(); void usersQ.refetch(); void storageQ.refetch(); }} />;
  }

  const detail = detailQ.data;
  const memberCandidates = (usersQ.data || []).filter((user) => !detail.members.some((member) => member.userId === user.id));
  const files = (storageQ.data || []).filter((item) => item.courseId === id);
  const orphanTeams = detail.teams.filter((team) => !team.leaderName);
  const unboundProjects = detail.projects.filter((project) => !project.teamName);
  const teamsWithProjects = detail.teams.map((team) => ({
    team,
    projects: detail.projects.filter((project) => project.teamId === team.id),
  }));

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <AdminBreadcrumbs items={[{ label: '系统管理', onClick: () => navigate('/app/admin') }, { label: '课程管理', onClick: () => navigate('/app/admin/courses') }, { label: detail.classInfo.name, active: true }]} />

        <AdminPageIntro
          eyebrow={<Button variant="ghost" className="-ml-3 gap-2" onClick={() => navigate('/app/admin/courses')}><ArrowLeft size={16} />返回课程管理</Button>}
          title={detail.classInfo.name}
          description={`课程是管理员维护系统结构的主入口。应从这里继续管理教师、成员、团队、项目、导入和文件，而不是把下游对象完全平铺到其它页面。`}
          badges={(
            <>
              <Badge variant="outline">班级码 {detail.classInfo.classCode}</Badge>
              <Badge variant="outline">成员 {detail.members.length}</Badge>
              <Badge variant="outline">团队 {detail.teams.length}</Badge>
              <Badge variant="outline">项目 {detail.projects.length}</Badge>
            </>
          )}
        />

        <AdminStatGrid
          columns="xl:grid-cols-4"
          items={[
            { label: '教师', value: detail.classInfo.teacherName || '未分配', hint: '课程负责人' },
            { label: '团队结构', value: detail.teams.length, hint: `${teamsWithProjects.filter((item) => item.projects.length > 0).length} 个团队已有项目` },
            { label: '结构异常', value: orphanTeams.length + unboundProjects.length, hint: `无队长团队 ${orphanTeams.length} · 未绑定团队项目 ${unboundProjects.length}`, tone: orphanTeams.length + unboundProjects.length > 0 ? 'danger' : 'success' },
            { label: '课程文件', value: files.length, hint: '可进入文件与存储继续查看物理目录' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminPanel title="课程结构总览" description="管理员应先看课程 → 团队 → 项目这条主线。">
            <div className="space-y-4">
              {teamsWithProjects.length ? teamsWithProjects.map(({ team, projects }) => (
                <div key={team.id} className="rounded-2xl border border-muted/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Users size={16} className="text-muted-foreground" />
                        {team.name}
                        {team.leaderName ? <Badge variant="outline">队长 {team.leaderName}</Badge> : <Badge variant="destructive">缺队长</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">组序 {team.groupOrder ?? '未设置'} · 成员 {team.memberCount}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/teams/${team.id}/overview`)}>团队详情</Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-l border-muted pl-4">
                    {projects.length ? projects.map((project) => (
                      <button
                        key={project.projectId}
                        type="button"
                        onClick={() => project.projectId && navigate(`/app/admin/projects/${project.projectId}/overview`)}
                        className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/30"
                      >
                        <div>
                          <div className="font-medium">{project.projectName || '未命名项目'}</div>
                          <div className="mt-1 text-xs text-muted-foreground">进度 {project.progress || 0}% · {project.projectStatus || '未知状态'}</div>
                        </div>
                        <FolderKanban size={15} className="text-muted-foreground" />
                      </button>
                    )) : <div className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">该团队尚未绑定项目</div>}
                  </div>
                </div>
              )) : <PageEmpty title="暂无团队结构" message="这门课程还没有团队，可先通过课程导入和团队管理建立结构。" icon={Users} />}

              {unboundProjects.length ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
                  <div className="font-medium text-red-600">未绑定团队的项目</div>
                  <div className="mt-2 space-y-2">
                    {unboundProjects.map((project) => (
                      <div key={project.projectId} className="flex items-center justify-between rounded-xl border border-red-100 bg-white px-3 py-3">
                        <div>
                          <div className="font-medium">{project.projectName || '未命名项目'}</div>
                          <div className="mt-1 text-xs text-muted-foreground">请在项目详情中补齐团队归属</div>
                        </div>
                        {project.projectId ? <Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/projects/${project.projectId}/overview`)}>处理</Button> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </AdminPanel>

          <div className="space-y-6">
            <AdminSidebarSection title="课程关系摘要">
              <AdminInfoRow label="课程教师" value={detail.classInfo.teacherName || '未分配'} tone={detail.classInfo.teacherName ? 'success' : 'danger'} />
              <AdminInfoRow label="成员数" value={detail.members.length} />
              <AdminInfoRow label="团队数" value={detail.teams.length} />
              <AdminInfoRow label="项目数" value={detail.projects.length} />
              <AdminInfoRow label="文件条目" value={files.length} />
            </AdminSidebarSection>
            <AdminSidebarSection title="快捷跳转">
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/app/admin/courses/${id}/members`)}>教师与成员</Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/app/admin/courses/${id}/import`)}>批量导入学生</Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/app/admin/storage')}>打开文件与存储</Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/app/admin/teams')}>进入团队管理</Button>
            </AdminSidebarSection>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => navigate(`/app/admin/courses/${id}/${value}`)} className="space-y-6">
          <TabsList variant="line" className="rounded-2xl border border-muted bg-white p-1">
            <TabsTrigger value="overview" className="rounded-xl px-4">概览</TabsTrigger>
            <TabsTrigger value="members" className="rounded-xl px-4">教师与成员</TabsTrigger>
            <TabsTrigger value="teams" className="rounded-xl px-4">团队</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-xl px-4">项目</TabsTrigger>
            <TabsTrigger value="assignments" className="rounded-xl px-4">作业摘要</TabsTrigger>
            <TabsTrigger value="import" className="rounded-xl px-4">导入</TabsTrigger>
            <TabsTrigger value="files" className="rounded-xl px-4">文件</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl px-4">审计</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminPanel title="课程基础信息" description="修改课程元信息和授课教师。">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2"><Label>课程名称</Label><Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>班级码</Label><Input value={form.classCode} onChange={(e) => setForm((v) => ({ ...v, classCode: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>授课教师</Label><Select value={form.teacherId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, teacherId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">未分配</SelectItem>{detail.teacherOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="md:col-span-2"><Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? '保存中...' : '保存课程信息'}</Button></div>
              </div>
            </AdminPanel>
          </TabsContent>

          <TabsContent value="members">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <AdminPanel title="添加课程成员" description="管理员可直接把用户拉入课程。">
                <div className="space-y-4">
                  <Select value={memberUserId || '__empty__'} onValueChange={(value) => setMemberUserId(value === '__empty__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="选择用户" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">请选择</SelectItem>
                      {memberCandidates.map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name} · {user.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">学生</SelectItem>
                      <SelectItem value="ASSISTANT">助教</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2" disabled={!memberUserId || addMemberM.isPending} onClick={() => addMemberM.mutate()}><Plus size={14} />添加到课程</Button>
                </div>
              </AdminPanel>

              <AdminPanel title="课程成员列表" description="课程管理是成员、团队和项目维护的上游。">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">姓名</th><th className="px-3 py-2">邮箱</th><th className="px-3 py-2">课程角色</th><th className="px-3 py-2">来源</th><th className="px-3 py-2 text-right">操作</th></tr></thead>
                    <tbody>
                      {detail.members.map((member) => (
                        <tr key={member.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 font-medium">{member.name}</td>
                          <td className="px-3 py-3 text-muted-foreground">{member.email}</td>
                          <td className="px-3 py-3"><Badge variant="outline">{member.classRole}</Badge></td>
                          <td className="px-3 py-3 text-muted-foreground">{member.joinedVia || '—'}</td>
                          <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" className="text-destructive" onClick={() => removeMemberM.mutate(member.userId)} disabled={removeMemberM.isPending}><Trash2 size={14} /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminPanel>
            </div>
          </TabsContent>

          <TabsContent value="teams"><RelationCards title="团队结构" empty="当前没有团队。" rows={teamsWithProjects.map(({ team, projects }) => ({ key: team.id, title: team.name, subtitle: `队长：${team.leaderName || '未设置'} · 成员 ${team.memberCount} · 项目 ${projects.length}`, href: `/app/admin/teams/${team.id}/overview` }))} /></TabsContent>
          <TabsContent value="projects"><RelationCards title="项目结构" empty="当前没有项目。" rows={detail.projects.map((project) => ({ key: project.projectId || Math.random(), title: project.projectName || '未命名项目', subtitle: `团队：${project.teamName || '未绑定'} · 进度 ${project.progress || 0}%`, href: project.projectId ? `/app/admin/projects/${project.projectId}/overview` : undefined }))} /></TabsContent>
          <TabsContent value="assignments"><RelationCards title="作业摘要" empty="当前没有作业。" rows={detail.assignments.map((assignment) => ({ key: assignment.id, title: assignment.title, subtitle: `截止：${assignment.dueDate || '未设置'} · 状态 ${assignment.status}`, href: undefined }))} /></TabsContent>
          <TabsContent value="import">
            <AdminPanel title="课程导入学生" description="按 模板下载 → 上传 → 预校验 → 执行导入 的流程处理。">
              <div className="space-y-4">
                <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="flex gap-2">
                  <Button variant="outline" disabled={!file || previewM.isPending} onClick={() => file && previewM.mutate(file)}>{previewM.isPending ? '预校验中...' : '预校验'}</Button>
                  <Button disabled={!file || !previewM.data || executeM.isPending} onClick={() => file && executeM.mutate(file)}>{executeM.isPending ? '导入中...' : '执行导入'}</Button>
                </div>
                {previewM.data ? <div className="rounded-2xl border p-4 text-sm text-muted-foreground">总行数 {previewM.data.totalRows} · 可导入 {previewM.data.readyRows} · 跳过 {previewM.data.skippedRows} · 新建账号 {previewM.data.createUserRows}</div> : null}
                {executeM.data ? <div className="rounded-2xl border p-4 text-sm text-muted-foreground">已导入 {executeM.data.importedRows} 行，创建账号 {executeM.data.createdUsersCount} 个。</div> : null}
                <RelationCards title="导入历史" empty="暂无导入记录。" rows={detail.importJobs.map((job) => ({ key: job.id, title: job.fileName || '导入文件', subtitle: `导入 ${job.importedRows || 0} · 跳过 ${job.skippedRows || 0} · ${job.createdAt}`, href: undefined }))} />
              </div>
            </AdminPanel>
          </TabsContent>
          <TabsContent value="files">
            <StorageWorkspace
              scopeType="COURSE"
              scopeId={id}
              title="课程文件 Explorer"
              description="课程根空间仅教师与管理员可写，学生只读；管理员可在这里像资源管理器一样维护课程文件夹结构。"
            />
          </TabsContent>
          <TabsContent value="audit"><AuditCards items={detail.audits} empty="当前课程暂无管理员审计记录。" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RelationCards({ title, empty, rows }: { title: string; empty: string; rows: { key: number; title: string; subtitle: string; href?: string }[] }) {
  const navigate = useNavigate();
  return (
    <AdminPanel title={title} description="以结构为主线打开下游对象。">
      {!rows.length ? <PageEmpty title={`暂无${title}`} message={empty} icon={FolderKanban} /> : <div className="space-y-3">{rows.map((row) => <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"><div><div className="font-medium">{row.title}</div><div className="mt-1 text-sm text-muted-foreground">{row.subtitle}</div></div>{row.href ? <Button size="sm" variant="outline" onClick={() => navigate(row.href!)}>打开</Button> : null}</div>)}</div>}
    </AdminPanel>
  );
}

function AuditCards({ items, empty }: { items: { id: number; actionType: string; detail?: string | null; adminName?: string | null; createdAt: string }[]; empty: string }) {
  return <AdminPanel title="管理员审计" description="所有管理员修改都应可追踪。">{!items.length ? <PageEmpty title="暂无审计" message={empty} icon={Users} /> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border px-4 py-3"><div className="font-medium">{item.actionType}</div><div className="mt-1 text-sm text-muted-foreground">{item.detail || '无附加说明'}</div><div className="mt-1 text-xs text-muted-foreground">{item.adminName || '管理员'} · {item.createdAt}</div></div>)}</div>}</AdminPanel>;
}
