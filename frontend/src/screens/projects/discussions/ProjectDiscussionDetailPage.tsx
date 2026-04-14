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
  GENERAL: 'General',
  HELP_NEEDED: 'Help Needed',
  TASK_ASSIGNMENT: 'Task Assignment',
  BUG_REPORT: 'Bug Report',
  RESOURCES: 'Resources',
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
    if (q.data) setTitle([projectDetail.project.name, 'Discussions', q.data.title]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDetail.tasks?.length]);

  if (!id) return <div className="text-sm text-muted-foreground">Invalid post.</div>;
  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.isError || !d) return <div className="text-sm text-muted-foreground">Failed to load.</div>;

  const status = (d.status || 'OPEN').toUpperCase();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
      {/* Main */}
      <Card className="border-muted/60 overflow-hidden">
        <CardContent className="p-6">
          <Button variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={() => nav(`/app/projects/${projectDetail.project.id}/discussions`)}>
            ← Back to Discussions
          </Button>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full">
                  {categoryLabel[d.category] || d.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('rounded-full', status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground')}
                >
                  {status === 'OPEN' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <h2 className="mt-2 text-3xl font-display font-bold tracking-tight">{d.title}</h2>
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{d.authorName}</span> · Posted on {d.createdAt}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="rounded-full" />}>
                <MoreVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === 'OPEN' ? (
                  <DropdownMenuItem onClick={() => updateM.mutate({ status: 'CLOSED' })}>Close discussion</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => updateM.mutate({ status: 'OPEN' })}>Re-open discussion</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">{d.content}</div>

          {/* Attachments */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Paperclip size={16} /> Attachments
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
                <Button variant="outline" size="sm" className="rounded-full gap-2" disabled={uploadM.isPending}>
                  <Plus size={14} /> Upload
                </Button>
              </label>
            </div>

            <div className="mt-3 border rounded-2xl overflow-hidden">
              {(d.attachments || []).length ? (
                <div className="divide-y">
                  {d.attachments.map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.fileName}</div>
                        <div className="text-[11px] text-muted-foreground">{Math.round((a.sizeBytes || 0) / 1024)} KB · {a.createdAt}</div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open(api.downloadFileUrl(a.id), '_blank')}>
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No attachments.</div>
              )}
            </div>
          </div>

          {/* Action row */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-full">Convert to Task</Button>
            <Button variant="outline" className="rounded-full">Create Todo</Button>
            <Button variant="outline" className="rounded-full gap-2">
              <Link2 size={14} /> Link to Branch
            </Button>
          </div>

          {/* Comments */}
          <div className="mt-10">
            <div className="text-lg font-display font-bold">Comments ({d.replies?.length || 0})</div>
            <div className="mt-4 space-y-4">
              {(d.replies || []).map((r) => {
                const info = memberByName.get(r.authorName);
                return (
                  <div key={r.id} className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={info?.avatar} />
                      <AvatarFallback>{r.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 border rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground">{r.authorName}</span>
                        </div>
                        <span>{r.createdAt}</span>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{r.content}</div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <button className="hover:text-foreground">Like</button>
                        <button className="hover:text-foreground">Reply</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-end gap-3">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="min-h-[120px] rounded-2xl" />
              <Button
                className="rounded-full gap-2"
                disabled={!canReply || replyM.isPending}
                onClick={async () => {
                  const next = reply.trim();
                  setReply('');
                  await replyM.mutateAsync(next);
                }}
              >
                <Send size={16} /> Post Reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right rail */}
      <div className="space-y-6">
        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Linked Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(d.linkedTasks || []).length ? (
              <div className="space-y-2">
                {d.linkedTasks.map((t) => (
                  <div key={t.id} className="p-3 border rounded-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{t.status}</div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => unlinkM.mutate(t.id)} disabled={unlinkM.isPending}>
                      Unlink
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No linked tasks.</div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <Select value={linkTaskId ? String(linkTaskId) : ''} onValueChange={(v) => setLinkTaskId(Number(v))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a task" />
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
                  + Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Participants</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            {participants.map((name) => {
              const info = memberByName.get(name);
              return (
                <Avatar key={name} className="w-10 h-10">
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
