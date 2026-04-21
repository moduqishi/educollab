import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const categories: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: '全部帖子' },
  { key: 'GENERAL', label: '综合讨论' },
  { key: 'HELP_NEEDED', label: '需要帮助' },
  { key: 'TASK_ASSIGNMENT', label: '任务分工' },
  { key: 'BUG_REPORT', label: '问题反馈' },
  { key: 'RESOURCES', label: '资料共享' },
];

export function ProjectDiscussionsListPage() {
  const api = useApi();
  const nav = useNavigate();
  const { detail, refresh } = useProjectDetail();
  const [params, setParams] = useSearchParams();

  React.useEffect(() => setTitle([detail.project.name, '讨论']), [detail.project.name]);

  const category = (params.get('category') || 'ALL').toUpperCase();
  const [q, setQ] = React.useState('');

  const avatarByName = React.useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const m of detail.members || []) map.set(m.name, m.avatar);
    return map;
  }, [detail.members]);

  const items = (detail.discussions || [])
    .filter((p) => (category === 'ALL' ? true : p.category === category))
    .filter((p) => {
      const kw = q.trim().toLowerCase();
      if (!kw) return true;
      return `${p.title} ${p.content} ${p.authorName}`.toLowerCase().includes(kw);
    });

  const counts = React.useMemo(() => {
    const c = new Map<string, number>();
    c.set('ALL', (detail.discussions || []).length);
    for (const k of categories.map((x) => x.key)) {
      if (k === 'ALL') continue;
      c.set(k, (detail.discussions || []).filter((d) => d.category === k).length);
    }
    return c;
  }, [detail.discussions]);

  const createM = useMutation({
    mutationFn: (payload: { title: string; content: string; category: string }) =>
      api.createDiscussion({ projectId: detail.project.id, title: payload.title, content: payload.content, category: payload.category }),
    onSuccess: async (created) => {
      await refresh();
      nav(`/app/projects/${detail.project.id}/discussions/${created.id}`);
    },
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-6">
        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs tracking-wider text-muted-foreground">讨论分类</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {categories.map((c) => {
              const active = c.key === category;
              return (
                <button
                  key={c.key}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                    active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  onClick={() =>
                    setParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('category', c.key);
                      return next;
                    })
                  }
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={16} />
                    {c.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{counts.get(c.key) || 0}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)} disabled={!detail.currentUserCanEdit}>
              新建任务
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)} disabled={!detail.currentUserCanEdit}>
              新建待办
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索项目讨论..." className="rounded-full pl-10" />
          </div>

          {detail.currentUserCanEdit ? (
            <Dialog>
              <DialogTrigger render={<Button className="gap-2 rounded-full" />}>
                <Plus size={16} /> 新建帖子
              </DialogTrigger>
              <NewPostDialog
                onCreate={async (v) => {
                  await createM.mutateAsync(v);
                }}
                pending={createM.isPending}
              />
            </Dialog>
          ) : (
            <Badge variant="secondary">只读查看</Badge>
          )}
        </div>

        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id} className="border-muted/60">
              <CardContent className="flex items-start justify-between gap-6 p-5">
                <button className="min-w-0 flex-1 text-left" onClick={() => nav(`/app/projects/${detail.project.id}/discussions/${p.id}`)}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarByName.get(p.authorName)} />
                      <AvatarFallback>{p.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{p.title}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {p.authorName} · {p.createdAt} · <Badge variant="outline" className="text-[10px]">{categories.find((item) => item.key === p.category)?.label || p.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.content || '暂无内容'}</div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{p.replyCount} 条回复</span>
                    <span>{p.linkedTaskCount} 个关联任务</span>
                  </div>
                </button>

                <Button variant="outline" className="rounded-full" onClick={() => nav(`/app/projects/${detail.project.id}/discussions/${p.id}`)}>
                  打开
                </Button>
              </CardContent>
            </Card>
          ))}
          {!items.length ? <div className="py-12 text-center text-sm text-muted-foreground">当前还没有讨论内容。</div> : null}
        </div>
      </div>
    </div>
  );
}

function NewPostDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: { title: string; content: string; category: string }) => Promise<void>;
  pending?: boolean;
}) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [category, setCategory] = React.useState('GENERAL');

  const canSubmit = title.trim() && content.trim();

  return (
    <DialogContent className="max-w-[720px]">
      <DialogHeader>
        <DialogTitle>新建讨论</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>标题</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="这次想讨论什么？" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>分类</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.filter((c) => c.key !== 'ALL').map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>状态</Label>
          <Input readOnly value="开放中" className="rounded-xl" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>内容</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="请输入讨论内容..." className="min-h-[160px] rounded-xl" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-full" disabled={pending}>
          取消
        </Button>
        <Button
          className="rounded-full"
          disabled={!canSubmit || pending}
          onClick={async () => {
            await onCreate({ title: title.trim(), content: content.trim(), category });
          }}
        >
          {pending ? '创建中...' : '创建帖子'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
