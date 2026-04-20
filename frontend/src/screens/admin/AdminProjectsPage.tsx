import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle, FolderKanban, Search, Trash2, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminProjectSummary } from '@/lib/types';

const typeLabels: Record<string, string> = { CODE: '代码项目', NON_CODE: '非代码项目' };
const typeAllLabels: Record<string, string> = { ALL: '全部类型', CODE: '代码项目', NON_CODE: '非代码项目' };
const statusColors: Record<string, string> = {
  ACTIVE: 'border-primary/15 bg-primary/5 text-primary',
  COMPLETED: 'border-green-500/15 bg-green-500/5 text-green-600',
  ARCHIVED: 'border-muted bg-muted/30 text-muted-foreground',
};
const statusLabels: Record<string, string> = { ACTIVE: '进行中', COMPLETED: '已完成', ARCHIVED: '已归档' };
const statusAllLabels: Record<string, string> = { ALL: '全部状态', ACTIVE: '进行中', COMPLETED: '已完成', ARCHIVED: '已归档' };

export function AdminProjectsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProjectSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '项目管理']); }, []);

  const q = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });

  const updateStatusM = useMutation({
    mutationFn: ({ projectId, status }: { projectId: number; status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' }) =>
      api.updateProjectStatus(projectId, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminProjects'] });
      setFeedback({ type: 'success', msg: '项目状态已更新' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '更新失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deleteM = useMutation({
    mutationFn: (projectId: number) => api.deleteProject(projectId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminProjects'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '项目已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载项目列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const filtered = (q.data || []).filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.courseName?.toLowerCase().includes(search.toLowerCase()) || p.teamName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchType = typeFilter === 'ALL' || p.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div>
      <PageHero
        title="项目管理"
        subtitle={`共 ${q.data?.length || 0} 个项目，可更新状态或删除。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索项目名称、课程、团队..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} itemToStringLabel={v => statusAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">进行中</SelectItem>
                <SelectItem value="COMPLETED">已完成</SelectItem>
                <SelectItem value="ARCHIVED">已归档</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter} itemToStringLabel={v => typeAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                <SelectItem value="CODE">代码项目</SelectItem>
                <SelectItem value="NON_CODE">非代码项目</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />{feedback.msg}
            </div>
          )}

          {!filtered.length ? (
            <PageEmpty title="无匹配项目" message="请尝试调整搜索条件或筛选。" icon={FolderKanban} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((p) => (
                <Card key={p.id} className="border-muted/70 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">{p.courseName} · {p.teamName}</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{typeLabels[p.type] || p.type}</Badge>
                      <Badge variant="outline" className={statusColors[p.status] || ''}>{statusLabels[p.status] || p.status}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>进度</span><span>{p.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">创建于 {p.createdAt || '未知'}</div>
                    <div className="flex gap-2 pt-1">
                      <Select value={p.status} onValueChange={(v) => updateStatusM.mutate({ projectId: p.id, status: v as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' })} itemToStringLabel={v => statusLabels[v] ?? v}
                        disabled={updateStatusM.isPending}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">进行中</SelectItem>
                          <SelectItem value="COMPLETED">已完成</SelectItem>
                          <SelectItem value="ARCHIVED">已归档</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1.5 ml-auto"
                        onClick={() => setDeleteTarget(p)}>
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

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除项目</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除项目 <strong>{deleteTarget?.name}</strong> 吗？相关的任务、讨论、文档等数据也将被清除，此操作不可恢复。
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
