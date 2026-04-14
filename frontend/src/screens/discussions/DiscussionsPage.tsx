import React from 'react';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const categories: Array<{ key: string; label: string }> = [
  { key: 'GENERAL', label: 'General' },
  { key: 'HELP_NEEDED', label: 'Help Needed' },
  { key: 'TASK_ASSIGNMENT', label: 'Task Assignment' },
  { key: 'BUG_REPORT', label: 'Bug Report' },
  { key: 'RESOURCES', label: 'Resources' },
];

export function DiscussionsPage() {
  const api = useApi();
  const nav = useNavigate();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['Discussions']), []);

  const discussionsQ = useQuery({ queryKey: ['discussions'], queryFn: () => api.discussions() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });

  const [kw, setKw] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [category, setCategory] = React.useState('GENERAL');
  const [title, setTitleText] = React.useState('');
  const [content, setContent] = React.useState('');

  const createM = useMutation({
    mutationFn: () => api.createDiscussion({ projectId: projectId!, title: title.trim(), content: content.trim(), category }),
    onSuccess: async (created) => {
      setOpen(false);
      setTitleText('');
      setContent('');
      setProjectId(null);
      await qc.invalidateQueries({ queryKey: ['discussions'] });
      nav(`/app/projects/${created.projectId}/discussions/${created.id}`);
    },
  });

  const items = (discussionsQ.data || []).filter((d) => {
    const q = kw.trim().toLowerCase();
    if (!q) return true;
    return `${d.title} ${d.projectName} ${d.content} ${d.authorName}`.toLowerCase().includes(q);
  });

  return (
    <div className="px-8 pb-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-3xl font-display font-bold">Forum Discussions</div>
            <div className="mt-1 text-sm text-muted-foreground">Join the conversation and collaborate with your peers.</div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="rounded-full gap-2" />}>
              <Plus size={16} /> New Post
            </DialogTrigger>
            <DialogContent className="max-w-[760px]">
              <DialogHeader>
                <DialogTitle>New Post</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Project</Label>
                  <Select value={projectId ? String(projectId) : ''} onValueChange={(v) => setProjectId(Number(v))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projectsQ.data || []).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
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
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitleText(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Content</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px] rounded-xl" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={createM.isPending}>
                  Cancel
                </Button>
                <Button className="rounded-full" disabled={!projectId || !title.trim() || !content.trim() || createM.isPending} onClick={() => createM.mutate()}>
                  {createM.isPending ? 'Posting…' : 'Post'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Search discussions..." className="pl-10 rounded-full" />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {items.map((d) => (
            <Card key={d.id} className="border-muted/60 hover:shadow-sm transition-shadow">
              <CardContent className="p-6">
                <button className="w-full text-left" onClick={() => nav(`/app/projects/${d.projectId}/discussions/${d.id}`)}>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground font-semibold">{d.projectName} · {d.createdAt}</div>
                      <div className="mt-1 text-xl font-display font-bold truncate">{d.title}</div>
                      <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.content || '—'}</div>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MessageSquare size={14} /> {d.replyCount} Comments</span>
                        <Badge variant="outline" className={cn('rounded-full text-[10px]')}>{String(d.category).replaceAll('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className={cn('rounded-full', d.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground')}
                      >
                        {d.status === 'OPEN' ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
          {!items.length ? <div className="py-12 text-center text-sm text-muted-foreground">No discussions yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
