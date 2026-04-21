import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, CheckSquare, Edit2, Search, Trash2, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminTaskSummary } from '@/lib/types';

const statusColors: Record<string, string> = {
  TODO: 'border-muted bg-muted/30 text-muted-foreground',
  IN_PROGRESS: 'border-primary/15 bg-primary/5 text-primary',
  REVIEW: 'border-yellow-500/15 bg-yellow-500/5 text-yellow-600',
  DONE: 'border-green-500/15 bg-green-500/5 text-green-600',
};
const statusLabels: Record<string, string> = { TODO: '待办', IN_PROGRESS: '进行中', REVIEW: '审核中', DONE: '已完成' };
const statusAllLabels: Record<string, string> = { ALL: '全部状态', TODO: '待办', IN_PROGRESS: '进行中', REVIEW: '审核中', DONE: '已完成' };
const priorityLabels: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高' };
const priorityAllLabels: Record<string, string> = { ALL: '全部优先级', LOW: '低', MEDIUM: '中', HIGH: '高' };
const priorityColors: Record<string, string> = { LOW: 'text-muted-foreground', MEDIUM: 'text-yellow-600', HIGH: 'text-red-500' };

export function AdminTasksPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('ALL');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editTarget, setEditTarget] = React.useState<AdminTaskSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminTaskSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '任务管理']); }, []);

  const q = useQuery({ queryKey: ['adminTasks'], queryFn: () => api.adminTasks() });
  const usersQ = useQuery({ queryKey: ['adminUsers'], queryFn: () => api.adminUsers() });

  const saveM = useMutation({
    mutationFn: (payload: Parameters<typeof api.adminSaveTask>[0]) => api.adminSaveTask(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminTasks'] });
      setEditTarget(null);
      setFeedback({ type: 'success', msg: '任务更新成功' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '任务更新失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deleteM = useMutation({
    mutationFn: (taskId: number) => api.deleteTask(taskId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminTasks'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '任务已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载任务列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const filtered = (q.data || []).filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.projectName?.toLowerCase().includes(search.toLowerCase()) || t.assigneeName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div>
      <PageHero
        title="任务管理"
        subtitle={`共 ${q.data?.length || 0} 个任务，可编辑或删除。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索任务名称、项目、负责人..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} itemToStringLabel={v => statusAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="TODO">待办</SelectItem>
                <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                <SelectItem value="REVIEW">审核中</SelectItem>
                <SelectItem value="DONE">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter} itemToStringLabel={v => priorityAllLabels[v] ?? v}>
              <SelectTrigger className="w-28"><SelectValue placeholder="优先级" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部优先级</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />{feedback.msg}
            </div>
          )}

          {!filtered.length ? (
            <PageEmpty title="无匹配任务" message="请尝试调整搜索条件或筛选。" icon={CheckSquare} />
          ) : (
            <div className="space-y-3">
              {filtered.map((task) => (
                <Card key={task.id} className="border-muted/70 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{task.title}</span>
                          <Badge variant="outline" className={statusColors[task.status] || ''}>{statusLabels[task.status] || task.status}</Badge>
                          <span className={`text-xs font-medium ${priorityColors[task.priority] || ''}`}>[{priorityLabels[task.priority] || task.priority}优先级]</span>
                        </div>
                        {task.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>项目：{task.projectName || '未分配'}</span>
                          <span>负责人：{task.assigneeName || '未分配'}</span>
                          {task.dueDate && <span>截止：{task.dueDate}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="icon" variant="ghost" className="hover:text-primary" onClick={() => setEditTarget(task)} title="编辑任务">
                          <Edit2 size={15} />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(task)} title="删除任务">
                          <Trash2 size={15} />
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

      {/* Edit dialog */}
      <TaskEditDialog
        task={editTarget}
        users={usersQ.data || []}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        onSave={(payload) => editTarget && saveM.mutate({ taskId: editTarget.id, ...payload } as Parameters<typeof api.adminSaveTask>[0])}
        saving={saveM.isPending}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除任务</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除任务 <strong>{deleteTarget?.title}</strong> 吗？此操作不可恢复。
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

function TaskEditDialog({ task, users, open, onOpenChange, onSave, saving }: {
  task: AdminTaskSummary | null;
  users: { id: number; name: string; email: string }[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (payload: { title?: string; description?: string; status?: string; priority?: string; assigneeId?: number; dueDate?: string }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('');
  const [assigneeId, setAssigneeId] = React.useState<number | undefined>();
  const [dueDate, setDueDate] = React.useState('');

  React.useEffect(() => {
    if (task) {
      setTitle(task.title); setDescription(task.description || '');
      setStatus(task.status); setPriority(task.priority);
      setDueDate(task.dueDate || '');
    }
  }, [task]);

  const handleSave = () => {
    onSave({
      title: title !== task?.title ? title : undefined,
      description: description !== (task?.description || '') ? description : undefined,
      status: status !== task?.status ? status : undefined,
      priority: priority !== task?.priority ? priority : undefined,
      dueDate: dueDate !== (task?.dueDate || '') ? dueDate : undefined,
      assigneeId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>编辑任务</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>任务标题</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>描述</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={status} onValueChange={setStatus} itemToStringLabel={v => statusLabels[v] ?? v}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">待办</SelectItem>
                  <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                  <SelectItem value="REVIEW">审核中</SelectItem>
                  <SelectItem value="DONE">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Select value={priority} onValueChange={setPriority} itemToStringLabel={v => priorityLabels[v] ?? v}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>负责人</Label>
              <Select value={String(assigneeId || '')} onValueChange={v => setAssigneeId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="选择负责人" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>截止日期</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
