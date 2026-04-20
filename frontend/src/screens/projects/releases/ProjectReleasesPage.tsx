import React from 'react';
import { Plus, Tag } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ProjectReleasesPage() {
  const api = useApi();
  const { detail, refresh } = useProjectDetail();

  React.useEffect(() => setTitle([detail.project.name, '发布']), [detail.project.name]);

  const [open, setOpen] = React.useState(false);
  const [version, setVersion] = React.useState('v0.1.0');
  const [title, setTitleText] = React.useState('首次发布');
  const [desc, setDesc] = React.useState('');

  const createM = useMutation({
    mutationFn: () => api.createRelease({ projectId: detail.project.id, version: version.trim(), title: title.trim(), description: desc.trim() }),
    onSuccess: async () => {
      setOpen(false);
      setDesc('');
      await refresh();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-display font-bold">版本发布</div>
          <div className="text-sm text-muted-foreground">记录阶段成果，沉淀每次版本变化和里程碑说明。</div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2 rounded-full" />}>
            <Plus size={16} /> 新建发布
          </DialogTrigger>
          <DialogContent className="max-w-[720px]">
            <DialogHeader>
              <DialogTitle>新建发布</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>版本号</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v0.1.0" className="rounded-xl font-mono" />
              </div>
              <div className="space-y-2">
                <Label>标题</Label>
                <Input value={title} onChange={(e) => setTitleText(e.target.value)} placeholder="请输入发布标题" className="rounded-xl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>说明</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[160px] rounded-xl" placeholder="填写本次版本包含的内容..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={createM.isPending}>
                取消
              </Button>
              <Button className="rounded-full" onClick={() => createM.mutate()} disabled={!version.trim() || !title.trim() || createM.isPending}>
                {createM.isPending ? '创建中...' : '创建发布'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {(detail.releases || []).length ? (
          detail.releases.map((r) => (
            <Card key={r.id} className="border-muted/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full font-mono">
                        <Tag size={12} className="mr-1" />
                        {r.version}
                      </Badge>
                      <div className="truncate text-base font-semibold">{r.title}</div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{r.createdAt}</div>
                  </div>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{r.description || '暂无发布说明'}</div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-muted/60">
            <CardHeader>
              <CardTitle className="text-base">暂时还没有版本发布</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">创建第一个发布记录，用来保存项目阶段成果。</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
