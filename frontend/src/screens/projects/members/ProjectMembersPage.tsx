import React from 'react';
import { Filter, Mail, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ProjectMemberCandidate } from '@/lib/types';

export function ProjectMembersPage() {
  const { detail, refresh } = useProjectDetail();
  const [keyword, setKeyword] = React.useState('');

  React.useEffect(() => setTitle([detail.project.name, '项目成员']), [detail.project.name]);

  const members = (detail.members || []).filter((member) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return true;
    return `${member.name} ${member.email}`.toLowerCase().includes(normalized);
  });

  const tasksByAssignee = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const task of detail.tasks || []) {
      map.set(task.assigneeName, (map.get(task.assigneeName) || 0) + 1);
    }
    return map;
  }, [detail.tasks]);

  const postsByAuthor = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const post of detail.discussions || []) {
      map.set(post.authorName, (map.get(post.authorName) || 0) + 1);
    }
    return map;
  }, [detail.discussions]);

  const commitsByAuthor = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const commit of detail.commits || []) {
      map.set(commit.authorName, (map.get(commit.authorName) || 0) + 1);
    }
    return map;
  }, [detail.commits]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索项目成员姓名或邮箱" className="rounded-full pl-10" />
        </div>
        <Button variant="outline" size="icon" className="rounded-full" title="筛选功能后续补充">
          <Filter size={16} />
        </Button>
        <InviteMemberButton projectId={detail.project.id} canManage={detail.currentUserCanManageMembers} onDone={refresh} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id} className="overflow-hidden border-muted/60">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name?.slice(0, 1) || 'U'}</AvatarFallback>
                  </Avatar>
                  {detail.currentUserCanManageMembers ? (
                    <RemoveMemberButton projectId={detail.project.id} userId={member.id} userName={member.name} isOwner={member.owner} onDone={refresh} />
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{member.name}</div>
                    {member.owner ? (
                      <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                        队长
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={14} />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {member.role === 'TEACHER' ? '教师' : member.role === 'STUDENT' ? '学生' : member.role}
                  </Badge>
                </div>
              </div>

              <div className="border-t bg-muted/10 px-6 py-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Stat label="任务数" value={tasksByAssignee.get(member.name) || 0} />
                  <Stat label="讨论数" value={postsByAuthor.get(member.name) || 0} />
                  <Stat label="提交数" value={commitsByAuthor.get(member.name) || 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!members.length ? (
        <Card className="border-dashed border-muted/60">
          <CardContent className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users size={22} className="text-muted-foreground" />
            </div>
            <div className="mt-4 text-base font-semibold">没有匹配的项目成员</div>
          <div className="mt-1 text-sm text-muted-foreground">试试更换关键词，或者让队长直接邀请课程成员加入项目。</div>
          </CardContent>
        </Card>
      ) : null}
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

function InviteMemberButton({ projectId, canManage, onDone }: { projectId: number; canManage: boolean; onDone: () => Promise<void> }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState('');
  const [selectedCandidate, setSelectedCandidate] = React.useState<ProjectMemberCandidate | null>(null);

  const candidatesQuery = useQuery({
    queryKey: ['projectMemberCandidates', projectId],
    enabled: open && canManage,
    queryFn: () => api.projectMemberCandidates(projectId),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCandidate) throw new Error('请先选择要加入项目的成员');
      await api.addProjectMember(projectId, selectedCandidate.id);
    },
    onSuccess: async () => {
      setOpen(false);
      setKeyword('');
      setSelectedCandidate(null);
      await onDone();
    },
  });

  const candidates = candidatesQuery.data || [];
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredCandidates = React.useMemo(() => {
    if (!normalizedKeyword) return candidates;
    return candidates.filter((candidate) => `${candidate.name} ${candidate.email}`.toLowerCase().includes(normalizedKeyword));
  }, [candidates, normalizedKeyword]);

  const detectedCandidate = React.useMemo(() => {
    if (!normalizedKeyword) return null;
    return (
      candidates.find((candidate) => candidate.email.toLowerCase() === normalizedKeyword) ||
      candidates.find((candidate) => candidate.name.toLowerCase() === normalizedKeyword) ||
      filteredCandidates[0] ||
      null
    );
  }, [candidates, filteredCandidates, normalizedKeyword]);

  const activeCandidate = selectedCandidate ?? detectedCandidate;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setKeyword('');
          setSelectedCandidate(null);
          addMutation.reset();
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-2 rounded-full" disabled={!canManage} title={canManage ? '邀请成员' : '只有项目队长可以邀请成员'} />}>
        <UserPlus size={16} />
        邀请成员
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>邀请成员加入项目</DialogTitle>
        </DialogHeader>

        {!canManage ? (
          <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">当前只有项目队长可以邀请或移除成员。</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">输入账号或邮箱</div>
              <div className="mt-1 text-xs text-muted-foreground">输入正确账号后会自动识别头像和名称，也可以直接从课程成员列表中点击选择。</div>
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="请输入账号或邮箱" className="mt-4 rounded-2xl" />

              {normalizedKeyword ? (
                activeCandidate ? (
                  <CandidateCard candidate={activeCandidate} selected={selectedCandidate?.id === activeCandidate.id} onSelect={() => setSelectedCandidate(activeCandidate)} />
                ) : (
                <div className="mt-4 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">未识别到可加入该项目的课程成员，请确认账号是否正确。</div>
                )
              ) : null}
            </div>

            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
              <div className="text-sm font-semibold">课程可邀请成员</div>
              <div className="mt-1 text-xs text-muted-foreground">只显示当前项目所属课程或队伍中、尚未加入项目的成员。</div>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {filteredCandidates.length} 人
                </Badge>
              </div>

              <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {candidatesQuery.isLoading ? <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">正在加载课程成员...</div> : null}
              {candidatesQuery.isError ? <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-destructive">课程成员加载失败，请稍后重试。</div> : null}
                {!candidatesQuery.isLoading && !candidatesQuery.isError && !filteredCandidates.length ? (
                  <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">当前没有可直接加入的成员。</div>
                ) : null}
                {!candidatesQuery.isLoading && !candidatesQuery.isError
                  ? filteredCandidates.map((candidate) => (
                      <CandidateCard key={candidate.id} candidate={candidate} selected={selectedCandidate?.id === candidate.id} onSelect={() => setSelectedCandidate(candidate)} compact />
                    ))
                  : null}
              </div>
            </div>

            {addMutation.isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {addMutation.error instanceof Error ? addMutation.error.message : '邀请失败，请稍后重试。'}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={addMutation.isPending}>
            取消
          </Button>
          <Button className="rounded-full" disabled={!canManage || !selectedCandidate || addMutation.isPending} onClick={() => addMutation.mutate()}>
            {addMutation.isPending ? '加入中...' : '直接加入项目'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
  compact = false,
}: {
  candidate: ProjectMemberCandidate;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-primary bg-primary/5' : 'border-muted/60 hover:border-primary/40 hover:bg-muted/20'}`}
    >
      <Avatar className={compact ? 'h-10 w-10' : 'h-11 w-11'}>
        <AvatarImage src={candidate.avatar} />
        <AvatarFallback>{candidate.name.slice(0, 1) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{candidate.name}</div>
        <div className="truncate text-xs text-muted-foreground">{candidate.email}</div>
      </div>
      <Badge variant={selected ? 'default' : 'outline'} className="rounded-full">
        {selected ? '已选择' : '选择'}
      </Badge>
    </button>
  );
}

function RemoveMemberButton({
  projectId,
  userId,
  userName,
  isOwner,
  onDone,
}: {
  projectId: number;
  userId: number;
  userName: string;
  isOwner: boolean;
  onDone: () => Promise<void>;
}) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);

  const removeMutation = useMutation({
    mutationFn: () => api.removeProjectMember(projectId, userId),
    onSuccess: async () => {
      setOpen(false);
      setConfirmed(false);
      await onDone();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setConfirmed(false);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="icon" className="rounded-full" title={isOwner ? '队长不能在这里移除自己' : '移除成员'} disabled={isOwner} />}>
        <X size={14} />
      </DialogTrigger>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>移除项目成员</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            只有项目队长可以移除成员。为避免误操作，请先勾选确认，再执行移除。
          </div>
          <label className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>我确认要将 {userName} 移出当前项目，并且知晓该成员会同时失去该项目的协作权限。</span>
          </label>
          {removeMutation.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {removeMutation.error instanceof Error ? removeMutation.error.message : '移除失败，请稍后重试。'}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={removeMutation.isPending}>
            取消
          </Button>
          <Button className="rounded-full" onClick={() => removeMutation.mutate()} disabled={!confirmed || removeMutation.isPending}>
            {removeMutation.isPending ? '移除中...' : '确认移除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
