import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, MessageSquare, Plus, Search } from 'lucide-react';
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
  { key: 'ALL', label: 'All Posts' },
  { key: 'GENERAL', label: 'General' },
  { key: 'HELP_NEEDED', label: 'Help Needed' },
  { key: 'TASK_ASSIGNMENT', label: 'Task Assignment' },
  { key: 'BUG_REPORT', label: 'Bug Report' },
  { key: 'RESOURCES', label: 'Resources' },
];

export function ProjectDiscussionsListPage() {
  const api = useApi();
  const nav = useNavigate();
  const { detail, refresh } = useProjectDetail();
  const [params, setParams] = useSearchParams();

  React.useEffect(() => setTitle([detail.project.name, 'Discussions']), [detail.project.name]);

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
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Left rail */}
      <div className="space-y-6">
        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs tracking-wider text-muted-foreground">CATEGORIES</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {categories.map((c) => {
              const active = c.key === category;
              return (
                <button
                  key={c.key}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors',
                    active ? 'bg-muted text-foreground' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('category', c.key);
                    return next;
                  })}
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
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)}>
              Create Task
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)}>
              Create Todo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search discussions..." className="pl-10 rounded-full" />
          </div>

          <Dialog>
            <DialogTrigger render={<Button className="rounded-full gap-2" />}>
              <Plus size={16} /> New Post
            </DialogTrigger>
            <NewPostDialog
              onCreate={async (v) => {
                await createM.mutateAsync(v);
              }}
              pending={createM.isPending}
            />
          </Dialog>
        </div>

        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id} className="border-muted/60">
              <CardContent className="p-5 flex items-start justify-between gap-6">
                <button className="flex-1 text-left min-w-0" onClick={() => nav(`/app/projects/${detail.project.id}/discussions/${p.id}`)}>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={avatarByName.get(p.authorName)} />
                      <AvatarFallback>{p.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-base font-semibold truncate">{p.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {p.authorName} · {p.createdAt} · <Badge variant="outline" className="text-[10px]">{p.category.replaceAll('_', ' ')}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.content || '—'}</div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{p.replyCount} replies</span>
                    <span>{p.linkedTaskCount} linked tasks</span>
                  </div>
                </button>

                <Button variant="outline" className="rounded-full" onClick={() => nav(`/app/projects/${detail.project.id}/discussions/${p.id}`)}>
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
          {!items.length ? <div className="py-12 text-center text-sm text-muted-foreground">No discussions yet.</div> : null}
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
        <DialogTitle>New Discussion</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are we discussing?" className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
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
          <Label>Status</Label>
          <Input readOnly value="OPEN" className="rounded-xl" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post..." className="min-h-[160px] rounded-xl" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" className="rounded-full" disabled={pending}>
          Cancel
        </Button>
        <Button
          className="rounded-full"
          disabled={!canSubmit || pending}
          onClick={async () => {
            await onCreate({ title: title.trim(), content: content.trim(), category });
          }}
        >
          {pending ? 'Creating…' : 'Create Post'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
