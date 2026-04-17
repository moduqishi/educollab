import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link2, MoreVertical, Paperclip, Plus, Send } from 'lucide-react';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categoryLabel: Record<string, string> = {
  GENERAL: '综合讨论',
  HELP_NEEDED: '需要帮助',
  TASK_ASSIGNMENT: '任务分工',
  BUG_REPORT: '问题反馈',
  RESOURCES: '资料共享',
};

export function ProjectDiscussionDetailPage() {
  const api = useApi();
  const nav = useNavigate();
  const { postId } = useParams();
  const { detail: projectDetail, refresh } = useProjectDetail();
  const id = Number(postId);

  const q = useQuery({
    queryKey: ['discussionDetail', id],
    enabled: !!id,
    queryFn: () => api.discussionDetail(id),
  });

  React.useEffect(() => {
    if (q.data) setTitle([projectDetail.project.name, '讨论', q.data.title]);
  }, [projectDetail.project.name, q.data?.title]);

  const updateM = useMutation({
    mutationFn: (payload: { status?: string; category?: string }) => api.updateDiscussion(id, payload),
    onSuccess: async () => {
      await q.refetch();
      await refresh();
    },
  });

  const replyM = useMutation({
    mutationFn: (content: string) => api.replyDiscussion(id, content),
    onSuccess: async () => {
      await q.refetch();
      await refresh();
    },
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => api.uploadFile('DISCUSSION_POST', id, file),
    onSuccess: async () => {
      await q.refetch();
    },
  });

  const linkM = useMutation({
    mutationFn: (taskId: number) => api.linkDiscussionTask(id, taskId),
    onSuccess: async () => {
      await q.refetch();
      await refresh();
    },
  });
  const unlinkM = useMutation({
    mutationFn: (taskId: number) => api.unlinkDiscussionTask(id, taskId),
    onSuccess: async () => {
      await q.refetch();
      await refresh();
    },
  });

  const d = q.data;
  const [reply, setReply] = React.useState('');
  const canReply = reply.trim().length > 0;

  const memberByName = React.useMemo(() => {
    const map = new Map<string, { avatar?: string; role?: string }>();
    for (const m of projectDetail.members || []) map.set(m.name, { avatar: m.avatar, role: m.role });
    return map;
  }, [projectDetail.members]);

  const participants = React.useMemo(() => {
    if (!d) return [];
    const names = new Set<string>();
    names.add(d.authorName);
    for (const r of d.replies || []) names.add(r.authorName);
    return Array.from(names).slice(0, 6);
  }, [d]);

  const [linkTaskId, setLinkTaskId] = React.useState<number | null>(null);
  React.useEffect(() => {
    const first = projectDetail.tasks?.[0]?.id;
    if (first && !linkTaskId) setLinkTaskId(first);
  }, [projectDetail.tasks, linkTaskId]);

  if (!id) return <div className="text-sm text-muted-foreground">无效的讨论帖子。</div>;
  if (q.isLoading) return <div className="text-sm text-muted-foreground">正在加载讨论详情...</div>;
  if (q.isError || !d) return <div className="text-sm text-muted-foreground">讨论详情加载失败。</div>;

  const status = (d.status || 'OPEN').toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden border-muted/60">
        <CardContent className="p-6">
          <Button variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={() => nav(`/app/projects/${projectDetail.project.id}/discussions`)}>
            返回讨论列表
          </Button>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full">
                  {categoryLabel[d.category] || d.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('rounded-full', status === 'OPEN' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground')}
                >
                  {status === 'OPEN' ? '开放中' : '已关闭'}
                </Badge>
              </div>
              <h2 className="mt-2 text-3xl font-display font-bold tracking-tight">{d.title}</h2>
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{d.authorName}</span> · 发布时间 {d.createdAt}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="rounded-full" />}>
                <MoreVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === 'OPEN' ? (
                  <DropdownMenuItem onClick={() => updateM.mutate({ status: 'CLOSED' })}>关闭讨论</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => updateM.mutate({ status: 'OPEN' })}>重新开放</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>复制链接</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{d.content}</div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Paperclip size={16} /> 附件
              </div>
              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    uploadM.mutate(f);
                    e.currentTarget.value = '';
                  }}
                />
                <Button variant="outline" size="sm" className="gap-2 rounded-full" disabled={uploadM.isPending}>
                  <Plus size={14} /> 上传
                </Button>
              </label>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border">
              {(d.attachments || []).length ? (
                <div className="divide-y">
                  {d.attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.fileName}</div>
                        <div className="text-[11px] text-muted-foreground">{Math.round((a.sizeBytes || 0) / 1024)} KB · {a.createdAt}</div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open(api.downloadFileUrl(a.id), '_blank')}>
                        下载
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">暂无附件。</div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-full">转为任务</Button>
            <Button variant="outline" className="rounded-full">创建待办</Button>
            <Button variant="outline" className="gap-2 rounded-full">
              <Link2 size={14} /> 关联分支
            </Button>
          </div>

          <div className="mt-10">
            <div className="text-lg font-display font-bold">评论（{d.replies?.length || 0}）</div>
            <div className="mt-4 space-y-4">
              {(d.replies || []).map((r) => {
                const info = memberByName.get(r.authorName);
                return (
                  <div key={r.id} className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={info?.avatar} />
                      <AvatarFallback>{r.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground">{r.authorName}</span>
                        </div>
                        <span>{r.createdAt}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.content}</div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <button className="hover:text-foreground">点赞</button>
                        <button className="hover:text-foreground">回复</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-end gap-3">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="写下你的回复..." className="min-h-[120px] rounded-2xl" />
              <Button
                className="gap-2 rounded-full"
                disabled={!canReply || replyM.isPending}
                onClick={async () => {
                  const next = reply.trim();
                  setReply('');
                  await replyM.mutateAsync(next);
                }}
              >
                <Send size={16} /> 发布回复
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">关联任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(d.linkedTasks || []).length ? (
              <div className="space-y-2">
                {d.linkedTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{t.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{t.status}</div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => unlinkM.mutate(t.id)} disabled={unlinkM.isPending}>
                      取消关联
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">暂无关联任务。</div>
            )}

            <div className="border-t pt-2">
              <div className="flex items-center gap-2">
                <Select value={linkTaskId ? String(linkTaskId) : ''} onValueChange={(v) => setLinkTaskId(Number(v))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="选择一个任务" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectDetail.tasks || []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    if (!linkTaskId) return;
                    linkM.mutate(linkTaskId);
                  }}
                  disabled={!linkTaskId || linkM.isPending}
                >
                  + 关联
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">参与成员</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            {participants.map((name) => {
              const info = memberByName.get(name);
              return (
                <Avatar key={name} className="h-10 w-10">
                  <AvatarImage src={info?.avatar} />
                  <AvatarFallback>{name?.slice(0, 1) || 'U'}</AvatarFallback>
                </Avatar>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
