import React from 'react';
import { Plus, Calendar, Users, CheckSquare, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';
import type { ProjectDetail, TaskRecord } from '@/lib/types';
import type { FileAssetRecord } from '@/lib/types';

type Api = ReturnType<typeof createApiClient>;

export function Tasks({ api, detail, onRefresh }: { api: Api; detail: ProjectDetail; onRefresh: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<TaskRecord['priority']>('MEDIUM');
  const [dueDate, setDueDate] = React.useState('');
  const [filesOpenFor, setFilesOpenFor] = React.useState<TaskRecord | null>(null);
  const [taskFiles, setTaskFiles] = React.useState<FileAssetRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

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

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.saveTask(
        { projectId: detail.project.id, title: title.trim(), description: description.trim(), status: 'TODO', priority, dueDate: dueDate || undefined },
        undefined,
      );
      setOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display font-bold">任务</h3>
          <p className="text-muted-foreground">用任务把工作拆清楚：状态推进、优先级与截止时间一目了然。</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={16} /> 新建任务
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
              <DialogDesc>建议用动词开头，并写清验收标准。</DialogDesc>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>标题</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：完成接口联调 / 补齐文档版本管理 UI" />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="补充说明、链接、注意事项、验收标准…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{priorityLabel.LOW}</SelectItem>
                      <SelectItem value="MEDIUM">{priorityLabel.MEDIUM}</SelectItem>
                      <SelectItem value="HIGH">{priorityLabel.HIGH}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>截止日期</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                取消
              </Button>
              <Button onClick={create} disabled={!title.trim() || saving}>
                {saving ? '创建中…' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {detail.tasks.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-all border-muted/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>{t.assigneeName || '未分配'}</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {statusLabel[t.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.description ? <p className="text-sm text-muted-foreground">{t.description}</p> : <p className="text-sm text-muted-foreground italic">暂无描述。</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {t.assigneeName || '未指派'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {t.dueDate || '未设置'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3 flex justify-between">
              <Badge
                className={cn(
                  'capitalize',
                  t.priority === 'HIGH'
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : t.priority === 'LOW'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200',
                )}
              >
                {priorityLabel[t.priority]}
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    setFilesOpenFor(t);
                    setLoadingFiles(true);
                    try {
                      setTaskFiles(await api.files('TASK', t.id));
                    } finally {
                      setLoadingFiles(false);
                    }
                  }}
                >
                  <Paperclip size={14} /> 附件
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    const next: TaskRecord['status'] =
                      t.status === 'DONE' ? 'TODO' : t.status === 'TODO' ? 'IN_PROGRESS' : t.status === 'IN_PROGRESS' ? 'REVIEW' : 'DONE';
                    await api.saveTask({ projectId: t.projectId, title: t.title, description: t.description || '', status: next, priority: t.priority, dueDate: t.dueDate || undefined }, t.id);
                    await onRefresh();
                  }}
                >
                  <CheckSquare size={14} /> 推进状态
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {!detail.tasks.length && <p className="text-sm text-muted-foreground">暂无任务。点击右上角「新建任务」开始拆分工作。</p>}

      <Dialog
        open={!!filesOpenFor}
        onOpenChange={(v) => {
          if (!v) {
            setFilesOpenFor(null);
            setTaskFiles([]);
            setLoadingFiles(false);
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }}
      >
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>任务附件</DialogTitle>
            <DialogDesc>{filesOpenFor ? filesOpenFor.title : ''}</DialogDesc>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">把截图、文档、交付物挂到任务上，方便验收与回溯。</div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !filesOpenFor) return;
                    setUploading(true);
                    try {
                      await api.uploadFile('TASK', filesOpenFor.id, file);
                      setTaskFiles(await api.files('TASK', filesOpenFor.id));
                    } finally {
                      setUploading(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading || !filesOpenFor}>
                  <Upload size={14} /> {uploading ? '上传中…' : '上传附件'}
                </Button>
              </div>
            </div>

            {loadingFiles ? (
              <div className="text-sm text-muted-foreground">正在加载附件…</div>
            ) : taskFiles.length ? (
              <div className="space-y-2">
                {taskFiles.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl border bg-muted/20 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{f.fileName}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {Math.round((f.sizeBytes || 0) / 1024)} KB · {f.createdAt}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(api.downloadFileUrl(f.id), '_blank', 'noopener,noreferrer')}>
                      下载
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">暂无附件。</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFilesOpenFor(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
