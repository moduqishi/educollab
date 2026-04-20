import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ClipboardCheck, Search, Trash2, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminAssignmentSummary } from '@/lib/types';

export function AdminAssignmentsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminAssignmentSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '作业管理']); }, []);

  const q = useQuery({ queryKey: ['adminAssignments'], queryFn: () => api.adminAssignments() });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.deleteAssignment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminAssignments'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '作业已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载作业列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const filtered = (q.data || []).filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHero
        title="作业管理"
        subtitle={`共 ${q.data?.length || 0} 项作业，可删除。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索作业标题或课程..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />{feedback.msg}
            </div>
          )}

          {!filtered.length ? (
            <PageEmpty title="无匹配作业" message="请尝试调整搜索条件。" icon={ClipboardCheck} />
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <Card key={a.id} className="border-muted/70 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{a.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>课程：{a.courseName || '未知'}</span>
                          {a.dueDate && <span>截止：{a.dueDate}</span>}
                          <span>提交：{a.totalSubmissions} 份</span>
                          <span>已批改：{a.gradedSubmissions} 份</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">创建于 {a.createdAt || '未知'}</div>
                      </div>
                      <div className="flex shrink-0">
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1.5"
                          onClick={() => setDeleteTarget(a)}>
                          <Trash2 size={13} />删除
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除作业</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除作业 <strong>{deleteTarget?.title}</strong> 吗？相关的提交记录也将被清除，此操作不可恢复。
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
