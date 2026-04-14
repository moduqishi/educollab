import React from 'react';
import { Plus, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription as DialogDesc, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { createApiClient } from '@/lib/api';
import type { ProjectDetail } from '@/lib/types';

type Api = ReturnType<typeof createApiClient>;

export function Releases({ api, detail, onRefresh }: { api: Api; detail: ProjectDetail; onRefresh: () => Promise<void> }) {
  const isCode = detail.project.type === 'CODE';
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [version, setVersion] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  const create = async () => {
    if (!version.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await api.createRelease({ projectId: detail.project.id, version: version.trim(), title: title.trim(), description: description.trim() });
      setOpen(false);
      setVersion('');
      setTitle('');
      setDescription('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display font-bold">{isCode ? 'Releases' : 'Versions'}</h3>
          <p className="text-muted-foreground">{isCode ? 'Track releases for this repository.' : 'Track project versions and milestones.'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={16} /> New {isCode ? 'Release' : 'Version'}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create {isCode ? 'Release' : 'Version'}</DialogTitle>
              <DialogDesc>Publish a new entry for this project.</DialogDesc>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. v0.1.0" />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Alpha Release" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[140px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={create} disabled={saving || !version.trim() || !title.trim()}>
                {saving ? 'Publishing…' : 'Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {detail.releases.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-all border-muted/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag size={16} className="text-muted-foreground" /> {r.title}
                  </CardTitle>
                  <CardDescription>{r.createdAt}</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {r.version}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description || '—'}</p>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3 text-xs text-muted-foreground">
              Project #{detail.project.id}
            </CardFooter>
          </Card>
        ))}
      </div>

      {!detail.releases.length && <p className="text-sm text-muted-foreground">No releases yet.</p>}
    </div>
  );
}
