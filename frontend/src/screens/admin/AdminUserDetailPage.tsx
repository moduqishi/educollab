import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, FolderKanban, GraduationCap, KeyRound, Shield, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

export function AdminUserDetailPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { userId } = useParams();
  const id = Number(userId);

  const [form, setForm] = React.useState({ name: '', email: '', role: 'STUDENT', active: true });
  const [courseForm, setCourseForm] = React.useState({ courseId: '', role: 'STUDENT' });
  const [teamId, setTeamId] = React.useState('');
  const [projectId, setProjectId] = React.useState('');

  const detailQ = useQuery({ queryKey: ['adminUserDetail', id], queryFn: () => api.adminUserDetail(id), enabled: !!id });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const teamsQ = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  const projectsQ = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });

  const invalidateAll = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['adminUserDetail', id] }),
      qc.invalidateQueries({ queryKey: ['adminUsers'] }),
      qc.invalidateQueries({ queryKey: ['adminCourses'] }),
      qc.invalidateQueries({ queryKey: ['adminTeams'] }),
      qc.invalidateQueries({ queryKey: ['adminProjects'] }),
    ]);
  }, [id, qc]);

  const saveM = useMutation({
    mutationFn: () => api.updateAdminUser(id, form as any),
    onSuccess: invalidateAll,
  });
  const resetM = useMutation({ mutationFn: () => api.resetAdminUserPassword(id) });
  const addCourseM = useMutation({
    mutationFn: () => api.addUserCourseMembership(id, { courseId: Number(courseForm.courseId), role: courseForm.role }),
    onSuccess: async () => {
      setCourseForm({ courseId: '', role: 'STUDENT' });
      await invalidateAll();
    },
  });
  const removeCourseM = useMutation({ mutationFn: (courseIdValue: number) => api.removeUserCourseMembership(id, courseIdValue), onSuccess: invalidateAll });
  const addTeamM = useMutation({
    mutationFn: () => api.addUserTeamMembership(id, { teamId: Number(teamId) }),
    onSuccess: async () => {
      setTeamId('');
      await invalidateAll();
    },
  });
  const removeTeamM = useMutation({ mutationFn: (teamIdValue: number) => api.removeUserTeamMembership(id, teamIdValue), onSuccess: invalidateAll });
  const addProjectM = useMutation({
    mutationFn: () => api.addUserProjectMembership(id, { projectId: Number(projectId) }),
    onSuccess: async () => {
      setProjectId('');
      await invalidateAll();
    },
  });
  const removeProjectM = useMutation({ mutationFn: (projectIdValue: number) => api.removeUserProjectMembership(id, projectIdValue), onSuccess: invalidateAll });

  React.useEffect(() => {
    if (detailQ.data?.user) {
      setTitle(['系统管理', detailQ.data.user.name]);
      setForm({
        name: detailQ.data.user.name,
        email: detailQ.data.user.email,
        role: detailQ.data.user.role,
        active: detailQ.data.user.active !== false,
      });
    }
  }, [detailQ.data]);

  if (detailQ.isLoading || coursesQ.isLoading || teamsQ.isLoading || projectsQ.isLoading) {
    return <PageLoading label="正在加载用户详情..." />;
  }
  if (detailQ.isError || coursesQ.isError || teamsQ.isError || projectsQ.isError || !detailQ.data) {
    return <PageError onRetry={() => { void detailQ.refetch(); void coursesQ.refetch(); void teamsQ.refetch(); void projectsQ.refetch(); }} title="用户详情加载失败" />;
  }

  const detail = detailQ.data;
  const courseOptions = (coursesQ.data || []).filter((item) => !detail.courses.some((course) => course.id === item.id));
  const teamOptions = (teamsQ.data || []).filter((item) => !detail.teams.some((team) => team.id === item.id));
  const projectOptions = (projectsQ.data || []).filter((item) => !detail.projects.some((project) => project.id === item.id));

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2 -ml-3 gap-2" onClick={() => nav('/app/admin/users')}>
              <ArrowLeft size={16} />返回用户管理
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={16} />账号与关系管理
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{detail.user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{detail.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{detail.user.role}</Badge>
            <Badge variant={detail.user.active === false ? 'secondary' : 'default'}>{detail.user.active === false ? '已停用' : '正常'}</Badge>
            <Badge variant="outline">课程 {detail.user.courseCount || 0}</Badge>
            <Badge variant="outline">团队 {detail.user.teamCount || 0}</Badge>
            <Badge variant="outline">项目 {detail.user.projectCount || 0}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">账号基础信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5"><Label>姓名</Label><Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>邮箱</Label><Input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <Label>角色</Label>
                  <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">学生</SelectItem>
                      <SelectItem value="TEACHER">教师</SelectItem>
                      <SelectItem value="ADMIN">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>账号状态</Label>
                  <Select value={form.active ? 'ACTIVE' : 'INACTIVE'} onValueChange={(value) => setForm((current) => ({ ...current, active: value === 'ACTIVE' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">正常</SelectItem>
                      <SelectItem value="INACTIVE">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? '保存中...' : '保存修改'}</Button>
                <Button variant="outline" className="gap-2" onClick={() => resetM.mutate()} disabled={resetM.isPending}><KeyRound size={14} />重置密码为 Password123!</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">关系维护面板</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 font-medium"><GraduationCap size={16} />加入课程</div>
                <div className="space-y-3">
                  <Select value={courseForm.courseId || '__empty__'} onValueChange={(value) => setCourseForm((current) => ({ ...current, courseId: value === '__empty__' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="选择课程" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">请选择课程</SelectItem>
                      {courseOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={courseForm.role} onValueChange={(value) => setCourseForm((current) => ({ ...current, role: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">学生</SelectItem>
                      <SelectItem value="TEACHER">教师</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" disabled={!courseForm.courseId || addCourseM.isPending} onClick={() => addCourseM.mutate()}>{addCourseM.isPending ? '处理中...' : '加入课程'}</Button>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 font-medium"><Users size={16} />加入团队</div>
                <div className="space-y-3">
                  <Select value={teamId || '__empty__'} onValueChange={(value) => setTeamId(value === '__empty__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="选择团队" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">请选择团队</SelectItem>
                      {teamOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">团队成员变更会同步影响课程组队与项目归属。</div>
                  <Button className="w-full" disabled={!teamId || addTeamM.isPending} onClick={() => addTeamM.mutate()}>{addTeamM.isPending ? '处理中...' : '加入团队'}</Button>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 font-medium"><FolderKanban size={16} />加入项目</div>
                <div className="space-y-3">
                  <Select value={projectId || '__empty__'} onValueChange={(value) => setProjectId(value === '__empty__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="选择项目" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">请选择项目</SelectItem>
                      {projectOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">项目成员仅用于维护参与关系，不替代项目内具体任务分工。</div>
                  <Button className="w-full" disabled={!projectId || addProjectM.isPending} onClick={() => addProjectM.mutate()}>{addProjectM.isPending ? '处理中...' : '加入项目'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <RelationCard
            title="所在课程"
            icon={GraduationCap}
            empty="当前未加入课程"
            rows={detail.courses.map((item) => ({
              key: item.id,
              title: item.name,
              subtitle: item.classCode,
              href: `/app/admin/courses/${item.id}/overview`,
              onRemove: () => removeCourseM.mutate(item.id),
              removing: removeCourseM.isPending,
            }))}
          />
          <RelationCard
            title="所在团队"
            icon={Users}
            empty="当前未加入团队"
            rows={detail.teams.map((item) => ({
              key: item.id,
              title: item.name,
              subtitle: item.courseName || '未关联课程',
              href: `/app/admin/teams/${item.id}/overview`,
              onRemove: () => removeTeamM.mutate(item.id),
              removing: removeTeamM.isPending,
            }))}
          />
          <RelationCard
            title="参与项目"
            icon={FolderKanban}
            empty="当前未参与项目"
            rows={detail.projects.map((item) => ({
              key: item.id,
              title: item.name,
              subtitle: `${item.courseName || '未关联课程'} · ${item.status}`,
              href: `/app/admin/projects/${item.id}/overview`,
              onRemove: () => removeProjectM.mutate(item.id),
              removing: removeProjectM.isPending,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">最近活跃与系统通知</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">最近项目行为</div>
                <div className="space-y-2">
                  {!detail.recentActivity.length ? <PageEmpty title="暂无行为" message="最近没有记录到项目活动。" icon={Users} /> : detail.recentActivity.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border px-3 py-3 text-sm">
                      <div className="font-medium">{item.eventType}</div>
                      <div className="mt-1 text-muted-foreground">{item.targetTitle || item.projectName || '项目行为'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.occurredAt}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><BellRing size={14} />最近通知</div>
                <div className="space-y-2">
                  {!detail.recentNotifications.length ? <PageEmpty title="暂无通知" message="该用户最近没有系统通知。" icon={BellRing} /> : detail.recentNotifications.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border px-3 py-3 text-sm">
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 line-clamp-2 text-muted-foreground">{item.content}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.createdAt}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Shield size={16} />管理员审计与作业摘要</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium">最近管理员操作</div>
                <div className="space-y-2">
                  {!detail.audits.length ? <PageEmpty title="暂无审计记录" message="还没有管理员修改过这个用户。" icon={Shield} /> : detail.audits.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl border px-3 py-3 text-sm">
                      <div className="font-medium">{item.actionType}</div>
                      <div className="mt-1 text-muted-foreground">{item.detail || '无附加说明'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.adminName || '管理员'} · {item.createdAt}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">最近作业提交</div>
                {!detail.submissions.length ? <div className="rounded-2xl border px-3 py-3 text-sm text-muted-foreground">当前没有作业提交记录。</div> : (
                  <div className="space-y-2">
                    {detail.submissions.slice(0, 6).map((item) => (
                      <div key={item.submissionId} className="rounded-2xl border px-3 py-3 text-sm">
                        <div className="font-medium">{item.assignmentTitle}</div>
                        <div className="mt-1 text-muted-foreground">状态 {item.status}{item.score != null ? ` · ${item.score} 分` : ''}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.submittedAt || '未提交时间'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RelationCard({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  empty: string;
  rows: { key: number; title: string; subtitle: string; href: string; onRemove: () => void; removing: boolean }[];
}) {
  const nav = useNavigate();

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Icon size={16} />{title}</CardTitle></CardHeader>
      <CardContent>
        {!rows.length ? (
          <div className="text-sm text-muted-foreground">{empty}</div>
        ) : (
          <div className="space-y-2">
            {rows.map((item) => (
              <div key={item.key} className="rounded-2xl border px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => nav(item.href)}>打开</Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={item.onRemove} disabled={item.removing}>移除</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
