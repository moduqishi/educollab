import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { UserMinus, UserCog } from 'lucide-react';
import { useApi } from '@/app/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTeamDetail } from './TeamDetailLayout';

export function TeamMembersTab() {
  const { detail, currentUserId, refresh } = useTeamDetail();
  const api = useApi();
  const [kickUserId, setKickUserId] = React.useState<number | null>(null);
  const [kickUserName, setKickUserName] = React.useState('');
  const [kickError, setKickError] = React.useState('');

  const kickM = useMutation({
    mutationFn: (userId: number) => api.removeTeamMember(detail.id, userId),
    onSuccess: async () => { setKickUserId(null); await refresh(); },
    onError: (err: Error) => setKickError(err.message),
  });

  const transferM = useMutation({
    mutationFn: (leaderUserId: number) => api.transferTeamLeader(detail.id, leaderUserId),
    onSuccess: async () => { await refresh(); },
  });

  const canManage = detail.currentUserLeader && !detail.teacherView;

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">团队成员</CardTitle>
            {canManage && (
              <div className="flex items-center gap-2 border rounded-full px-3 py-1.5">
                <UserCog size={14} className="text-muted-foreground" />
                <select
                  className="bg-transparent text-sm outline-none"
                  defaultValue=""
                  onChange={e => { const id = Number(e.target.value); if (id) transferM.mutate(id); }}
                >
                  <option value="" disabled>转让队长</option>
                  {detail.members.filter(m => !m.leader && m.userId !== currentUserId).map(m => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.members.map(member => (
            <div key={member.userId} className="flex items-center justify-between rounded-2xl border border-muted/70 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{member.name?.slice(0, 1) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.leader ? <Badge>队长</Badge> : <Badge variant="outline">队员</Badge>}
                {canManage && !member.leader && (
                  <Button
                    size="sm" variant="ghost"
                    className="text-destructive hover:text-destructive gap-1"
                    onClick={() => { setKickUserId(member.userId); setKickUserName(member.name); setKickError(''); }}
                  >
                    <UserMinus size={14} />移除
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={kickUserId !== null} onOpenChange={open => { if (!open) setKickUserId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>移除成员</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">确定要将 <strong>{kickUserName}</strong> 从团队中移除吗？该操作不可撤销。</p>
            {kickError && <div className="text-sm text-destructive">{kickError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickUserId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => kickUserId && kickM.mutate(kickUserId)} disabled={kickM.isPending}>
              {kickM.isPending ? '移除中...' : '确认移除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
