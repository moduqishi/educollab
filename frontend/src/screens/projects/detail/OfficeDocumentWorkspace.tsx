import React from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Cloud, CloudOff, Download, Upload, Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { COLLAB_BASE } from '@/lib/mappers';
import type { DocumentRecord, DocumentVersionRecord } from '@/lib/types';

type AwarenessUser = { id: number | string; name: string; avatar?: string };

declare global {
  interface Window {
    DocsAPI?: any;
  }
}

function withAccessToken(url: string, token: string | null) {
  if (!token) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set('access_token', token);
  return u.toString();
}

export function OfficeDocumentWorkspace({ doc }: { doc: DocumentRecord }) {
  const api = useApi();
  const { token, session } = useAuth();
  const [runtimeReady, setRuntimeReady] = React.useState<boolean>(() => !!window.DocsAPI);

  const versionsQ = useQuery({
    queryKey: ['documentVersions', doc.id],
    enabled: !!doc.id,
    queryFn: () => api.documentVersions(doc.id),
  });

  const restoreM = useMutation({
    mutationFn: (versionId: number) => api.restoreDocumentVersion(versionId),
  });

  const uploadAndSaveM = useMutation({
    mutationFn: (file: File) => api.saveOfficeDocument(doc.id, file),
    onSuccess: async () => {
      await versionsQ.refetch();
    },
  });

  // realtime: use Yjs doc as a message bus + awareness for participants
  const [connected, setConnected] = React.useState(false);
  const [onlineUsers, setOnlineUsers] = React.useState<AwarenessUser[]>([]);
  const providerRef = React.useRef<HocuspocusProvider | null>(null);

  React.useEffect(() => {
    if (!session) return;
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: COLLAB_BASE,
      name: `office-${doc.collabKey}`,
      document: ydoc,
    });
    providerRef.current = provider;

    const updateOnline = () => {
      try {
        const states = Array.from(provider.awareness.getStates().values()) as Array<any>;
        const users = states.map((s) => s?.user).filter(Boolean) as AwarenessUser[];
        // de-dup
        const map = new Map<string, AwarenessUser>();
        for (const u of users) map.set(String(u.id), u);
        setOnlineUsers(Array.from(map.values()));
      } catch {
        setOnlineUsers([]);
      }
    };

    provider.awareness.setLocalStateField('user', {
      id: session.profile.id,
      name: session.profile.name,
      avatar: session.profile.avatar,
    });

    provider.on('status', ({ status }: any) => setConnected(status === 'connected'));
    provider.awareness.on('change', updateOnline);
    updateOnline();

    return () => {
      try {
        provider.destroy();
      } catch {
        // ignore
      }
      providerRef.current = null;
    };
  }, [doc.collabKey, session]);

  const primaryDownloadUrl = doc.fileAssetId ? withAccessToken(api.downloadFileUrl(doc.fileAssetId), token) : null;

  React.useEffect(() => {
    // Auto-load OnlyOffice api.js if web-apps runtime exists under /public/web-apps
    if (window.DocsAPI) {
      setRuntimeReady(true);
      return;
    }
    const scriptId = 'onlyoffice-api-js';
    if (document.getElementById(scriptId)) return;
    const s = document.createElement('script');
    s.id = scriptId;
    s.src = '/web-apps/apps/api/documents/api.js';
    s.async = true;
    s.onload = () => setRuntimeReady(true);
    s.onerror = () => setRuntimeReady(false);
    document.head.appendChild(s);
  }, []);

  React.useEffect(() => {
    // Best-effort: initialize OnlyOffice editor if runtime exists.
    // Note: real editing/saving/collab wiring depends on office-website runtime; we keep a guarded init here.
    if (!doc.fileAssetId) return;
    const containerId = 'onlyoffice-editor';
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!window.DocsAPI || !window.DocsAPI.DocEditor) return;
    if (!primaryDownloadUrl) return;

    try {
      // eslint-disable-next-line no-new
      new window.DocsAPI.DocEditor(containerId, {
        document: {
          fileType: doc.officeExt || 'docx',
          key: doc.collabKey,
          title: doc.title,
          url: primaryDownloadUrl,
        },
        editorConfig: {
          lang: 'zh',
          user: {
            id: session?.profile.id,
            name: session?.profile.name,
          },
          customization: {
            compactHeader: false,
            compactToolbar: false,
          },
        },
      });
    } catch {
      // ignore init errors; UI below will show fallback hints
    }
    // OnlyOffice editor manages its own DOM; no cleanup API guaranteed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.fileAssetId, doc.officeExt, doc.title, primaryDownloadUrl, runtimeReady]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            OFFICE · {(doc.officeExt || 'file').toUpperCase()}
          </Badge>
          <Badge
            variant="outline"
            className={connected ? 'rounded-full bg-emerald-50 text-emerald-700 border-emerald-200' : 'rounded-full bg-muted text-muted-foreground'}
          >
            {connected ? (
              <span className="inline-flex items-center gap-1">
                <Cloud size={14} /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <CloudOff size={14} /> Offline
              </span>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Users size={14} /> {onlineUsers.length} online
          </span>
        </div>

        <div className="flex items-center gap-2">
          {primaryDownloadUrl ? (
            <a href={primaryDownloadUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="rounded-full gap-2">
                <Download size={16} /> 下载
              </Button>
            </a>
          ) : (
            <Button variant="outline" className="rounded-full" disabled title="该 Office 文档缺少主文件，请重新上传">
              下载
            </Button>
          )}

          <label className="inline-flex">
            <input
              type="file"
              className="hidden"
              accept=".docx,.xlsx,.pptx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndSaveM.mutate(f);
                e.currentTarget.value = '';
              }}
            />
            <Button className="rounded-full gap-2" disabled={uploadAndSaveM.isPending}>
              <Upload size={16} /> {uploadAndSaveM.isPending ? '上传中…' : '上传并保存'}
            </Button>
          </label>
        </div>
      </div>

      <Card className="border-muted/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Office Editor</CardTitle>
        </CardHeader>
        <CardContent>
          {!runtimeReady || !window.DocsAPI ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="font-medium text-foreground">未检测到 OnlyOffice 运行时（web-apps）</div>
              <div>请把 `office-website` 的 `web-apps` 静态资源放到：</div>
              <pre className="text-xs bg-muted/30 border rounded-xl p-3 overflow-auto">
                <code>/Users/cake/toys/educollab/frontend/public/web-apps</code>
              </pre>
              <div className="text-[12px]">放置后刷新页面即可加载 `/web-apps/apps/api/documents/api.js`。</div>
            </div>
          ) : (
            <div id="onlyoffice-editor" className="w-full h-[calc(100vh-320px)] min-h-[620px] border rounded-xl bg-muted/10" />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">协同参与者</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {onlineUsers.length ? (
              <div className="space-y-2">
                {onlineUsers.map((u) => (
                  <div key={String(u.id)} className="flex items-center justify-between">
                    <div className="font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">#{String(u.id)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>暂无在线成员。</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">版本</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {versionsQ.isLoading ? (
              <div className="p-4">
                <PageLoading label="加载版本…" />
              </div>
            ) : versionsQ.isError ? (
              <div className="p-4">
                <PageError title="版本加载失败" onRetry={() => versionsQ.refetch()} />
              </div>
            ) : (
              <ScrollArea className="h-[360px]">
                <div className="divide-y">
                  {(versionsQ.data || []).length ? (
                    (versionsQ.data || []).map((v: DocumentVersionRecord) => (
                      <div key={v.id} className="p-4">
                        <div className="text-sm font-semibold">{v.label || '版本'}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {v.createdBy} · {v.createdAt}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={restoreM.isPending}
                            onClick={() => restoreM.mutate(v.id)}
                          >
                            {restoreM.isPending ? '恢复中…' : '恢复为当前'}
                          </Button>
                          {v.fileAssetId ? (
                            <a href={withAccessToken(api.downloadFileUrl(v.fileAssetId), token)} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="rounded-full gap-2">
                                <Download size={14} /> 下载该版本
                              </Button>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">暂无版本。</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
          <Separator />
          <CardContent className="p-4 space-y-2">
            <Label className="text-[11px] text-muted-foreground">手动保存版本</Label>
            <Input
              type="file"
              accept=".docx,.xlsx,.pptx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAndSaveM.mutate(f);
                e.currentTarget.value = '';
              }}
            />
            <div className="text-[11px] text-muted-foreground">提示：当前先通过“上传并保存”生成新内容；后续接入 office-website 后可做到编辑器内一键保存。</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
