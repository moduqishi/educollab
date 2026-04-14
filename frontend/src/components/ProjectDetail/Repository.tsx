import React, { useEffect, useState } from 'react';
import { Folder, File, GitBranch, GitCommit, GitMerge, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';
import type { ProjectDetail } from '@/lib/types';

type Api = ReturnType<typeof createApiClient>;

export function Repository({ api, detail, onRefresh }: { api: Api; detail: ProjectDetail; onRefresh: () => Promise<void> }) {
  const projectId = detail.project.id;
  const [activeTab, setActiveTab] = useState<'files' | 'commits' | 'branches' | 'mrs'>('files');
  const [currentBranch, setCurrentBranch] = useState('main');

  const [branches, setBranches] = useState<string[]>(detail.branches || []);
  const [commits, setCommits] = useState(detail.commits || []);
  const [files, setFiles] = useState<Array<{ path: string; type: string }>>([]);

  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [b, c, f] = await Promise.all([api.branches(projectId), api.commits(projectId), api.filesTree(projectId)]);
      setBranches(b);
      setCommits(c);
      setFiles(f);
      if (!b.includes(currentBranch) && b[0]) setCurrentBranch(b[0]);
    } catch (e) {
      // If repo not initialized, some endpoints may fail; keep UI usable.
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={currentBranch} onValueChange={setCurrentBranch}>
            <SelectTrigger className="w-[200px] bg-white">
              <GitBranch size={16} className="mr-2" />
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {(branches.length ? branches : ['main']).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-0.5 rounded">EduCollab / {detail.project.name.toLowerCase().replace(/\s+/g, '-')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={async () => {
              await api.initRepository(projectId);
              await loadAll();
              await onRefresh();
            }}
          >
            Init Repo <ExternalLink size={14} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="files" className="gap-2">
            <Folder size={14} /> Files
          </TabsTrigger>
          <TabsTrigger value="commits" className="gap-2">
            <GitCommit size={14} /> Commits
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <GitBranch size={14} /> Branches
          </TabsTrigger>
          <TabsTrigger value="mrs" className="gap-2">
            <GitMerge size={14} /> Merge Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader className="py-3 bg-muted/30 border-b">
              <CardTitle className="text-sm">Repository Files</CardTitle>
              <CardDescription className="text-xs">Top-level tree of HEAD</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {files.map((node) => (
                <FileRow key={node.path} name={node.path} type={node.type === 'directory' ? 'folder' : 'file'} />
              ))}
              {!files.length && <div className="p-6 text-sm text-muted-foreground">No files (repo not initialized yet?).</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commits" className="space-y-4">
          <div className="space-y-3">
            {commits.map((c) => (
              <Card key={c.hash} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                      <GitCommit size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{c.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.authorName} • {c.createdAt} • <span className="font-mono">{c.branch}</span>
                      </p>
                    </div>
                  </div>
                  <code className="text-[10px] bg-muted px-2 py-1 rounded">{c.hash}</code>
                </CardContent>
              </Card>
            ))}
            {!commits.length && <p className="text-sm text-muted-foreground">No commits.</p>}
          </div>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <div className="flex justify-end">
            <CreateBranchButton
              api={api}
              projectId={projectId}
              onDone={async () => {
                await loadAll();
                await onRefresh();
              }}
            />
          </div>
          <div className="space-y-3">
            {(branches.length ? branches : ['main']).map((b) => (
              <Card key={b} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <GitBranch size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{b}</p>
                      <p className="text-[10px] text-muted-foreground">Branch</p>
                    </div>
                  </div>
                  {b === 'main' && <Badge className="bg-green-100 text-green-700 border-green-200">Default</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mrs" className="space-y-4">
          <div className="flex justify-end">
            <CreateMrButton
              api={api}
              projectId={projectId}
              branches={branches.length ? branches : ['main']}
              onDone={async () => {
                await onRefresh();
              }}
            />
          </div>

          <div className="space-y-3">
            {detail.mergeRequests.map((mr) => (
              <Card key={mr.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{mr.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono bg-primary/5 text-primary px-1 rounded">{mr.sourceBranch}</span> →{' '}
                      <span className="font-mono bg-primary/5 text-primary px-1 rounded">{mr.targetBranch}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={mr.status === 'OPEN' ? 'default' : 'secondary'} className="capitalize">
                      {mr.status.toLowerCase()}
                    </Badge>
                    {mr.status === 'OPEN' && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await api.mergeMergeRequest(mr.id);
                          await onRefresh();
                        }}
                      >
                        Merge
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!detail.mergeRequests.length && <p className="text-sm text-muted-foreground">No merge requests.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FileRow({ name, type }: { name: string; type: 'folder' | 'file' }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/20 cursor-pointer group">
      <div className="flex items-center gap-3 flex-1">
        {type === 'folder' ? <Folder size={18} className="text-blue-500 fill-blue-500/20" /> : <File size={18} className="text-muted-foreground" />}
        <span className="text-sm font-medium group-hover:text-primary transition-colors">{name}</span>
      </div>
    </div>
  );
}

function CreateBranchButton({ api, projectId, onDone }: { api: Api; projectId: number; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('feat/');
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus size={16} /> New Branch
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Branch</DialogTitle>
          <DialogDesc>Create a new git branch for this project.</DialogDesc>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="feat/my-change" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              setSaving(true);
              try {
                await api.createBranch(projectId, name.trim());
                setOpen(false);
                setName('feat/');
                await onDone();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMrButton({
  api,
  projectId,
  branches,
  onDone,
}: {
  api: Api;
  projectId: number;
  branches: string[];
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState(branches[0] || 'main');
  const [target, setTarget] = useState('main');

  useEffect(() => {
    if (!branches.includes(source)) setSource(branches[0] || 'main');
    if (!branches.includes(target)) setTarget('main');
  }, [branches]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Plus size={16} /> New MR
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Merge Request</DialogTitle>
          <DialogDesc>Create a merge request record (no actual git merge is performed in this demo).</DialogDesc>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Add auth flow" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!title.trim()) return;
              setSaving(true);
              try {
                await api.createMergeRequest({ projectId, title: title.trim(), sourceBranch: source, targetBranch: target });
                setTitle('');
                setOpen(false);
                await onDone();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !title.trim()}
          >
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
