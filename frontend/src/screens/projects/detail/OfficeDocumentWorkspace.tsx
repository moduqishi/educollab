import React from 'react';
import { Download, FileCog, Save, Trash2, Upload } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { DocumentRecord } from '@/lib/types';

import { EditorServer } from '@/office/editor/server';
import io, { MockSocket, type MockSocketOptions } from '@/office/editor/socket';
import { createFetchProxy } from '@/office/editor/fetch';
import { createXHRProxy } from '@/office/editor/xhr';
import { API_JS, APP_ROOT, PRELOAD_HTML, getDocumentType } from '@/office/editor/utils';

declare global {
  interface Window {
    DocsAPI?: any;
    __EDUCOLLAB_OFFICE_IO__?: any;
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
  const nav = useNavigate();
  const qc = useQueryClient();
  const { token, session } = useAuth();
  const editorInstanceRef = React.useRef<any>(null);
  const [runtimeReady, setRuntimeReady] = React.useState<boolean>(() => !!window.DocsAPI?.DocEditor);
  const [editorError, setEditorError] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [title, setTitle] = React.useState(doc.title || '');
  const [reloadKey, setReloadKey] = React.useState(0);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    setTitle(doc.title || '');
  }, [doc.title]);

  const renameM = useMutation({
    mutationFn: (nextTitle: string) => api.renameDocument(doc.id, nextTitle),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['document', doc.id] });
      await qc.invalidateQueries({ queryKey: ['projectDetail', doc.projectId] });
    },
  });

  const deleteM = useMutation({
    mutationFn: () => api.deleteDocument(doc.id),
    onSuccess: () => {
      nav(`/app/projects/${doc.projectId}/files`);
    },
  });

  const uploadAndSaveM = useMutation({
    mutationFn: (file: File) => api.saveOfficeDocument(doc.id, file),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['document', doc.id] });
      setReloadKey((v) => v + 1);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsDirty(false);
    },
  });

  const saveCurrentM = useMutation({
    mutationFn: async () => {
      const editor = editorInstanceRef.current;
      if (!editor) throw new Error('Office 编辑器尚未就绪');
      editor.downloadAs(doc.officeExt || undefined);
    },
  });

  const primaryDownloadUrl = doc.fileAssetId ? withAccessToken(api.downloadFileUrl(doc.fileAssetId), token) : null;

  React.useEffect(() => {
    if (!session || !doc.fileAssetId || !primaryDownloadUrl) return;

    setEditorError(null);
    setRuntimeReady(!!window.DocsAPI?.DocEditor);

    const apiUrl = APP_ROOT + API_JS;
    const preloadUrl = APP_ROOT + PRELOAD_HTML;

    const server = new EditorServer({
      getState: () => ({ plugins: 'featured' }),
      broadcastMessage: () => {},
      onSaveOfficeFile: async ({ file, fileName }) => {
        const savedFile = new File([file], fileName, { type: 'application/octet-stream' });
        await api.saveOfficeDocument(doc.id, savedFile);
        await qc.invalidateQueries({ queryKey: ['document', doc.id] });
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsDirty(false);
      },
    });
    server.setUser({ id: String(session.profile.id), name: session.profile.name });
    server.setKey(doc.collabKey);

    const onSockConnect = ({ socket }: any) => {
      server.handleConnect({ socket });
    };
    const onSockDisconnect = ({ socket }: any) => {
      server.handleDisconnect({ socket });
    };
    MockSocket.on('connect', onSockConnect);
    MockSocket.on('disconnect', onSockDisconnect);

    let destroyed = false;
    let cleanupInjected = () => {};

    const localIo = (url?: string, options?: MockSocketOptions) =>
      io(url, {
        ...(options || {}),
        debug: !!(import.meta as any).env?.DEV,
      });

    window.__EDUCOLLAB_OFFICE_IO__ = localIo;

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
      if (!holder || holder.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.className = 'hidden h-0 w-0';
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

      Object.assign(win, {
        io: localIo,
        XMLHttpRequest: XHR,
        fetch: fetchProxy,
        Worker: function (url: string, options?: WorkerOptions) {
          const u = new URL(url, location.origin);
          return new _Worker(u.href.replace(u.origin, location.origin), options);
        },
      });

      try {
        (win as any).uitheme = (win as any).uitheme || {};
        (win as any).uitheme.embedicons = true;
      } catch {
        // ignore
      }

      const script = iframeDoc.createElement('script');
      script.src = apiUrl;
      iframeDoc.body.appendChild(script);

      cleanupInjected = () => {
        try {
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

        editorInstanceRef.current = new window.DocsAPI!.DocEditor('onlyoffice-editor', {
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
              mode: 'strict',
              change: false,
            },
            user: { ...u },
            customization: {
              compactHeader: false,
              compactToolbar: false,
              forcesave: true,
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
            onDocumentReady: () => {
              setLastSavedAt((prev) => prev || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            },
            onDocumentStateChange: (event: any) => {
              const changed = Boolean(event?.data);
              setIsDirty(changed);
            },
            onError: (e: any) => {
              console.error('OnlyOffice error', e);
            },
          },
          width: '100%',
          height: 'calc(100vh - 150px)',
          type: 'desktop',
        });

        server.setClient({ buildVersion: window.DocsAPI!.DocEditor.version() });
      } catch (e: any) {
        console.error(e);
        setEditorError(e?.message || String(e));
        setRuntimeReady(false);
      }
    };

    void boot();

    return () => {
      destroyed = true;
      cleanupInjected();
      try {
        editorInstanceRef.current?.destroyEditor?.();
      } catch {
        // ignore
      }
      editorInstanceRef.current = null;
      MockSocket.off('connect', onSockConnect);
      MockSocket.off('disconnect', onSockDisconnect);
      try {
        delete window.__EDUCOLLAB_OFFICE_IO__;
      } catch {
        // ignore
      }
    };
  }, [api, doc.collabKey, doc.fileAssetId, doc.id, doc.officeExt, doc.title, primaryDownloadUrl, qc, reloadKey, session]);

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="w-full space-y-3">
        <div className="rounded-3xl border bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <FileCog size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{doc.title}</h2>
                    <Badge variant="outline">Office · {(doc.officeExt || 'file').toUpperCase()}</Badge>
                    <Badge variant="outline">单人编辑</Badge>
                    {isDirty ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">未保存修改</Badge> : <Badge variant="outline">已保存</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{doc.projectName}</span>
                    <span>·</span>
                    <span>最近保存：{lastSavedAt || '尚未保存'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogTrigger render={<Button variant="outline" className="rounded-full" />}>重命名</DialogTrigger>
                <DialogContent className="max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>重命名文档</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>标题</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="请输入文档标题" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renameM.isPending}>取消</Button>
                    <Button
                      onClick={async () => {
                        const next = title.trim();
                        if (!next) return;
                        await renameM.mutateAsync(next);
                        setRenameOpen(false);
                      }}
                      disabled={!title.trim() || renameM.isPending}
                    >
                      {renameM.isPending ? '保存中…' : '保存'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                disabled={deleteM.isPending}
                onClick={() => {
                  if (!confirm('确定要删除该文档吗？删除后不可恢复。')) return;
                  deleteM.mutate();
                }}
              >
                <Trash2 size={14} className="mr-2" />
                {deleteM.isPending ? '删除中…' : '删除'}
              </Button>

              {primaryDownloadUrl ? (
                <a href={primaryDownloadUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Download size={14} /> 下载
                  </Button>
                </a>
              ) : (
                <Button variant="outline" disabled>下载</Button>
              )}

              <Button className="gap-2" disabled={!runtimeReady || saveCurrentM.isPending} onClick={() => saveCurrentM.mutate()}>
                <Save size={14} /> {saveCurrentM.isPending ? '保存中…' : '保存当前编辑'}
              </Button>

              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAndSaveM.mutate(f);
                    e.currentTarget.value = '';
                  }}
                />
                <Button disabled={uploadAndSaveM.isPending} variant="outline" className="gap-2">
                  <Upload size={14} /> {uploadAndSaveM.isPending ? '上传中…' : '上传覆盖'}
                </Button>
              </label>
            </div>
          </div>
        </div>

        <div id="onlyoffice-preload-holder" />

        <div className="rounded-3xl border border-muted/70 bg-white shadow-[0_24px_80px_rgba(9,15,25,0.06)]">
          <div className="flex h-12 items-center justify-between border-b px-4 text-sm">
            <div className="truncate font-semibold">{doc.title}</div>
            <div className="text-xs text-muted-foreground">OnlyOffice 单人编辑工作台</div>
          </div>
          {!runtimeReady || !window.DocsAPI?.DocEditor ? (
            <div className="p-4 text-sm text-muted-foreground space-y-2">
              <div className="font-medium text-foreground">Office 编辑器未就绪</div>
              {editorError ? <div className="text-xs text-red-600 break-all">{editorError}</div> : null}
              <div className="text-[12px]">如一直卡住，请先硬刷新（⌘⇧R）并查看控制台报错。</div>
            </div>
          ) : (
            <div className="w-full overflow-visible bg-muted/10" style={{ height: 'calc(100vh - 150px)', minHeight: '820px' }}>
              <div
                id="onlyoffice-editor"
                className="h-full w-full bg-muted/10"
                style={{ height: '100%', minHeight: '820px' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
