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

import { EditorServer } from '@/office/editor/server';
import io, { MockSocket, type MockSocketOptions } from '@/office/editor/socket';
import { createFetchProxy } from '@/office/editor/fetch';
import { createXHRProxy } from '@/office/editor/xhr';
import { API_JS, APP_ROOT, PRELOAD_HTML, getDocumentType } from '@/office/editor/utils';

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

type RoomEvent = {
  id: string;
  from: string;
  ts: number;
  payload: any;
};

function makeId() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const rnd = (globalThis.crypto as any)?.randomUUID?.();
  return rnd || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function OfficeDocumentWorkspace({ doc }: { doc: DocumentRecord }) {
  const api = useApi();
  const { token, session } = useAuth();
  const [runtimeReady, setRuntimeReady] = React.useState<boolean>(() => !!window.DocsAPI?.DocEditor);
  const [editorError, setEditorError] = React.useState<string | null>(null);

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
  const roomConnIdRef = React.useRef<string>('');
  const roomEventsRef = React.useRef<Y.Array<RoomEvent> | null>(null);
  const roomLastSeenRef = React.useRef<number>(0);
  const deliverRoomEventsRef = React.useRef<(() => void) | null>(null);
  const socketRef = React.useRef<MockSocket | null>(null);
  const editorRef = React.useRef<any>(null);
  const serverRef = React.useRef<EditorServer | null>(null);
  const suppressBroadcastRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!session) return;
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: COLLAB_BASE,
      name: `office-${doc.collabKey}`,
      document: ydoc,
    });
    providerRef.current = provider;
    roomConnIdRef.current = `${session.profile.id}-${makeId()}`;

    // Message bus: server->client broadcast payloads (OnlyOffice coEditing messages)
    const events = ydoc.getArray<RoomEvent>('office:s2c');
    roomEventsRef.current = events;
    roomLastSeenRef.current = 0;

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
    provider.awareness.setLocalStateField('office', {
      connId: roomConnIdRef.current,
    });

    provider.on('status', ({ status }: any) => setConnected(status === 'connected'));
    provider.awareness.on('change', updateOnline);
    updateOnline();

    const deliverEvents = () => {
      // If socket not yet created by OnlyOffice runtime, keep events queued.
      if (!socketRef.current) return;
      const evArr = events.toArray();
      for (let i = roomLastSeenRef.current; i < evArr.length; i++) {
        const ev = evArr[i];
        if (!ev || ev.from === roomConnIdRef.current) continue;
        // deliver as if from server to the current web-app socket
        try {
          suppressBroadcastRef.current = true;
          socketRef.current?.server.emit('message', ev.payload);
        } finally {
          suppressBroadcastRef.current = false;
        }
      }
      roomLastSeenRef.current = evArr.length;
    };

    deliverRoomEventsRef.current = deliverEvents;
    const onEventsChange = () => deliverEvents();
    events.observe(onEventsChange);
    deliverEvents();

    return () => {
      try {
        events.unobserve(onEventsChange);
        provider.destroy();
      } catch {
        // ignore
      }
      providerRef.current = null;
      roomEventsRef.current = null;
      deliverRoomEventsRef.current = null;
    };
  }, [doc.collabKey, session]);

  const primaryDownloadUrl = doc.fileAssetId ? withAccessToken(api.downloadFileUrl(doc.fileAssetId), token) : null;

  React.useEffect(() => {
    // Full office-website style boot: preload iframe + inject io/xhr/fetch/worker + DocsAPI init.
    if (!session) return;
    if (!doc.fileAssetId) return;
    if (!primaryDownloadUrl) return;

    setEditorError(null);

    const apiUrl = APP_ROOT + API_JS;
    const preloadUrl = APP_ROOT + PRELOAD_HTML;

    const server = new EditorServer({
      getState: () => ({ plugins: 'featured' }),
      broadcastMessage: (payload) => {
        if (suppressBroadcastRef.current) return;
        const events = roomEventsRef.current;
        if (!events) return;
        events.push([
          {
            id: makeId(),
            from: roomConnIdRef.current,
            ts: Date.now(),
            payload,
          },
        ]);
      },
      onSaveOfficeFile: async ({ file, fileName }) => {
        const savedFile = new File([file], fileName, { type: 'application/octet-stream' });
        await api.saveOfficeDocument(doc.id, savedFile);
        await versionsQ.refetch();
      },
    });
    server.setUser({ id: String(session.profile.id), name: session.profile.name });
    server.setKey(doc.collabKey);
    serverRef.current = server;

    // Attach local server to socket connections (created inside the editor iframe)
    MockSocket.on('connect', server.handleConnect);
    MockSocket.on('disconnect', server.handleDisconnect);

    let destroyed = false;
    let cleanupInjected = () => {};

    const loadRuntimeScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.DocsAPI?.DocEditor) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${apiUrl}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('Failed to load DocsAPI script')), { once: true });
          return;
        }
        const s = document.createElement('script');
        s.src = apiUrl;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load DocsAPI script'));
        document.head.appendChild(s);
      });

    const ensurePreloadIframe = () => {
      const holder = document.getElementById('onlyoffice-preload-holder');
      if (!holder) return;
      if (holder.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.className = 'w-0 h-0 hidden';
      iframe.src = preloadUrl;
      holder.appendChild(iframe);
    };

    const injectIntoFrameEditor = () => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[name="frameEditor"]');
      const win = iframe?.contentWindow as any;
      const iframeDoc = iframe?.contentDocument;
      if (!win || !iframeDoc) {
        throw new Error('frameEditor iframe not loaded');
      }

      const XHR = createXHRProxy(win.XMLHttpRequest);
      const fetchProxy = createFetchProxy(win);
      const _Worker = win.Worker;

      XHR.use((request: Request) => server.handleRequest(request));
      fetchProxy.use((request: Request) => server.handleRequest(request));

      const roomIo = (url?: string, options?: MockSocketOptions) => {
        const socket = io(url, {
          ...(options || {}),
          debug: false,
          onServerEmit: (_event, _args) => {
            // no-op; co-edit broadcast is handled via server.options.broadcastMessage
          },
        });
        socketRef.current = socket;
        // flush queued broadcasts now that socket is available
        setTimeout(() => deliverRoomEventsRef.current?.(), 0);
        return socket;
      };

      Object.assign(win, {
        io: roomIo,
        XMLHttpRequest: XHR,
        fetch: fetchProxy,
        Worker: function (url: string, options?: WorkerOptions) {
          const u = new URL(url, location.origin);
          return new _Worker(u.href.replace(u.origin, location.origin), options);
        },
      });

      const script = iframeDoc.createElement('script');
      script.src = apiUrl;
      iframeDoc.body.appendChild(script);

      cleanupInjected = () => {
        try {
          // best-effort restore; iframe will be reloaded on editor destroy anyway
          win.XMLHttpRequest = win.XMLHttpRequest;
        } catch {
          // ignore
        }
      };
    };

    const boot = async () => {
      try {
        ensurePreloadIframe();
        await loadRuntimeScript();
        if (destroyed) return;
        setRuntimeReady(true);

        // Load backend file into the local server (convert -> Editor.bin)
        const res = await fetch(primaryDownloadUrl);
        if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
        const buf = await res.arrayBuffer();
        await server.openBuffer(buf, {
          fileType: doc.officeExt || 'docx',
          title: doc.title,
          key: doc.collabKey,
        });

        const d = server.getDocument();
        const u = server.getUser();
        const documentType = getDocumentType(d.fileType);

        // eslint-disable-next-line no-new
        const editor = new window.DocsAPI!.DocEditor('onlyoffice-editor', {
          document: {
            fileType: d.fileType,
            key: d.key,
            title: d.title,
            url: d.url,
            permissions: {
              edit: d.fileType !== 'pdf',
              chat: false,
              rename: true,
              protect: true,
              review: false,
              print: false,
            },
          },
          documentType,
          editorConfig: {
            lang: 'zh',
            coEditing: {
              mode: 'fast',
              change: false,
            },
            user: { ...u },
            customization: {
              // keep defaults; integrate with EduCollab theme later
              compactHeader: false,
              compactToolbar: false,
            },
          },
          events: {
            onAppReady: () => {
              try {
                injectIntoFrameEditor();
              } catch (e) {
                console.error(e);
              }
            },
            onError: (e: any) => {
              console.error('OnlyOffice error', e);
            },
            onDocumentStateChange: (e: any) => {
              // dirty state events (optional)
              if ((import.meta as any).env?.DEV) console.log('Document state change', e);
            },
          },
          width: '100%',
          height: '100%',
          type: 'desktop',
        });

        editorRef.current = editor;
        server.setClient({ buildVersion: window.DocsAPI!.DocEditor.version() });
      } catch (e: any) {
        console.error(e);
        setEditorError(e?.message || String(e));
        setRuntimeReady(false);
      }
    };

    boot();

    return () => {
      destroyed = true;
      cleanupInjected();
      try {
        editorRef.current?.destroyEditor?.();
      } catch {
        // ignore
      }
      editorRef.current = null;
      socketRef.current = null;
      serverRef.current = null;
      MockSocket.off('connect', server.handleConnect);
      MockSocket.off('disconnect', server.handleDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, doc.fileAssetId, doc.collabKey, doc.officeExt, doc.title, primaryDownloadUrl, session]);

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
          <div id="onlyoffice-preload-holder" />

          {!runtimeReady || !window.DocsAPI?.DocEditor ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="font-medium text-foreground">未检测到 OnlyOffice 运行时（web-apps）或初始化失败</div>
              {editorError ? <div className="text-xs text-red-600 break-all">{editorError}</div> : null}
              <div>请确认已把 `office-website` 静态资源放到：</div>
              <pre className="text-xs bg-muted/30 border rounded-xl p-3 overflow-auto">
                <code>/Users/cake/toys/educollab/frontend/public/v9.3.0.24-1</code>
              </pre>
              <div className="text-[12px]">
                资源放置后刷新页面即可加载：
                <span className="font-mono">/v9.3.0.24-1/web-apps/apps/api/documents/api.js</span>
              </div>
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
