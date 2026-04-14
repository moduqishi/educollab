import React from 'react';
import { Filter, Mail, Plus, UserPlus, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ProjectMembersPage() {
  const api = useApi();
  const { detail, refresh } = useProjectDetail();

  React.useEffect(() => setTitle([detail.project.name, 'Members']), [detail.project.name]);

  const [kw, setKw] = React.useState('');
  const members = (detail.members || []).filter((m) => {
    const q = kw.trim().toLowerCase();
    if (!q) return true;
    return `${m.name} ${m.email}`.toLowerCase().includes(q);
  });

  const tasksByAssignee = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of detail.tasks || []) map.set(t.assigneeName, (map.get(t.assigneeName) || 0) + 1);
    return map;
  }, [detail.tasks]);
  const postsByAuthor = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const p of detail.discussions || []) map.set(p.authorName, (map.get(p.authorName) || 0) + 1);
    return map;
  }, [detail.discussions]);
  const commitsByAuthor = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of detail.commits || []) map.set(c.authorName, (map.get(c.authorName) || 0) + 1);
    return map;
  }, [detail.commits]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Search members..." className="rounded-full" />
        </div>
        <Button variant="outline" size="icon" className="rounded-full" title="Filter (coming soon)">
          <Filter size={16} />
        </Button>
        <InviteMemberButton projectId={detail.project.id} onDone={refresh} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {members.map((m) => (
          <Card key={m.id} className="border-muted/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={m.avatar} />
                    <AvatarFallback>{m.name?.slice(0, 1) || 'U'}</AvatarFallback>
                  </Avatar>
                  <RemoveMemberButton projectId={detail.project.id} userId={m.id} userName={m.name} onDone={refresh} />
                </div>

                <div className="mt-4">
                  <div className="text-lg font-semibold">{m.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                    <Mail size={14} />
                    <span className="truncate">{m.email}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {String(m.role || '').toLowerCase()}
                  </Badge>
                </div>
              </div>

              <div className="border-t bg-muted/10 py-5 px-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Stat label="TASKS" value={tasksByAssignee.get(m.name) || 0} />
                  <Stat label="POSTS" value={postsByAuthor.get(m.name) || 0} />
                  <Stat label="COMMITS" value={commitsByAuthor.get(m.name) || 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-muted/60">
        <CardContent className="p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <UserPlus size={22} className="text-muted-foreground" />
          </div>
          <div className="mt-4 text-base font-semibold">Need more help?</div>
          <div className="mt-1 text-sm text-muted-foreground">Invite your classmates or teaching assistants to collaborate on this project.</div>
          <div className="mt-6">
            <InviteMemberButton projectId={detail.project.id} onDone={refresh} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function InviteMemberButton({ projectId, onDone }: { projectId: number; onDone: () => Promise<void> }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [userId, setUserId] = React.useState<number | null>(null);

  const usersQ = useQuery({
    queryKey: ['users'],
    enabled: open,
    queryFn: () => api.users(),
  });

  const addM = useMutation({
    mutationFn: () => api.addProjectMember(projectId, userId!),
    onSuccess: async () => {
      setOpen(false);
      setUserId(null);
      await onDone();
    },
  });

  const users = usersQ.data || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-full gap-2" />}>
        <UserPlus size={16} /> Invite Member
      </DialogTrigger>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>User</Label>
          <Select value={userId ? String(userId) : ''} onValueChange={(v) => setUserId(Number(v))}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder={usersQ.isLoading ? 'Loading…' : 'Select a user'} />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[11px] text-muted-foreground">只有项目负责人或教师端可以邀请/移除成员。</div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={addM.isPending}>
            Cancel
          </Button>
          <Button className="rounded-full" disabled={!userId || addM.isPending} onClick={() => addM.mutate()}>
            {addM.isPending ? 'Inviting…' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberButton({
  projectId,
  userId,
  userName,
  onDone,
}: {
  projectId: number;
  userId: number;
  userName: string;
  onDone: () => Promise<void>;
}) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const removeM = useMutation({
    mutationFn: () => api.removeProjectMember(projectId, userId),
    onSuccess: async () => {
      setOpen(false);
      await onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon" className="rounded-full" title="Remove" />}>
        <X size={14} />
      </DialogTrigger>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Remove member</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Remove <span className="font-medium text-foreground">{userName}</span> from this project?
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={removeM.isPending}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={() => removeM.mutate()} disabled={removeM.isPending}>
            {removeM.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
