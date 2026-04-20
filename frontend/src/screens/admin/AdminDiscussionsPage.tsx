import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Lock, MessageSquare, Search, Trash2, Unlock, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminDiscussionSummary } from '@/lib/types';

const categoryLabels: Record<string, string> = { GENERAL: '综合', QUESTION: '提问', IDEA: '想法' };
const categoryAllLabels: Record<string, string> = { ALL: '全部分类', GENERAL: '综合', QUESTION: '提问', IDEA: '想法' };
const statusLabels: Record<string, string> = { OPEN: '开放', CLOSED: '已关闭' };
const statusAllLabels: Record<string, string> = { ALL: '全部状态', OPEN: '开放', CLOSED: '已关闭' };

export function AdminDiscussionsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminDiscussionSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '讨论管理']); }, []);

  const q = useQuery({ queryKey: ['adminDiscussions'], queryFn: () => api.adminDiscussions() });

  const toggleStatusM = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'OPEN' | 'CLOSED' }) =>
      api.updateDiscussionStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminDiscussions'] });
      setFeedback({ type: 'success', msg: '讨论状态已更新' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '更新失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.deleteDiscussion(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminDiscussions'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '讨论已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载讨论列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const filtered = (q.data || []).filter(d => {
    const matchSearch = !search || d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.projectName?.toLowerCase().includes(search.toLowerCase()) || d.authorName?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div>
      <PageHero
        title="讨论管理"
        subtitle={`共 ${q.data?.length || 0} 条讨论，可关闭或删除。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索标题、项目、作者..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter} itemToStringLabel={v => categoryAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="分类" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部分类</SelectItem>
                <SelectItem value="GENERAL">综合</SelectItem>
                <SelectItem value="QUESTION">提问</SelectItem>
                <SelectItem value="IDEA">想法</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter} itemToStringLabel={v => statusAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="OPEN">开放</SelectItem>
                <SelectItem value="CLOSED">已关闭</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />{feedback.msg}
            </div>
          )}

          {!filtered.length ? (
            <PageEmpty title="无匹配讨论" message="请尝试调整搜索条件或筛选。" icon={MessageSquare} />
          ) : (
            <div className="space-y-3">
              {filtered.map((d) => (
                <Card key={d.id} className="border-muted/70 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{d.title}</span>
                          <Badge variant="outline">{categoryLabels[d.category] || d.category}</Badge>
                          <Badge variant="outline">{statusLabels[d.status] || d.status}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>项目：{d.projectName || '未知'}</span>
                          <span>作者：{d.authorName || '未知'}</span>
                          <span>回复数：{d.replyCount}</span>
                          <span>创建于 {d.createdAt || '未知'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm" variant="outline" className="gap-1.5"
                          onClick={() => toggleStatusM.mutate({ id: d.id, status: d.status === 'OPEN' ? 'CLOSED' : 'OPEN' })}
                          disabled={toggleStatusM.isPending}
                          title={d.status === 'OPEN' ? '关闭讨论' : '开放讨论'}>
                          {d.status === 'OPEN' ? <Lock size={13} /> : <Unlock size={13} />}
                          {d.status === 'OPEN' ? '关闭' : '开放'}
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1.5"
                          onClick={() => setDeleteTarget(d)}>
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
          <DialogHeader><DialogTitle>确认删除讨论</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除讨论 <strong>{deleteTarget?.title}</strong> 吗？相关的回复也将被清除，此操作不可恢复。
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
