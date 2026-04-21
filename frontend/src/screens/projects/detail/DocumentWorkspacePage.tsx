import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bold,
  Cloud,
  CloudOff,
  Code,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  MessageSquare,
  Minus,
  Paperclip,
  Quote,
  RotateCcw,
  Send,
  Share2,
  Strikethrough,
  Table,
  Upload,
  Users,
} from 'lucide-react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { PageLoading, PageError } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { COLLAB_BASE, stripHtml } from '@/lib/mappers';
import type { FileAssetRecord } from '@/lib/types';
import { OfficeDocumentWorkspace } from '@/screens/projects/detail/OfficeDocumentWorkspace';

type AwarenessUser = { id: number | string; name: string; avatar?: string };

type SelectionResult = { text: string; selectionStart: number; selectionEnd: number };

export function DocumentWorkspacePage() {
  const api = useApi();
  const { session } = useAuth();
  const nav = useNavigate();
  const { projectId, docId } = useParams();
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  const pid = Number(projectId);
  const id = Number(docId);

  const docQ = useQuery({
    queryKey: ['document', id],
    enabled: !!id,
    queryFn: () => api.documentDetail(id),
  });

  const isOffice = docQ.data?.kind === 'OFFICE';

  React.useEffect(() => {
    if (docQ.data) setTitle([docQ.data.title, docQ.data.projectName, '文档']);
  }, [docQ.data]);

  const filesQ = useQuery({
    queryKey: ['documentFiles', id],
    enabled: !!id && !isOffice,
    queryFn: () => api.files('DOCUMENT', id),
  });

  const renameM = useMutation({
    mutationFn: (title: string) => api.renameDocument(id, title),
    onSuccess: async () => {
      await docQ.refetch();
    },
  });

  const autosaveM = useMutation({
    mutationFn: (payload: { currentContent: string; excerpt: string; saveVersion: boolean; versionLabel?: string }) => api.autosaveDocument(id, payload),
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => api.uploadFile('DOCUMENT', id, file),
    onSuccess: async () => {
      await filesQ.refetch();
    },
  });

  const [activeSide, setActiveSide] = React.useState<'files' | 'chat'>('files');
  const [showSide, setShowSide] = React.useState(true);

  const [content, setContent] = React.useState('');
  const [connected, setConnected] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = React.useState<AwarenessUser[]>([]);

  const ydocRef = React.useRef<Y.Doc | null>(null);
  const ytextRef = React.useRef<Y.Text | null>(null);
  const providerRef = React.useRef<HocuspocusProvider | null>(null);
  const suppressApplyRef = React.useRef(false);
  const saveTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!docQ.data || !session || isOffice) return;

    const doc = docQ.data;
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('content');

    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    const provider = new HocuspocusProvider({
      url: COLLAB_BASE,
      name: doc.collabKey,
      document: ydoc,
    });
    providerRef.current = provider;

    const updateOnline = () => {
      try {
        const states = Array.from(provider.awareness.getStates().values()) as Array<any>;
        const users = states
          .map((s) => s?.user)
          .filter(Boolean)
          .map((u: any) => ({ id: u.id ?? u.name, name: u.name || '未知用户', avatar: u.avatar })) as AwarenessUser[];
        const map = new Map<string, AwarenessUser>();
        for (const u of users) map.set(String(u.id), u);
        setOnlineUsers(Array.from(map.values()));
      } catch {
        setOnlineUsers([]);
      }
    };

    provider.on('status', (event: any) => {
      setConnected(event.status === 'connected');
    });

    try {
      provider.awareness.setLocalStateField('user', {
        id: session.profile.id,
        name: session.profile.name,
        avatar: session.profile.avatar,
      });
      provider.awareness.on('change', updateOnline);
      updateOnline();
    } catch {}

    const applyFromY = () => {
      if (suppressApplyRef.current) return;
      setContent(ytext.toString());
    };
    ytext.observe(applyFromY);

    const seedTimer = window.setTimeout(() => {
      const cur = ytext.toString();
      if (!cur && (doc.currentContent || '').trim()) {
        suppressApplyRef.current = true;
        ydoc.transact(() => {
          ytext.insert(0, doc.currentContent || '');
        });
        suppressApplyRef.current = false;
        setContent(ytext.toString());
      } else {
        setContent(cur);
      }
    }, 500);

    return () => {
      window.clearTimeout(seedTimer);
      ytext.unobserve(applyFromY);
      try {
        provider.awareness.off('change', updateOnline);
      } catch {}
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
      ydocRef.current = null;
      ytextRef.current = null;
    };
  }, [docQ.data, session, isOffice]);

  const replaceContent = React.useCallback((next: string) => {
    const ydoc = ydocRef.current;
    const ytext = ytextRef.current;
    if (!ydoc || !ytext) {
      setContent(next);
      return;
    }
    suppressApplyRef.current = true;
    ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, next);
    });
    suppressApplyRef.current = false;
    setContent(next);
  }, []);

  React.useEffect(() => {
    if (!docQ.data || isOffice) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const excerpt = stripHtml(content).slice(0, 80);
        await autosaveM.mutateAsync({ currentContent: content, excerpt, saveVersion: false });
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // ignore
      }
    }, 900);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, docQ.data, isOffice]);

  const applySelection = React.useCallback((updater: (selected: string, fullText: string, start: number, end: number) => SelectionResult) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const result = updater(selected, content, start, end);
    replaceContent(result.text);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }, [content, replaceContent]);

  const wrapSelection = React.useCallback((prefix: string, suffix = prefix, placeholder = '内容') => {
    applySelection((selected, fullText, start, end) => {
      const body = selected || placeholder;
      const next = `${fullText.slice(0, start)}${prefix}${body}${suffix}${fullText.slice(end)}`;
      const innerStart = start + prefix.length;
      const innerEnd = innerStart + body.length;
      return { text: next, selectionStart: innerStart, selectionEnd: innerEnd };
    });
  }, [applySelection]);

  const prefixLines = React.useCallback((prefix: string, placeholder: string) => {
    applySelection((selected, fullText, start, end) => {
      const body = selected || placeholder;
      const transformed = body
        .split('\n')
        .map((line) => (line ? `${prefix}${line}` : prefix.trimEnd()))
        .join('\n');
      const next = `${fullText.slice(0, start)}${transformed}${fullText.slice(end)}`;
      return { text: next, selectionStart: start, selectionEnd: start + transformed.length };
    });
  }, [applySelection]);

  const insertBlock = React.useCallback((template: string, cursorOffset?: number) => {
    applySelection((selected, fullText, start, end) => {
      const body = selected || template;
      const prefix = start > 0 && !fullText.slice(0, start).endsWith('\n') ? '\n' : '';
      const suffix = fullText.slice(end).startsWith('\n') ? '' : '\n';
      const inserted = `${prefix}${body}${suffix}`;
      const next = `${fullText.slice(0, start)}${inserted}${fullText.slice(end)}`;
      const selectionStart = start + prefix.length + (cursorOffset ?? 0);
      const selectionEnd = selectionStart;
      return { text: next, selectionStart, selectionEnd };
    });
  }, [applySelection]);

  const handleInsertImage = React.useCallback(async (file: File) => {
    const uploaded = await uploadM.mutateAsync(file);
    const alt = uploaded.fileName?.replace(/\.[^.]+$/, '') || '图片';
    const url = api.downloadFileUrl(uploaded.id);
    applySelection((_selected, fullText, start, end) => {
      const snippet = `![${alt}](${url})`;
      const next = `${fullText.slice(0, start)}${snippet}${fullText.slice(end)}`;
      const pos = start + snippet.length;
      return { text: next, selectionStart: pos, selectionEnd: pos };
    });
  }, [api, applySelection, uploadM]);

  if (docQ.isLoading) return <PageLoading label="正在打开文档…" />;
  if (docQ.isError) return <PageError title="文档加载失败" onRetry={() => docQ.refetch()} />;
  if (!docQ.data) return <PageError title="文件不存在或无权限访问" message="请返回项目文件列表重新选择。" onRetry={() => nav(`/app/projects/${pid}/files`)} />;

  if (isOffice) {
    return (
      <div className="space-y-4">
        <OfficeDocumentWorkspace doc={docQ.data} />
      </div>
    );
  }

  const doc = docQ.data;
  const files = ((filesQ.data || []) as FileAssetRecord[]).filter((file) => file.id !== doc.fileAssetId);

  return (
    <div className="px-8 pb-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="overflow-hidden rounded-2xl border border-muted/70 bg-white shadow-[0_24px_80px_rgba(9,15,25,0.06)]">
          <div className="flex h-16 items-center justify-between border-b bg-white px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon-sm" className="bg-white" onClick={() => nav(`/app/projects/${pid}/files`)}>
                  <ArrowLeft size={16} />
                </Button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="max-w-[520px] truncate font-semibold">{doc.title}</div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Markdown 协同</Badge>
                    <Badge variant="outline" className={cn('text-[11px]', connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                      {connected ? <><Cloud size={12} className="mr-1" /> 实时协作</> : <><CloudOff size={12} className="mr-1" /> 连接中</>}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>项目：{doc.projectName}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span>最近保存：{autosaveM.isPending ? '正在保存…' : lastSavedAt || '尚未保存'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <OnlineStack users={onlineUsers} />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { void docQ.refetch(); void filesQ.refetch(); }}>
                <RotateCcw size={14} /> 刷新
              </Button>
              <Button variant={activeSide === 'files' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setActiveSide('files')}>
                <Paperclip size={14} /> 附件
              </Button>
              <Button variant={activeSide === 'chat' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setActiveSide('chat')}>
                <MessageSquare size={14} /> 群聊
              </Button>
              <RenameDocButton currentTitle={doc.title} onRename={async (next) => { await renameM.mutateAsync(next); }} />
              <Button variant="default" size="sm" className="gap-2 rounded-full px-5">
                <Share2 size={14} /> 分享
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="bg-muted/15">
              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-8">
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                      <div>
                        <div className="text-sm font-semibold">Markdown 工具栏</div>
                        <div className="mt-1 text-xs text-muted-foreground">编辑区保存 Markdown 源文；右侧实时预览阅读样式。</div>
                      </div>
                      <div className="text-xs text-muted-foreground">字数 {content.trim().length} · 行数 {content ? content.split('\n').length : 0}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <ToolbarButton icon={<Heading1 size={14} />} label="H1" onClick={() => insertBlock('# 标题一', 2)} />
                      <ToolbarButton icon={<Heading2 size={14} />} label="H2" onClick={() => insertBlock('## 标题二', 3)} />
                      <ToolbarButton icon={<Heading3 size={14} />} label="H3" onClick={() => insertBlock('### 标题三', 4)} />
                      <ToolbarButton icon={<Bold size={14} />} label="加粗" onClick={() => wrapSelection('**')} />
                      <ToolbarButton icon={<Italic size={14} />} label="斜体" onClick={() => wrapSelection('*')} />
                      <ToolbarButton icon={<Strikethrough size={14} />} label="删除线" onClick={() => wrapSelection('~~')} />
                      <ToolbarButton icon={<Quote size={14} />} label="引用" onClick={() => prefixLines('> ', '引用内容')} />
                      <ToolbarButton icon={<List size={14} />} label="无序列表" onClick={() => prefixLines('- ', '列表项')} />
                      <ToolbarButton icon={<ListOrdered size={14} />} label="有序列表" onClick={() => prefixLines('1. ', '列表项')} />
                      <ToolbarButton icon={<ListTodo size={14} />} label="任务列表" onClick={() => prefixLines('- [ ] ', '待办事项')} />
                      <ToolbarButton icon={<Code size={14} />} label="行内代码" onClick={() => wrapSelection('`')} />
                      <ToolbarButton icon={<Code size={14} />} label="代码块" onClick={() => insertBlock('```\n代码块\n```', 4)} />
                      <ToolbarButton icon={<Link2 size={14} />} label="链接" onClick={() => wrapSelection('[', '](https://example.com)', '链接文字')} />
                      <ToolbarButton icon={<ImagePlus size={14} />} label="图片" onClick={() => imageInputRef.current?.click()} disabled={uploadM.isPending} />
                      <ToolbarButton icon={<Minus size={14} />} label="分割线" onClick={() => insertBlock('---', 3)} />
                      <ToolbarButton icon={<Table size={14} />} label="表格" onClick={() => insertBlock('| 列 1 | 列 2 |\n| --- | --- |\n| 内容 1 | 内容 2 |', 2)} />
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          await handleInsertImage(file);
                        } finally {
                          if (imageInputRef.current) imageInputRef.current.value = '';
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b px-6 py-4">
                        <div>
                          <div className="font-semibold">源文编辑</div>
                          <div className="mt-1 text-xs text-muted-foreground">支持工具栏插入语法、实时协作与自动保存。</div>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">.md</Badge>
                      </div>
                      <div className="p-6">
                        <textarea
                          ref={textareaRef}
                          value={content}
                          onChange={(e) => replaceContent(e.target.value)}
                          placeholder="从这里开始写 Markdown…"
                          className="min-h-[680px] w-full resize-none rounded-2xl border bg-white p-4 font-mono text-[14px] leading-7 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b px-6 py-4">
                        <div>
                          <div className="font-semibold">实时预览</div>
                          <div className="mt-1 text-xs text-muted-foreground">按 Markdown 阅读样式展示标题、列表、代码块、图片与链接。</div>
                        </div>
                        <Badge variant="outline">预览</Badge>
                      </div>
                      <ScrollArea className="h-[760px]">
                        <div className="p-6">
                          <MarkdownPreview content={content} />
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    协同地址：<code className="rounded border bg-white px-1.5 py-0.5">{COLLAB_BASE}</code> · Key：<code className="rounded border bg-white px-1.5 py-0.5">{doc.collabKey}</code>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {showSide ? (
              <div className="flex flex-col border-l bg-white">
                <div className="flex items-center justify-between border-b p-4">
                  <div className="text-sm font-semibold">{activeSide === 'chat' ? '项目群聊' : '附件'}</div>
                  <Button variant="ghost" size="sm" onClick={() => setShowSide(false)}>收起</Button>
                </div>
                <ScrollArea className="h-[calc(100vh-260px)] flex-1">
                  <div className="space-y-6 p-4">
                    {activeSide === 'chat' ? (
                      <ProjectChatSidebar projectId={pid} />
                    ) : (
                      <>
                        <UploadFileButton uploading={uploadM.isPending} onUpload={(f) => uploadM.mutateAsync(f)} />
                        <div className="space-y-2">
                          {files.map((f) => (
                            <Card key={f.id} className="border-muted/70">
                              <CardContent className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{f.fileName}</div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">{Math.round((f.sizeBytes || 0) / 1024)} KB · {f.createdAt}</div>
                                </div>
                                <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(api.downloadFileUrl(f.id), '_blank', 'noopener,noreferrer')}>
                                  下载
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                          {!files.length ? <div className="text-sm text-muted-foreground">暂无附件。你可以上传图片、PDF、设计稿或说明文件。</div> : null}
                        </div>
                      </>
                    )}

                    {activeSide !== 'chat' && (
                      <>
                        <Separator />
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <div>保存策略：停止输入约 1 秒后自动保存。</div>
                          <div>Markdown 图片会先上传为附件，再自动插入正文语法。</div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="border-l bg-white p-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSide(true)}>展开侧栏</Button>
              </div>
            )}
          </div>

          <div className="flex h-12 items-center justify-between border-t bg-white px-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {connected ? <Cloud size={14} className="text-emerald-600" /> : <CloudOff size={14} className="text-amber-600" />}
              <span>{connected ? '已连接（实时协作）' : '连接中（离线也可编辑）'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>字数：{content.trim() ? content.trim().length : 0}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>最近保存：{autosaveM.isPending ? '正在保存…' : lastSavedAt || '尚未保存'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </Button>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-sm text-muted-foreground">还没有内容，开始输入 Markdown 后这里会实时预览。</div>;
  }
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-6 border-b pb-2 text-2xl font-semibold text-slate-950">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-5 text-xl font-semibold text-slate-900">{children}</h3>,
          p: ({ children }) => <p className="text-[15px] leading-7 text-slate-700">{children}</p>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/30 bg-primary/5 px-4 py-2 italic text-slate-700">{children}</blockquote>,
          ul: ({ children }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pl-6">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          code: ({ className, children }) => {
            const isBlock = (className || '').includes('language-') || String(children).includes('\n');
            return isBlock ? (
              <code className="block overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-[13px] leading-6 text-slate-100">{children}</code>
            ) : (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-primary">{children}</code>
            );
          },
          pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">{children}</a>,
          img: ({ src, alt }) => <img src={src || ''} alt={alt || ''} className="max-h-[420px] rounded-2xl border object-contain shadow-sm" />,
          hr: () => <hr className="my-6 border-dashed border-slate-300" />,
          table: ({ children }) => <div className="overflow-x-auto rounded-2xl border"><table className="min-w-full text-sm">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => <th className="border px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border px-3 py-2 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function OnlineStack({ users }: { users: AwarenessUser[] }) {
  const shown = users.slice(0, 5);
  const more = users.length - shown.length;
  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((u) => (
          <div key={String(u.id)} className="relative">
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-white flex items-center justify-center text-xs font-semibold overflow-hidden">
              {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name.slice(0, 1)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
        ))}
      </div>
      <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-muted/60">
        <Users size={12} className="mr-1" />
        {users.length}
        {more > 0 ? `（+${more}）` : ''}
      </Badge>
    </div>
  );
}


function UploadFileButton({ onUpload, uploading }: { onUpload: (file: File) => Promise<any>; uploading: boolean }) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  return (
    <Card className="border-dashed border-muted/70">
      <CardContent className="py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">上传附件</div>
          <div className="mt-1 text-[11px] text-muted-foreground">支持截图、PDF、设计稿、接口说明等。</div>
        </div>
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onUpload(file);
            if (ref.current) ref.current.value = '';
          }}
        />
        <Button variant="outline" size="sm" className="gap-2" disabled={uploading} onClick={() => ref.current?.click()}>
          <Upload size={14} /> {uploading ? '上传中…' : '选择文件'}
        </Button>
      </CardContent>
    </Card>
  );
}

function RenameDocButton({ currentTitle, onRename }: { currentTitle: string; onRename: (next: string) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(currentTitle);
  React.useEffect(() => setTitle(currentTitle), [currentTitle]);
  const can = !!title.trim() && title.trim() !== currentTitle;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>重命名</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名文档</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>标题</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            disabled={!can}
            onClick={async () => {
              if (!can) return;
              await onRename(title.trim());
              setOpen(false);
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectChatSidebar({ projectId }: { projectId: number }) {
  const api = useApi();
  const { session } = useAuth();
  const qc = useQueryClient();

  const roomQ = useQuery({
    queryKey: ['chatProjectRoom', projectId],
    queryFn: () => api.getChatProjectRoom(projectId),
  });

  const messagesQ = useQuery({
    queryKey: ['chatMessages', roomQ.data?.id],
    enabled: !!roomQ.data?.id,
    queryFn: () => api.chatMessages(roomQ.data!.id),
  });

  const sendM = useMutation({
    mutationFn: (payload: { content?: string; fileAssetId?: number; fileName?: string; fileSizeBytes?: number; mimeType?: string }) =>
      api.sendChatMessage(roomQ.data!.id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['chatMessages', roomQ.data?.id] });
    },
  });

  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      const roomId = roomQ.data!.id;
      const fileRecord = await api.uploadFile('CHAT_MESSAGE', roomId, file);
      await api.sendChatMessage(roomId, {
        fileAssetId: fileRecord.id,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
      await qc.invalidateQueries({ queryKey: ['chatMessages', roomId] });
    },
  });

  const [text, setText] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{ fileAssetId: number; fileName: string; mimeType: string } | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQ.data]);

  if (roomQ.isLoading) return <div className="p-4 text-sm text-muted-foreground">正在加载群聊...</div>;

  const messages = ((messagesQ.data || []) as any[]).slice().reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-primary" />
          <span className="text-sm font-semibold">{roomQ.data?.name || '项目群聊'}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{roomQ.data?.memberCount || 0} 人</div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-3">
          {!messagesQ.isLoading && !messages.length ? (
            <div className="text-center text-xs text-muted-foreground py-8">暂无消息</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-2', msg.authorId === session?.profile.id && 'flex-row-reverse')}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={msg.authorAvatar || undefined} />
                  <AvatarFallback className="text-[10px]">{msg.authorName?.slice(0, 1) || 'U'}</AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[75%]', msg.authorId === session?.profile.id && 'items-end')}>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold">{msg.authorName}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.createdAt}</span>
                  </div>
                  {msg.content && (
                    <div className={cn('rounded-xl px-3 py-2 text-xs', msg.authorId === session?.profile.id ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {msg.content}
                    </div>
                  )}
                  {msg.fileAssetId && (() => {
                    const isImage = msg.mimeType?.startsWith('image/');
                    return (
                      <div className={cn('mt-1 rounded-xl overflow-hidden', msg.authorId === session?.profile.id ? 'bg-primary/90' : 'bg-muted')}>
                        {isImage ? (
                          <>
                            <img
                              src={api.downloadFileUrl(msg.fileAssetId)}
                              alt={msg.fileName}
                              className="max-w-40 max-h-40 object-contain cursor-pointer"
                              onClick={() => setPreviewFile({ fileAssetId: msg.fileAssetId, fileName: msg.fileName || '图片', mimeType: msg.mimeType || 'image/*' })}
                            />
                            <div className="flex items-center justify-end px-2 py-1 gap-1">
                              <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]" onClick={() => window.open(api.downloadFileUrl(msg.fileAssetId), '_blank')}>
                                <Download size={9} />下载
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 p-2">
                            <Paperclip size={12} className={msg.authorId === session?.profile.id ? 'text-primary-foreground/70' : 'text-muted-foreground'} />
                            <span className="text-xs flex-1 truncate">{msg.fileName}</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => window.open(api.downloadFileUrl(msg.fileAssetId), '_blank')}>
                              <Download size={10} className="mr-0.5" />下载
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !roomQ.data?.id) return;
              await uploadM.mutateAsync(file);
              if (fileRef.current) fileRef.current.value = '';
            }} />
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()} disabled={uploadM.isPending || !roomQ.data?.id}>
            <Paperclip size={14} />
          </Button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && roomQ.data?.id) {
                e.preventDefault();
                if (!text.trim()) return;
                sendM.mutate({ content: text.trim() });
                setText('');
              }
            }}
            placeholder="发送消息..."
            className="flex-1 h-9 rounded-xl border border-muted bg-muted/20 px-3 text-xs outline-none focus:border-primary"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" disabled={!text.trim() || sendM.isPending || !roomQ.data?.id} onClick={() => {
            if (!text.trim() || !roomQ.data?.id) return;
            sendM.mutate({ content: text.trim() });
            setText('');
          }}>
            <Send size={14} />
          </Button>
        </div>
      </div>

      {previewFile && (
        <ChatFilePreviewDialog
          fileAssetId={previewFile.fileAssetId}
          fileName={previewFile.fileName}
          mimeType={previewFile.mimeType}
          api={api}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

type ChatFilePreviewDialogProps = {
  fileAssetId: number;
  fileName: string;
  mimeType: string;
  api: ReturnType<typeof useApi>;
  onClose: () => void;
};

function ChatFilePreviewDialog({ fileAssetId, fileName, mimeType, api, onClose }: ChatFilePreviewDialogProps) {
  const isImage = mimeType.startsWith('image/');
  const fileUrl = api.downloadFileUrl(fileAssetId);

  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(null);

  React.useEffect(() => {
    if (!isImage) return;
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(img.naturalWidth, window.innerWidth * 0.85);
      const maxH = Math.min(img.naturalHeight, window.innerHeight * 0.85);
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      setImgSize({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) });
    };
    img.src = fileUrl;
  }, [isImage, fileUrl]);

  const dlgStyle: React.CSSProperties = isImage && imgSize
    ? { width: imgSize.w + 48, height: imgSize.h + 64, maxWidth: '95vw', maxHeight: '90vh' }
    : { width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '85vh' };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="!p-0 !gap-0" style={dlgStyle}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b bg-white">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
              <Download size={14} className="mr-1" />下载
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-[#f5f5f5]" style={{ height: isImage && imgSize ? imgSize.h : undefined }}>
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img src={fileUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Paperclip size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">此文件类型暂不支持预览</p>
                <Button onClick={() => window.open(fileUrl, '_blank')}>
                  <Download size={14} className="mr-2" />下载文件
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
