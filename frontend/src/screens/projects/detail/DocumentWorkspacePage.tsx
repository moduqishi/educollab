import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Cloud, CloudOff, Download, FileText, History, MessageSquare, Paperclip, RotateCcw, Save, Send, Share2, Upload, Users } from 'lucide-react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { DocumentVersionRecord, FileAssetRecord } from '@/lib/types';
import { OfficeDocumentWorkspace } from '@/screens/projects/detail/OfficeDocumentWorkspace';

type AwarenessUser = { id: number | string; name: string; avatar?: string };

export function DocumentWorkspacePage() {
  const api = useApi();
  const { session } = useAuth();
  const nav = useNavigate();
  const { projectId, docId } = useParams();

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

  const versionsQ = useQuery({
    queryKey: ['documentVersions', id],
    enabled: !!id && !isOffice,
    queryFn: () => api.documentVersions(id),
  });
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

  const saveVersionM = useMutation({
    mutationFn: (payload: { currentContent: string; versionLabel: string }) => api.saveDocumentVersion(id, payload),
    onSuccess: async () => {
      await versionsQ.refetch();
    },
  });

  const restoreM = useMutation({
    mutationFn: (versionId: number) => api.restoreDocumentVersion(versionId),
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => api.uploadFile('DOCUMENT', id, file),
    onSuccess: async () => {
      await filesQ.refetch();
    },
  });

  const [activeSide, setActiveSide] = React.useState<'versions' | 'files' | 'chat'>('versions');
  const [showSide, setShowSide] = React.useState(true);

  // --- Realtime doc state (Yjs as source-of-truth) ---
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
        // unique by id
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

    // awareness: real identity
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

    // seed from backend once (only when empty to avoid fighting remote state)
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

  const replaceContent = (next: string) => {
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
  };

  // autosave debounce
  React.useEffect(() => {
    if (!docQ.data || isOffice) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const excerpt = stripHtml(content).slice(0, 80);
        await autosaveM.mutateAsync({ currentContent: content, excerpt, saveVersion: false });
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // ignore; UI shows "未保存"
      }
    }, 900);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, docQ.data, isOffice]);

  if (docQ.isLoading) return <PageLoading label="正在打开文档…" />;
  if (docQ.isError) return <PageError title="文档加载失败" onRetry={() => docQ.refetch()} />;
  if (!docQ.data) return <PageError title="文档不存在或无权限访问" message="请返回项目文档列表重新选择。" onRetry={() => nav(`/app/projects/${pid}/documents`)} />;

  if (isOffice) {
    return (
      <div className="space-y-4">
        <OfficeDocumentWorkspace doc={docQ.data} />
      </div>
    );
  }

  const doc = docQ.data;
  const versions = (versionsQ.data || []) as DocumentVersionRecord[];
  const files = (filesQ.data || []) as FileAssetRecord[];

  return (
    <div className="px-8 pb-10">
      <div className="max-w-[1500px] mx-auto">
        <div className="rounded-2xl border border-muted/70 overflow-hidden bg-white shadow-[0_24px_80px_rgba(9,15,25,0.06)]">
          {/* Top toolbar */}
          <div className="h-16 border-b flex items-center justify-between px-5 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="outline" size="icon-sm" className="bg-white" onClick={() => nav(`/app/projects/${pid}/documents`)}>
                <ArrowLeft size={16} />
              </Button>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-semibold truncate max-w-[520px]">{doc.title}</div>
                  <Badge variant="outline" className={cn('text-[11px]', connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {connected ? (
                      <>
                        <Cloud size={12} className="mr-1" /> 实时协作
                      </>
                    ) : (
                      <>
                        <CloudOff size={12} className="mr-1" /> 连接中
                      </>
                    )}
                  </Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-3">
                  <span>项目：{doc.projectName}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>最近保存：{autosaveM.isPending ? '正在保存…' : lastSavedAt || '尚未保存'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <OnlineStack users={onlineUsers} />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => versionsQ.refetch()} disabled={versionsQ.isFetching}>
                <RotateCcw size={14} /> 同步
              </Button>
              <Button variant={activeSide === 'files' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setActiveSide('files')}>
                <Paperclip size={14} /> 附件
              </Button>
              <Button variant={activeSide === 'chat' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setActiveSide('chat')}>
                <MessageSquare size={14} /> 群聊
              </Button>
              <Button variant={activeSide === 'versions' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setActiveSide('versions')}>
                <History size={14} /> 版本
              </Button>
              <RenameDocButton
                currentTitle={doc.title}
                onRename={async (next) => {
                  await renameM.mutateAsync(next);
                }}
              />
              <Button variant="default" size="sm" className="gap-2 rounded-full px-5">
                <Share2 size={14} /> 分享
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
            {/* editor */}
            <div className="bg-muted/15">
              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="max-w-4xl mx-auto py-10 px-6">
                  <div className="rounded-2xl bg-white border shadow-sm">
                    <div className="px-8 py-6 border-b flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold">正文</div>
                        <div className="mt-1 text-sm text-muted-foreground">支持实时协作与自动保存。建议用“标题 + 要点 + 结论”结构。</div>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                        {onlineUsers.length} 人在线
                      </Badge>
                    </div>
                    <div className="p-8">
                      <textarea
                        value={content}
                        onChange={(e) => replaceContent(e.target.value)}
                        placeholder="从这里开始写…（已开启协作）"
                        className="w-full min-h-[640px] resize-none bg-transparent outline-none leading-relaxed text-[15px]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] text-muted-foreground">
                    连接地址：<code className="bg-white px-1.5 py-0.5 rounded border">{COLLAB_BASE}</code> · Key：<code className="bg-white px-1.5 py-0.5 rounded border">{doc.collabKey}</code>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* side */}
            {showSide ? (
              <div className="border-l bg-white flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="text-sm font-semibold">{activeSide === 'versions' ? '版本管理' : activeSide === 'chat' ? '项目群聊' : '附件'}</div>
                  <Button variant="ghost" size="sm" onClick={() => setShowSide(false)}>
                    收起
                  </Button>
                </div>
                <ScrollArea className="flex-1 h-[calc(100vh-260px)]">
                  <div className="p-4 space-y-6">
                    {activeSide === 'versions' ? (
                      <>
                        <SaveVersionButton
                          onSave={async (label) => {
                            await saveVersionM.mutateAsync({ currentContent: content, versionLabel: label });
                          }}
                          saving={saveVersionM.isPending}
                        />
                        <div className="space-y-3">
                          {versions.map((v) => (
                            <Card key={v.id} className="border-muted/70">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <CardTitle className="text-sm truncate">{v.label || '未命名版本'}</CardTitle>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                      {v.createdBy || '—'} · {v.createdAt}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    disabled={restoreM.isPending}
                                    onClick={async () => {
                                      const restored = await restoreM.mutateAsync(v.id);
                                      replaceContent(restored.currentContent || '');
                                      await docQ.refetch();
                                      await versionsQ.refetch();
                                    }}
                                  >
                                    {restoreM.isPending ? '恢复中…' : '恢复'}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                                {stripHtml(v.snapshotContent || '').slice(0, 220) || '—'}
                              </CardContent>
                            </Card>
                          ))}
                          {!versions.length ? <div className="text-sm text-muted-foreground">还没有版本。你可以在里程碑节点保存一个快照。</div> : null}
                        </div>
                      </>
                    ) : activeSide === 'chat' ? (
                      <ProjectChatSidebar projectId={pid} />
                    ) : (
                      <>
                        <UploadFileButton uploading={uploadM.isPending} onUpload={(f) => uploadM.mutateAsync(f)} />
                        <div className="space-y-2">
                          {files.map((f) => (
                            <Card key={f.id} className="border-muted/70">
                              <CardContent className="py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold truncate">{f.fileName}</div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    {Math.round((f.sizeBytes || 0) / 1024)} KB · {f.createdAt}
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(api.downloadFileUrl(f.id), '_blank', 'noopener,noreferrer')}>
                                  下载
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                          {!files.length ? <div className="text-sm text-muted-foreground">暂无附件。你可以上传需求文档、评审 PDF、截图等。</div> : null}
                        </div>
                      </>
                    )}

                    {activeSide !== 'chat' && (
                      <>
                        <Separator />
                        <div className="text-[11px] text-muted-foreground space-y-1">
                          <div>保存策略：停止输入约 1 秒后自动保存；关键节点可手动保存版本。</div>
                          <div>提示：如果断网，编辑不会丢失；连接恢复后会自动同步。</div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="border-l bg-white p-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSide(true)}>
                  展开侧栏
                </Button>
              </div>
            )}
          </div>

          {/* bottom status bar */}
          <div className="h-12 border-t bg-white px-5 flex items-center justify-between text-xs text-muted-foreground">
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

function SaveVersionButton({ onSave, saving }: { onSave: (label: string) => Promise<void>; saving: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const can = !!label.trim();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full gap-2" />}>
        <Save size={14} /> 保存版本快照
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存版本</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>版本名称</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：里程碑 1 · 评审稿" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            取消
          </Button>
          <Button
            disabled={!can || saving}
            onClick={async () => {
              if (!can) return;
              await onSave(label.trim());
              setLabel('');
              setOpen(false);
            }}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
