import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Edit2, GraduationCap, Search, Trash2, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminCourseSummary } from '@/lib/types';

export function AdminCoursesPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editTarget, setEditTarget] = React.useState<AdminCourseSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCourseSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '课程管理']); }, []);

  const q = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });

  const saveM = useMutation({
    mutationFn: ({ courseId, name, classCode }: { courseId: number; name: string; classCode: string }) =>
      api.updateCourse(courseId, name, classCode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminCourses'] });
      setEditTarget(null);
      setFeedback({ type: 'success', msg: '课程更新成功' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '课程更新失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deleteM = useMutation({
    mutationFn: (courseId: number) => api.deleteCourse(courseId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminCourses'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '课程已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载课程列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const filtered = (q.data || []).filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.classCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHero
        title="课程管理"
        subtitle={`共 ${q.data?.length || 0} 门课程，可编辑或删除。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索课程名称或班级码..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />{feedback.msg}
            </div>
          )}

          {!filtered.length ? (
            <PageEmpty title="无匹配课程" message="请尝试调整搜索条件。" icon={BookOpen} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <Card key={course.id} className="border-muted/70 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2 text-base">
                      <span className="truncate">{course.name}</span>
                      <Badge variant="outline" className="shrink-0">{course.memberCount} 人</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">教师：</span>
                      <span className="font-medium truncate">{course.teacherName || '未分配'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">班级码：</span>
                      <span className="font-mono text-xs">{course.classCode}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">创建于 {course.createdAt || '未知'}</div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setEditTarget(course)}>
                        <Edit2 size={13} />编辑
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1.5"
                        onClick={() => setDeleteTarget(course)}>
                        <Trash2 size={13} />删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <CourseEditDialog
        course={editTarget}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        onSave={(name, classCode) => editTarget && saveM.mutate({ courseId: editTarget.id, name, classCode })}
        saving={saveM.isPending}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除课程</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除课程 <strong>{deleteTarget?.name}</strong> 吗？相关班级成员、作业等信息也会被清除，此操作不可恢复。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)} disabled={deleteM.isPending}>
              {deleteM.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseEditDialog({ course, open, onOpenChange, onSave, saving }: {
  course: AdminCourseSummary | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (name: string, classCode: string) => void;
  saving: boolean;
}) {
  const [name, setName] = React.useState('');
  const [classCode, setClassCode] = React.useState('');

  React.useEffect(() => {
    if (course) { setName(course.name); setClassCode(course.classCode); }
  }, [course]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>编辑课程</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>课程名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="例如：软件工程" />
          </div>
          <div className="space-y-1.5">
            <Label>班级码</Label>
            <Input value={classCode} onChange={e => setClassCode(e.target.value)} placeholder="例如：SE2026" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => onSave(name, classCode)} disabled={saving || !name.trim() || !classCode.trim()}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
