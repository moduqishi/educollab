import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Clock,
  Users,
  Share2,
  History,
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  Upload,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';
import type { DocumentRecord, DocumentVersionRecord, FileAssetRecord, ProjectDetail } from '@/lib/types';
import { COLLAB_BASE, stripHtml } from '@/lib/mappers';

type Api = ReturnType<typeof createApiClient>;

export function Documents({ api, detail, onRefresh }: { api: Api; detail: ProjectDetail; onRefresh: () => Promise<void> }) {
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  const projectDocs = detail.documents;
  const selectedDoc = projectDocs.find((d) => d.id === selectedDocId) || null;

  const createDoc = async () => {
    if (!newDocTitle.trim()) return;
    await api.createDocument({ projectId: detail.project.id, title: newDocTitle.trim(), currentContent: '' });
    setNewDocTitle('');
    setIsAddingDoc(false);
    await onRefresh();
  };

  if (selectedDocId && selectedDoc) {
    return (
      <DocumentEditor
        api={api}
        initialDoc={selectedDoc}
        onClose={async () => {
          setSelectedDocId(null);
          await onRefresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search documents..." className="pl-10" />
        </div>
        <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={16} /> New Document
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDesc>Start a new collaborative document.</DialogDesc>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="doc-title">Document Title</Label>
                <Input id="doc-title" placeholder="Enter document title..." value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingDoc(false)}>
                Cancel
              </Button>
              <Button onClick={createDoc} disabled={!newDocTitle.trim()}>
                Create Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectDocs.map((doc) => (
          <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-all border-muted/60" onClick={() => setSelectedDocId(doc.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg line-clamp-1">{doc.title}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Doc
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">{doc.excerpt || stripHtml(doc.currentContent || '').slice(0, 120) || '—'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {doc.collaborators?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {doc.updatedAt}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3 text-xs text-muted-foreground">
              Collab key: <span className="font-mono">{doc.collabKey}</span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!projectDocs.length && <p className="text-sm text-muted-foreground">No documents yet.</p>}
    </div>
  );
}

function DocumentEditor({ api, initialDoc, onClose }: { api: Api; initialDoc: DocumentRecord; onClose: () => Promise<void> }) {
  const [doc, setDoc] = useState<DocumentRecord>(initialDoc);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<'history' | 'files'>('history');

  const [content, setContent] = useState<string>(initialDoc.currentContent || '');
  const [isConnected, setIsConnected] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [files, setFiles] = useState<FileAssetRecord[]>([]);

  const saveTimer = useRef<number | null>(null);
  const autosaveInFlight = useRef<Promise<any> | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const suppressApplyRef = useRef(false);

  const reloadDoc = async () => {
    const latest = await api.documentDetail(doc.id);
    setDoc(latest);
    // Do not overwrite collaborative content; rely on yjs as source of truth.
  };

  const loadSideData = async () => {
    const [vs, fs] = await Promise.all([api.documentVersions(doc.id), api.files('DOCUMENT', doc.id)]);
    setVersions(vs);
    setFiles(fs);
  };

  useEffect(() => {
    loadSideData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // Setup Yjs + Hocuspocus
  useEffect(() => {
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

    provider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    // Awareness: set minimal identity (optional)
    try {
      provider.awareness?.setLocalStateField?.('user', { name: 'me' });
    } catch {}

    const applyFromY = () => {
      if (suppressApplyRef.current) return;
      setContent(ytext.toString());
    };
    ytext.observe(applyFromY);

    // Seed from backend when document is empty.
    // (We only do this once after provider connects, to avoid fighting remote state.)
    const seed = () => {
      const current = ytext.toString();
      if (!current && (initialDoc.currentContent || '').trim()) {
        suppressApplyRef.current = true;
        ydoc.transact(() => {
          ytext.insert(0, initialDoc.currentContent || '');
        });
        suppressApplyRef.current = false;
        setContent(ytext.toString());
      }
    };
    const seedTimer = window.setTimeout(seed, 600);

    return () => {
      window.clearTimeout(seedTimer);
      ytext.unobserve(applyFromY);
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
      ydocRef.current = null;
      ytextRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.collabKey, doc.id]);

  // Debounced autosave to backend
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const payload = {
          currentContent: content,
          excerpt: stripHtml(content).slice(0, 80),
          saveVersion: false,
        };
        autosaveInFlight.current = api.autosaveDocument(doc.id, payload);
        await autosaveInFlight.current;
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        await reloadDoc();
      } catch (e) {
        console.error(e);
      }
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [content, api, doc.id]);

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

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Editor Top Bar */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onClose()}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-none truncate max-w-[320px]">{doc.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Save size={10} /> {lastSavedAt ? `Auto-saved at ${lastSavedAt}` : 'Auto-save enabled'}
                <span className={cn('ml-2 inline-flex items-center gap-1', isConnected ? 'text-green-600' : 'text-amber-600')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-green-500' : 'bg-amber-500')} />
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex -space-x-2 mr-2">
            {(doc.collaborators || []).slice(0, 3).map((name) => (
              <div key={name} className="relative">
                <Avatar className="w-8 h-8 border-2 border-white">
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-green-500" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <RenameButton
              title={doc.title}
              onRename={async (nextTitle) => {
                const updated = await api.renameDocument(doc.id, nextTitle);
                setDoc(updated);
              }}
            />
            <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => setActiveSideTab('files')}>
              <Paperclip size={14} /> Files
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => setActiveSideTab('history')}>
              <History size={14} /> History
            </Button>
            <Button variant="default" size="sm" className="rounded-full px-6 gap-2">
              <Share2 size={14} /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Area */}
        <ScrollArea className="flex-1 bg-muted/20">
          <div className="max-w-4xl mx-auto my-12 bg-white shadow-sm border min-h-[900px] p-10 md:p-16 rounded-sm">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-bold">{doc.title}</h1>
              <Button variant="outline" size="sm" className="gap-2" onClick={async () => { await loadSideData(); }}>
                <RotateCcw size={14} /> Sync
              </Button>
            </div>
            <div className="prose prose-slate max-w-none">
              <textarea
                value={content}
                onChange={(e) => replaceContent(e.target.value)}
                placeholder="Start writing here… (collaborative)"
                className="w-full min-h-[680px] resize-none bg-transparent outline-none leading-relaxed text-[15px]"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Right Sidebar */}
        {showSidebar ? (
          <div className="w-80 border-l flex flex-col bg-white">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-sm font-bold">{activeSideTab === 'history' ? 'History' : 'Files'}</h4>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(false)}>
                <ChevronRight size={16} />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {activeSideTab === 'history' ? (
                  <>
                    <SaveVersionButton
                      onSave={async (label) => {
                        await api.saveDocumentVersion(doc.id, { currentContent: content, versionLabel: label });
                        await loadSideData();
                      }}
                    />
                    <div className="space-y-3">
                      {versions.map((v) => (
                        <div key={v.id} className="p-3 rounded-xl border bg-muted/20 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{v.label || 'Version'}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {v.createdBy} • {v.createdAt}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={async () => {
                                const restored = await api.restoreDocumentVersion(v.id);
                                replaceContent(restored.currentContent || '');
                                await loadSideData();
                              }}
                            >
                              Restore
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{stripHtml(v.snapshotContent || '').slice(0, 160) || '—'}</p>
                        </div>
                      ))}
                      {!versions.length && <p className="text-sm text-muted-foreground">No versions.</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <UploadFileButton
                      onUpload={async (file) => {
                        await api.uploadFile('DOCUMENT', doc.id, file);
                        setFiles(await api.files('DOCUMENT', doc.id));
                      }}
                    />
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="p-3 rounded-xl border bg-muted/20 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{f.fileName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {f.mimeType} • {Math.round((f.sizeBytes || 0) / 1024)} KB
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => window.open(api.downloadFileUrl(f.id), '_blank', 'noopener,noreferrer')}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                      {!files.length && <p className="text-sm text-muted-foreground">No files uploaded.</p>}
                    </div>
                  </>
                )}

                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collaboration</p>
                  <p className="text-xs text-muted-foreground">
                    Server: <span className="font-mono">{COLLAB_BASE}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Key: <span className="font-mono">{doc.collabKey}</span>
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="w-10 border-l bg-white flex items-start justify-center pt-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(true)}>
              <ChevronLeft size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveVersionButton({ onSave }: { onSave: (label: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full gap-2" />}>
        <Save size={14} /> Save Version
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Version</DialogTitle>
          <DialogDesc>Create a named snapshot for this document.</DialogDesc>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Milestone draft" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!label.trim()) return;
              setSaving(true);
              try {
                await onSave(label.trim());
                setLabel('');
                setOpen(false);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !label.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadFileButton({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            await onUpload(file);
          } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
          }
        }}
      />
      <Button className="w-full gap-2" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload File'}
      </Button>
    </div>
  );
}

function RenameButton({ title, onRename }: { title: string; onRename: (next: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValue(title), [title]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="gap-2 text-xs" />}>
        <Edit3 size={14} /> Rename
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDesc>Change the title of this document.</DialogDesc>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Title</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!value.trim()) return;
              setSaving(true);
              try {
                await onRename(value.trim());
                setOpen(false);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !value.trim() || value.trim() === title.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
