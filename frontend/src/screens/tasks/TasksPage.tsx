import React from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TaskRecord } from '@/lib/types';

const statusLabel: Record<TaskRecord['status'], string> = {
  TODO: '待开始',
  IN_PROGRESS: '进行中',
  REVIEW: '待验收',
  DONE: '已完成',
};

const priorityLabel: Record<TaskRecord['priority'], string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export function TasksPage() {
  const api = useApi();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['任务']), []);

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => api.users() });

  const saveM = useMutation({
    mutationFn: (payload: { id?: number; data: any }) => api.saveTask(payload.data, payload.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await qc.invalidateQueries({ queryKey: ['projectDetail'] });
    },
  });

  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [title, setTitleText] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<TaskRecord['status']>('TODO');
  const [priority, setPriority] = React.useState<TaskRecord['priority']>('MEDIUM');
  const [assigneeId, setAssigneeId] = React.useState<number | null>(null);

  const canSubmit = !!projectId && !!title.trim();

  const reset = () => {
    setProjectId(null);
    setTitleText('');
    setDescription('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setAssigneeId(null);
  };

  const isLoading = tasksQ.isLoading || projectsQ.isLoading || usersQ.isLoading;
  if (isLoading) return <PageLoading label="正在加载任务…" />;
  if (tasksQ.isError) return <PageError title="任务加载失败" onRetry={() => tasksQ.refetch()} />;
  if (projectsQ.isError) return <PageError title="项目加载失败" onRetry={() => projectsQ.refetch()} />;
  if (usersQ.isError) return <PageError title="用户加载失败" onRetry={() => usersQ.refetch()} />;

  const tasks = tasksQ.data || [];
  const projects = projectsQ.data || [];
  const users = usersQ.data || [];

  return (
    <div>
      <PageHero
        title="任务"
        subtitle="跨项目查看并推进你的待办。建议先从“待开始/进行中”入手。"
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) reset();
            }}
          >
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus size={16} /> 新建任务
            </DialogTrigger>
            <DialogContent className="max-w-[720px]">
              <DialogHeader>
                <DialogTitle>新建任务</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>所属项目</Label>
                  <Select value={projectId ? String(projectId) : ''} onValueChange={(v) => setProjectId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}（{p.courseName}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>标题</Label>
                  <Input value={title} onChange={(e) => setTitleText(e.target.value)} placeholder="用动词开头更清晰，例如：完成需求拆分 / 搭建接口联调" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>描述</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="补充验收标准、相关链接、注意事项…" className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabel[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                        <SelectItem key={p} value={p}>
                          {priorityLabel[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>指派给（可选）</Label>
                  <Select value={assigneeId ? String(assigneeId) : ''} onValueChange={(v) => setAssigneeId(v ? Number(v) : null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="不指定" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}（{u.email}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saveM.isPending}>
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (!canSubmit) return;
                    await saveM.mutateAsync({
                      data: {
                        projectId: projectId!,
                        title: title.trim(),
                        description,
                        status,
                        priority,
                        assigneeId: assigneeId || undefined,
                      },
                    });
                    setOpen(false);
                    reset();
                  }}
                  disabled={!canSubmit || saveM.isPending}
                >
                  {saveM.isPending ? '正在创建…' : '创建任务'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto">
          {!tasks.length ? (
            <PageEmpty
              title="还没有任务"
              message="从一个小任务开始：拆分里程碑、明确验收标准，让项目更可控。"
              icon={CheckSquare}
              action={
                <Button className="gap-2" onClick={() => setOpen(true)}>
                  <Plus size={16} /> 新建任务
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {tasks.map((t) => (
                <Card key={t.id} className="border-muted/70 hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{t.title}</CardTitle>
                        <div className="mt-1 text-sm text-muted-foreground truncate">{t.projectName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          {statusLabel[t.status]}
                        </Badge>
                        <Badge variant={t.priority === 'HIGH' ? 'default' : 'secondary'} className="text-[11px]">
                          {priorityLabel[t.priority]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    <div className="text-muted-foreground line-clamp-2">{t.description || '—'}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>负责人：{t.assigneeName || '未指派'}</span>
                      <span>截止：{t.dueDate || '未设置'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

