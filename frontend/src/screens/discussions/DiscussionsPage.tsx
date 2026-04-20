import React from 'react';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  { key: 'GENERAL', label: '综合讨论' },
  { key: 'HELP_NEEDED', label: '需要帮助' },
  { key: 'TASK_ASSIGNMENT', label: '任务分工' },
  { key: 'BUG_REPORT', label: '问题反馈' },
  { key: 'RESOURCES', label: '资料共享' },
];

export function DiscussionsPage() {
  const api = useApi();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  React.useEffect(() => setTitle(['讨论']), []);

  const discussionsQ = useQuery({ queryKey: ['discussions'], queryFn: () => api.discussions() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });

  const [kw, setKw] = React.useState(params.get('q') || '');
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [category, setCategory] = React.useState('GENERAL');
  const [title, setTitleText] = React.useState('');
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    setKw(params.get('q') || '');
  }, [params]);

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
      <div className="mx-auto max-w-[1200px]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-3xl font-display font-bold">讨论广场</div>
            <div className="mt-1 text-sm text-muted-foreground">围绕项目展开交流，沉淀问题、方案和协作记录。</div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="gap-2 rounded-full" />}>
              <Plus size={16} /> 新建帖子
            </DialogTrigger>
            <DialogContent className="max-w-[760px]">
              <DialogHeader>
                <DialogTitle>新建帖子</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>所属项目</Label>
                  <Select value={projectId ? String(projectId) : ''} onValueChange={(v) => setProjectId(Number(v))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="请选择项目" />
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
                  <Label>分类</Label>
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
                  <Label>状态</Label>
                  <Input readOnly value="开放中" className="rounded-xl" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>标题</Label>
                  <Input value={title} onChange={(e) => setTitleText(e.target.value)} className="rounded-xl" placeholder="请输入讨论标题" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>内容</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px] rounded-xl" placeholder="请输入帖子内容" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={createM.isPending}>
                  取消
                </Button>
                <Button className="rounded-full" disabled={!projectId || !title.trim() || !content.trim() || createM.isPending} onClick={() => createM.mutate()}>
                  {createM.isPending ? '发布中...' : '发布帖子'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={kw}
              onChange={(e) => {
                const next = e.target.value;
                setKw(next);
                setParams((prev) => {
                  const nextParams = new URLSearchParams(prev);
                  if (next.trim()) nextParams.set('q', next);
                  else nextParams.delete('q');
                  return nextParams;
                }, { replace: true });
              }}
              placeholder="搜索讨论内容..."
              className="rounded-full pl-10"
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {items.map((d) => (
            <Card key={d.id} className="border-muted/60 transition-shadow hover:shadow-sm">
              <CardContent className="p-6">
                <button className="w-full text-left" onClick={() => nav(`/app/projects/${d.projectId}/discussions/${d.id}`)}>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-muted-foreground">{d.projectName} · {d.createdAt}</div>
                      <div className="mt-1 truncate text-xl font-display font-bold">{d.title}</div>
                      <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{d.content || '暂无内容'}</div>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={14} /> {d.replyCount} 条评论
                        </span>
                        <Badge variant="outline" className={cn('rounded-full text-[10px]')}>
                          {categories.find((item) => item.key === d.category)?.label || String(d.category)}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className={cn('rounded-full', d.status === 'OPEN' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground')}
                      >
                        {d.status === 'OPEN' ? '开放中' : '已关闭'}
                      </Badge>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
          {!items.length ? <div className="py-12 text-center text-sm text-muted-foreground">暂时还没有匹配的讨论内容。</div> : null}
        </div>
      </div>
    </div>
  );
}
