import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, FileText, FileType, Presentation, Plus, Search } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { PageHero } from '@/screens/shell/PageHero';
import { PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { stripHtml } from '@/lib/mappers';

export function ProjectDocumentsPage() {
  const api = useApi();
  const nav = useNavigate();
  const { detail, refresh } = useProjectDetail();

  React.useEffect(() => setTitle([detail.project.name, '文档']), [detail.project.name]);

  const [kw, setKw] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<'NOTE' | 'OFFICE'>('NOTE');
  const [ext, setExt] = React.useState<'docx' | 'xlsx' | 'pptx'>('docx');
  const [title, setTitleText] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);

  const createM = useMutation({
    mutationFn: (payload: { projectId: number; title: string; currentContent: string }) => api.createDocument(payload),
    onSuccess: async () => {
      await refresh();
    },
  });

  const createOfficeM = useMutation({
    mutationFn: (payload: { projectId: number; title: string; ext: 'docx' | 'xlsx' | 'pptx'; file?: File | null }) => api.createOfficeDocument(payload),
    onSuccess: async () => {
      await refresh();
    },
  });

  const docs = detail.documents.filter((d) => {
    const key = kw.trim().toLowerCase();
    if (!key) return true;
    return `${d.title} ${d.excerpt}`.toLowerCase().includes(key);
  });

  return (
    <div className="space-y-6">
      <PageHero
        title="文档"
        subtitle="沉淀方案、纪要与联调记录。实时协作 + 自动保存 + 版本回滚，让团队更放心。"
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setTitleText('');
                setKind('NOTE');
                setExt('docx');
                setFile(null);
              }
            }}
          >
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus size={16} /> 新建文档
            </DialogTrigger>
            <DialogContent className="max-w-[680px]">
              <DialogHeader>
                <DialogTitle>新建文档</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>类型</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={kind === 'NOTE' ? 'default' : 'outline'} className="rounded-full" onClick={() => setKind('NOTE')} type="button">
                      <FileText size={14} className="mr-2" /> Note
                    </Button>
                    <Button variant={kind === 'OFFICE' && ext === 'docx' ? 'default' : 'outline'} className="rounded-full" onClick={() => { setKind('OFFICE'); setExt('docx'); }} type="button">
                      <FileType size={14} className="mr-2" /> Word
                    </Button>
                    <Button variant={kind === 'OFFICE' && ext === 'xlsx' ? 'default' : 'outline'} className="rounded-full" onClick={() => { setKind('OFFICE'); setExt('xlsx'); }} type="button">
                      <FileSpreadsheet size={14} className="mr-2" /> Excel
                    </Button>
                    <Button variant={kind === 'OFFICE' && ext === 'pptx' ? 'default' : 'outline'} className="rounded-full" onClick={() => { setKind('OFFICE'); setExt('pptx'); }} type="button">
                      <Presentation size={14} className="mr-2" /> PPT
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>标题</Label>
                  <Input value={title} onChange={(e) => setTitleText(e.target.value)} placeholder={kind === 'OFFICE' ? '例如：阶段总结（Office）' : '例如：接口联调记录 / 需求评审纪要 / 迭代计划'} />
                </div>
                {kind === 'OFFICE' ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>可选：上传已有文件（.{ext}）</Label>
                    <Input
                      type="file"
                      accept={ext === 'docx' ? '.docx' : ext === 'xlsx' ? '.xlsx' : '.pptx'}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      不上传则自动创建“空白模板”文档。提示：Office 编辑器依赖 vendored 的 web-apps 运行时（本项目已集成到 <span className="font-mono">/v9.3.0.24-1</span>）。
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={createM.isPending || createOfficeM.isPending}>
                  取消
                </Button>
                <Button
                  disabled={
                    !title.trim() ||
                    (kind === 'NOTE' ? createM.isPending : createOfficeM.isPending)
                  }
                  onClick={async () => {
                    const created =
                      kind === 'NOTE'
                        ? await createM.mutateAsync({ projectId: detail.project.id, title: title.trim(), currentContent: '' })
                        : await createOfficeM.mutateAsync({ projectId: detail.project.id, title: title.trim(), ext, file });
                    setOpen(false);
                    nav(`/app/projects/${detail.project.id}/documents/${created.id}`);
                  }}
                >
                  {kind === 'NOTE'
                    ? createM.isPending
                      ? '正在创建…'
                      : '创建并打开'
                    : createOfficeM.isPending
                      ? file
                        ? '正在上传…'
                        : '正在创建…'
                      : '创建并打开'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        right={
          <div className="w-[360px] max-w-full relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 bg-muted/40 border-border/60" placeholder="搜索文档标题…" value={kw} onChange={(e) => setKw(e.target.value)} />
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto">
          {!detail.documents.length ? (
            <PageEmpty
              title="还没有文档"
              message="建议先创建一篇“项目总览文档”，把目标、里程碑、验收标准写清楚。"
              icon={FileText}
              action={
                <Button className="gap-2" onClick={() => setOpen(true)}>
                  <Plus size={16} /> 新建文档
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {docs.map((d) => (
                <Card key={d.id} className={cn('border-muted/70 hover:shadow-sm transition-shadow')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{d.title}</CardTitle>
                        <CardDescription className="truncate">{detail.project.name}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[11px]">
                        {(d.kind || 'NOTE') === 'OFFICE' ? `OFFICE · ${(d.officeExt || 'file').toUpperCase()}` : 'NOTE'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {(d.kind || 'NOTE') === 'OFFICE'
                        ? d.excerpt || `Office 文档（${d.officeExt || 'file'}）`
                        : d.excerpt || stripHtml(d.currentContent || '').slice(0, 140) || '—'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>更新：{d.updatedAt}</span>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => nav(`/app/projects/${detail.project.id}/documents/${d.id}`)}>
                        打开
                      </Button>
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
