import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminCourseSummary } from '@/lib/types';
import { AdminPageIntro, AdminPanel, AdminStatGrid } from './admin-layout';

export function AdminCoursesPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCourseSummary | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', classCode: '', teacherId: '' });

  React.useEffect(() => setTitle(['系统管理', '课程管理']), []);

  const q = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const usersQ = useQuery({ queryKey: ['adminUsers'], queryFn: () => api.adminUsers() });

  const createM = useMutation({
    mutationFn: () => api.createAdminCourse({ name: form.name, classCode: form.classCode || undefined, teacherId: form.teacherId ? Number(form.teacherId) : null }),
    onSuccess: async () => {
      setOpen(false);
      setForm({ name: '', classCode: '', teacherId: '' });
      await qc.invalidateQueries({ queryKey: ['adminCourses'] });
    },
  });

  const deleteM = useMutation({
    mutationFn: (courseId: number) => api.deleteCourse(courseId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminCourses'] });
      setDeleteTarget(null);
    },
  });

  if (q.isLoading || usersQ.isLoading) return <PageLoading label="正在加载课程管理数据..." />;
  if (q.isError || usersQ.isError) return <PageError onRetry={() => { void q.refetch(); void usersQ.refetch(); }} title="课程列表加载失败" />;

  const rows = (q.data || []).filter((item) => {
    const keyword = search.trim().toLowerCase();
    return !keyword || item.name.toLowerCase().includes(keyword) || item.classCode.toLowerCase().includes(keyword) || (item.teacherName || '').toLowerCase().includes(keyword);
  });

  const totalMembers = rows.reduce((sum, item) => sum + item.memberCount, 0);
  const missingTeachers = rows.filter((item) => !item.teacherName).length;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <AdminPageIntro
          eyebrow="管理员后台 / 结构主入口"
          title="课程管理"
          description="课程是管理员维护系统结构的主对象。应先进入课程，再继续管理成员、团队、项目、导入和课程文件，而不是把所有对象完全平铺处理。"
          actions={<Button className="gap-2" onClick={() => setOpen(true)}><Plus size={14} />新建课程</Button>}
          badges={<><Badge variant="outline">课程 {q.data?.length || 0}</Badge><Badge variant="outline">成员 {totalMembers}</Badge></>}
        />

        <AdminStatGrid
          items={[
            { label: '课程总数', value: q.data?.length || 0, hint: '管理员结构主入口' },
            { label: '课程成员总量', value: totalMembers, hint: '所有课程内成员数量汇总' },
            { label: '未分配教师课程', value: missingTeachers, hint: '应优先补齐课程教师', tone: missingTeachers > 0 ? 'danger' : 'success' },
            { label: '主链路', value: '课程 → 团队 → 项目', hint: '详情页里继续往下管理' },
          ]}
        />

        <AdminPanel title="筛选与检索" description="按课程名、班级码或教师定位课程。">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="搜索课程名、班级码、教师..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </AdminPanel>

        <AdminPanel title="课程列表" description="每条课程记录都应能继续钻取到成员、团队、项目与导入流程。">
          {!rows.length ? (
            <PageEmpty title="没有匹配课程" message="请调整检索条件后再试。" icon={BookOpen} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-3 font-medium">课程</th>
                    <th className="px-3 py-3 font-medium">教师</th>
                    <th className="px-3 py-3 font-medium">结构规模</th>
                    <th className="px-3 py-3 font-medium">课程下游</th>
                    <th className="px-3 py-3 font-medium">创建时间</th>
                    <th className="px-3 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((course) => (
                    <tr key={course.id} className="border-b last:border-b-0 align-top">
                      <td className="px-3 py-3">
                        <div className="font-medium">{course.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">班级码 {course.classCode}</div>
                      </td>
                      <td className="px-3 py-3">
                        {course.teacherName ? <Badge variant="outline">{course.teacherName}</Badge> : <Badge variant="destructive">未分配教师</Badge>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>学生 {course.memberCount}</div>
                        <div className="text-xs">团队 {course.teamCount || 0} · 项目 {course.projectCount || 0} · 作业 {course.assignmentCount || 0}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        <div>进入课程详情后继续管理团队和项目结构</div>
                        <div className="text-xs">支持成员维护、批量导入、课程文件和审计</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{course.createdAt}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/courses/${course.id}/overview`)}>结构详情</Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/courses/${course.id}/import`)}>导入</Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(course)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>新建课程</DialogTitle></DialogHeader><div className="grid grid-cols-1 gap-4 py-2"><div className="space-y-1.5"><Label>课程名称</Label><Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></div><div className="space-y-1.5"><Label>班级码（可选）</Label><Input value={form.classCode} onChange={(e) => setForm((v) => ({ ...v, classCode: e.target.value }))} /></div><div className="space-y-1.5"><Label>授课教师</Label><Select value={form.teacherId || '__none__'} onValueChange={(value) => setForm((v) => ({ ...v, teacherId: value === '__none__' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">暂不分配</SelectItem>{(usersQ.data || []).filter((user) => user.role === 'TEACHER' || user.role === 'ADMIN').map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button disabled={!form.name.trim() || createM.isPending} onClick={() => createM.mutate()}>{createM.isPending ? '创建中...' : '创建课程'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除课程</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">确定删除课程 <strong>{deleteTarget?.name}</strong> 吗？课程成员、团队、项目与作业等关联数据也会受到影响。</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button><Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)} disabled={deleteM.isPending}>{deleteM.isPending ? '删除中...' : '确认删除'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
