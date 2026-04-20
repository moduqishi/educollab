import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Copy, Plus, Search, Users, X } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import type { CourseRecord, TeamRecord } from '@/lib/types';

export function TeamsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { session } = useAuth();
  const [teamSearch, setTeamSearch] = React.useState('');

  React.useEffect(() => setTitle(['团队']), []);

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.teams() });
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() });

  const generateInviteCodeM = useMutation({
    mutationFn: (teamId: number) => api.generateTeamInviteCode(teamId),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['teams'] }); },
  });

  const joinByCodeM = useMutation({
    mutationFn: (inviteCode: string) => api.joinTeamByCode(inviteCode),
    onSuccess: async (team) => {
      await qc.invalidateQueries({ queryKey: ['teams'] });
      nav(`/app/teams/${team.id}/overview`);
    },
  });

  const createTeamStandaloneM = useMutation({
    mutationFn: (payload: { name: string; courseId: number | null }) => api.createTeamStandalone(payload),
    onSuccess: async (team) => {
      await qc.invalidateQueries({ queryKey: ['teams'] });
      nav(`/app/teams/${team.id}/overview`);
    },
  });

  if (teamsQ.isLoading) return <PageLoading label="正在加载团队..." />;
  if (teamsQ.isError) return <PageError title="团队加载失败" onRetry={() => teamsQ.refetch()} />;

  const teams = teamsQ.data || [];
  const filtered = teams.filter(t =>
    !teamSearch.trim() ||
    t.name?.toLowerCase().includes(teamSearch.trim().toLowerCase()) ||
    (t.courseName || '').toLowerCase().includes(teamSearch.trim().toLowerCase())
  );

  return (
    <div>
      <PageHero title="团队工作台" subtitle="在这里管理团队成员、任务分配和周报记录。" />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[900px]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">我的团队</CardTitle>
                  <div className="flex gap-2">
                    <CreateTeamDialog
                      courses={coursesQ.data || []}
                      onSubmit={p => createTeamStandaloneM.mutateAsync(p).then(() => {})}
                      busy={createTeamStandaloneM.isPending}
                    />
                    <JoinTeamDialog onSubmit={c => joinByCodeM.mutateAsync(c).then(() => {})} busy={joinByCodeM.isPending} />
                  </div>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                    placeholder="搜索团队名称..."
                    className="w-full h-8 rounded-xl border border-muted/60 bg-muted/20 pl-9 pr-8 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                  {teamSearch && (
                    <button onClick={() => setTeamSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!teams.length ? (
                <PageEmpty
                  title={teamSearch ? '没有找到匹配的团队' : '还没有团队'}
                  message={teamSearch ? '请尝试其他搜索词' : '通过邀请码加入或前往课程创建。'}
                  icon={Users}
                  action={!teamSearch ? <Button onClick={() => nav('/app/classes')}>前往课程</Button> : undefined}
                />
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">没有找到匹配的团队</div>
              ) : (
                filtered.map((team) => (
                  <button
                    key={team.id}
                    className="w-full rounded-2xl border border-muted/70 p-4 text-left transition hover:bg-muted/30"
                    onClick={() => nav(`/app/teams/${team.id}/overview`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{team.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {team.courseName || '未关联课程'} · {team.memberCount} 人 · 队长：{team.leaderName || '未设置'}
                        </div>
                      </div>
                      {session?.profile.id === team.leaderId && (
                        <InviteMemberDialog
                          team={team}
                          onGenerate={() => generateInviteCodeM.mutateAsync(team.id).then(() => {})}
                          busy={generateInviteCodeM.isPending}
                        />
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JoinTeamDialog({ onSubmit, busy }: { onSubmit: (code: string) => Promise<void>; busy: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setError('');
    try {
      await onSubmit(code.trim().toUpperCase());
      setCode('');
      setOpen(false);
    } catch {
      setError('邀请码无效或已失效');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">加入团队</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>通过邀请码加入团队</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>邀请码</Label>
            <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="输入 8 位邀请码" className="font-mono tracking-wider" />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!code.trim() || busy}>{busy ? '加入中...' : '加入'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberDialog({ team, onGenerate, busy }: { team: { id: number; inviteCode: string | null }; onGenerate: () => Promise<void>; busy: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const code = team.inviteCode;
  const displayCode = code || (busy ? '生成中...' : '点击生成邀请码');

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleGenerate = async () => { await onGenerate(); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline">邀请成员</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>邀请成员加入团队</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-xs text-muted-foreground mb-2">邀请码</div>
            <div className="font-mono text-2xl font-bold tracking-widest">{displayCode}</div>
          </div>
          <div className="text-sm text-muted-foreground">将此邀请码分享给对方，对方可在团队页面输入邀请码加入。</div>
        </div>
        <DialogFooter>
          {!code ? (
            <Button onClick={handleGenerate} disabled={busy} className="w-full">{busy ? '生成中...' : '生成邀请码'}</Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleGenerate} disabled={busy} className="flex-1">重新生成</Button>
              <Button onClick={handleCopy} className="flex-1 gap-1"><Copy size={14} />{copied ? '已复制' : '复制邀请码'}</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTeamDialog({ courses, onSubmit, busy }: { courses: CourseRecord[]; onSubmit: (p: { name: string; courseId: number | null }) => Promise<void>; busy: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [courseId, setCourseId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('请输入团队名称'); return; }
    setError('');
    try {
      await onSubmit({ name: name.trim(), courseId });
      setName('');
      setCourseId(null);
      setOpen(false);
    } catch { setError('创建失败，请重试'); }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) { setName(''); setCourseId(null); setError(''); }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="default"><Plus size={14} className="mr-1" />创建团队</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>创建新团队</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>团队名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入团队名称" />
          </div>
          <div className="space-y-2">
            <Label>关联课程（可选）</Label>
            <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={courseId ?? ''} onChange={e => setCourseId(Number(e.target.value) || null)}>
              <option value="">不关联课程</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}（{c.teacherName}）</option>)}
            </select>
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || busy}>{busy ? '创建中...' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// StandaloneTeamOverview is in TeamDetailLayout.tsx