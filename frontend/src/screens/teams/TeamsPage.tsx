import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Copy,
  FolderKanban,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { cn } from '@/lib/utils';
import type { CourseRecord, ProjectRecord, TeamRecord } from '@/lib/types';

type TeamGroup = {
  courseId: number | null;
  courseName: string;
  teams: TeamRecord[];
};

type SourceFilter = 'ALL' | 'COURSE' | 'STANDALONE';
type OwnershipFilter = 'ALL' | 'MINE' | 'LEADING';

export function TeamsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { session } = useAuth();
  const [search, setSearch] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('ALL');
  const [ownershipFilter, setOwnershipFilter] = React.useState<OwnershipFilter>('ALL');

  React.useEffect(() => setTitle(['团队']), []);

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.teams() });
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });

  const generateInviteCodeM = useMutation({
    mutationFn: (teamId: number) => api.generateTeamInviteCode(teamId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teams'] });
    },
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

  const currentUserId = session?.profile.id;
  const isTeacher = session?.profile.role === 'TEACHER';
  const allTeams = teamsQ.data || [];
  const projects = projectsQ.data || [];
  const projectMap = new Map<number, ProjectRecord>(projects.map((project) => [project.id, project]));

  const visibleTeams = allTeams.filter((team) => {
    const keyword = search.trim().toLowerCase();
    const project = team.projectId ? projectMap.get(team.projectId) : null;
    const matchesKeyword =
      !keyword ||
      team.name.toLowerCase().includes(keyword) ||
      (team.courseName || '').toLowerCase().includes(keyword) ||
      (team.leaderName || '').toLowerCase().includes(keyword) ||
      (team.projectName || project?.name || '').toLowerCase().includes(keyword);

    const matchesSource =
      sourceFilter === 'ALL' ||
      (sourceFilter === 'COURSE' ? team.source === 'COURSE' : team.source === 'STANDALONE');

    const matchesOwnership =
      ownershipFilter === 'ALL' ||
      ownershipFilter === 'MINE' ||
      team.leaderId === currentUserId;

    return matchesKeyword && matchesSource && matchesOwnership;
  });

  const courseGroups = buildCourseGroups(visibleTeams.filter((team) => !team.source || team.source === 'COURSE'));
  const standaloneTeams = visibleTeams
    .filter((team) => team.source === 'STANDALONE')
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  const metrics = {
    total: allTeams.length,
    course: allTeams.filter((team) => !team.source || team.source === 'COURSE').length,
    standalone: allTeams.filter((team) => team.source === 'STANDALONE').length,
    withProject: allTeams.filter((team) => team.projectId).length,
  };

  const quickCourses = courseGroups.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-8 py-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[30px] font-semibold tracking-tight text-foreground">团队</h1>
              {isTeacher ? <Badge variant="outline">教师视图</Badge> : <Badge variant="outline">我的团队</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              按课程、项目和团队快速进入，不再堆大段介绍。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MiniStat label="全部团队" value={metrics.total} />
              <MiniStat label="课程团队" value={metrics.course} />
              <MiniStat label="独立团队" value={metrics.standalone} />
              <MiniStat label="已挂项目" value={metrics.withProject} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isTeacher ? (
              <Button variant="outline" className="rounded-full" onClick={() => nav('/app/classes')}>
                回到课程
              </Button>
            ) : null}
            <CreateTeamDialog
              courses={coursesQ.data || []}
              onSubmit={(payload) => createTeamStandaloneM.mutateAsync(payload).then(() => {})}
              busy={createTeamStandaloneM.isPending}
            />
            {!isTeacher ? (
              <JoinTeamDialog
                onSubmit={(code) => joinByCodeM.mutateAsync(code).then(() => {})}
                busy={joinByCodeM.isPending}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-8 py-6">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 lg:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <SearchBar value={search} onChange={setSearch} placeholder="搜索团队、课程、项目、队长" />
                <div className="flex flex-wrap gap-2">
                  <ChoicePill active={sourceFilter === 'ALL'} onClick={() => setSourceFilter('ALL')}>
                    全部
                  </ChoicePill>
                  <ChoicePill active={sourceFilter === 'COURSE'} onClick={() => setSourceFilter('COURSE')}>
                    课程团队
                  </ChoicePill>
                  <ChoicePill active={sourceFilter === 'STANDALONE'} onClick={() => setSourceFilter('STANDALONE')}>
                    独立团队
                  </ChoicePill>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ChoicePill active={ownershipFilter === 'ALL'} onClick={() => setOwnershipFilter('ALL')}>
                  全部身份
                </ChoicePill>
                <ChoicePill active={ownershipFilter === 'MINE'} onClick={() => setOwnershipFilter('MINE')}>
                  我参与的
                </ChoicePill>
                <ChoicePill active={ownershipFilter === 'LEADING'} onClick={() => setOwnershipFilter('LEADING')}>
                  我负责的
                </ChoicePill>
              </div>
            </div>

            {quickCourses.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border/60 pt-3">
                <span className="text-xs font-medium text-muted-foreground">课程快捷入口</span>
                {quickCourses.map((group) => (
                  <button
                    key={`${group.courseId}-${group.courseName}`}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-sm transition hover:bg-muted/60"
                    onClick={() => group.courseId && nav(`/app/classes/${group.courseId}/teams`)}
                  >
                    <span className="max-w-[180px] truncate">{group.courseName}</span>
                    <span className="rounded-full bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                      {group.teams.length}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 space-y-6">
          {!visibleTeams.length ? (
            <PageEmpty
              title="当前筛选下没有团队"
              message="换个关键词试试，或先创建一个团队开始协作。"
              icon={Users}
              action={
                <CreateTeamDialog
                  courses={coursesQ.data || []}
                  onSubmit={(payload) => createTeamStandaloneM.mutateAsync(payload).then(() => {})}
                  busy={createTeamStandaloneM.isPending}
                />
              }
            />
          ) : (
            <>
              {courseGroups.length ? (
                <TeamSection title="课程团队" count={courseGroups.reduce((sum, item) => sum + item.teams.length, 0)}>
                  <div className="space-y-4">
                    {courseGroups.map((group) => (
                      <Card key={`${group.courseId}-${group.courseName}`} className="overflow-hidden border-border/70 shadow-sm">
                        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <BookOpen size={16} className="text-primary" />
                                <span className="truncate">{group.courseName}</span>
                              </CardTitle>
                              <div className="mt-1 text-sm text-muted-foreground">{group.teams.length} 个团队</div>
                            </div>
                            {group.courseId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => nav(`/app/classes/${group.courseId}/teams`)}
                              >
                                返回课程
                              </Button>
                            ) : null}
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/60">
                            {group.teams.map((team) => (
                              <TeamListRow
                                key={team.id}
                                team={team}
                                project={team.projectId ? projectMap.get(team.projectId) : null}
                                currentUserId={currentUserId}
                                isTeacher={isTeacher}
                                onOpen={() => nav(`/app/teams/${team.id}/overview`)}
                                onOpenCourse={() => team.courseId && nav(`/app/classes/${team.courseId}/teams`)}
                                canInvite={currentUserId === team.leaderId}
                                onGenerateInvite={() => generateInviteCodeM.mutateAsync(team.id).then(() => {})}
                                inviteBusy={generateInviteCodeM.isPending}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TeamSection>
              ) : null}

              {standaloneTeams.length ? (
                <TeamSection title="独立团队" count={standaloneTeams.length}>
                  <Card className="overflow-hidden border-border/70 shadow-sm">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/60">
                        {standaloneTeams.map((team) => (
                          <TeamListRow
                            key={team.id}
                            team={team}
                            project={team.projectId ? projectMap.get(team.projectId) : null}
                            currentUserId={currentUserId}
                            isTeacher={isTeacher}
                            onOpen={() => nav(`/app/teams/${team.id}/overview`)}
                            canInvite={currentUserId === team.leaderId}
                            onGenerateInvite={() => generateInviteCodeM.mutateAsync(team.id).then(() => {})}
                            inviteBusy={generateInviteCodeM.isPending}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TeamSection>
              ) : sourceFilter === 'STANDALONE' && !standaloneTeams.length ? (
                <PageEmpty
                  title="当前筛选下没有独立团队"
                  message="可以创建一个不关联课程的自由协作团队。"
                  icon={Users}
                  action={
                    <CreateTeamDialog
                      courses={coursesQ.data || []}
                      onSubmit={(payload) => createTeamStandaloneM.mutateAsync(payload).then(() => {})}
                      busy={createTeamStandaloneM.isPending}
                    />
                  }
                />
              ) : null}

              {!courseGroups.length && !standaloneTeams.length && sourceFilter !== 'STANDALONE' ? (
                <PageEmpty title="当前筛选下没有可显示的团队" message="请调整筛选条件" icon={Users} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildCourseGroups(teams: TeamRecord[]): TeamGroup[] {
  return Array.from(
    teams
      .reduce((map, team) => {
        const key = `${team.courseId ?? 'none'}::${team.courseName || '未关联课程'}`;
        const existing = map.get(key) || {
          courseId: team.courseId,
          courseName: team.courseName || '未关联课程',
          teams: [] as TeamRecord[],
        };
        existing.teams.push(team);
        map.set(key, existing);
        return map;
      }, new Map<string, TeamGroup>())
      .values(),
  )
    .map((group) => ({
      ...group,
      teams: [...group.teams].sort(
        (left, right) =>
          (left.groupOrder ?? Number.MAX_SAFE_INTEGER) - (right.groupOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.name.localeCompare(right.name, 'zh-CN'),
      ),
    }))
    .sort((left, right) => left.courseName.localeCompare(right.courseName, 'zh-CN'));
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm shadow-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function TeamSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <Badge variant="outline">{count} 个</Badge>
        </div>
      </div>
      {children}
    </section>
  );
}

function TeamListRow({
  team,
  project,
  currentUserId,
  isTeacher,
  onOpen,
  onOpenCourse,
  canInvite,
  onGenerateInvite,
  inviteBusy,
}: {
  team: TeamRecord;
  project?: ProjectRecord | null;
  currentUserId?: number;
  isTeacher: boolean;
  onOpen: () => void;
  onOpenCourse?: () => void;
  canInvite?: boolean;
  onGenerateInvite?: () => Promise<void>;
  inviteBusy?: boolean;
}) {
  const isLeader = currentUserId === team.leaderId;
  const roleLabel = isTeacher ? (isLeader ? '队长 / 教师' : '教师视角') : isLeader ? '队长' : '组员';
  const progress = Math.max(0, Math.min(100, project?.progress ?? 0));
  const projectName = team.projectName || project?.name || '暂未创建项目';
  const projectStatus = project
    ? `${project.type === 'CODE' ? '代码项目' : '非代码项目'} · ${project.status === 'COMPLETED' ? '已完成' : project.status === 'ARCHIVED' ? '已归档' : '进行中'}`
    : '未挂项目';

  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr),260px,auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {team.groupOrder ? <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">第 {team.groupOrder} 组</Badge> : null}
          <Badge variant="outline" className="rounded-full">{team.source === 'STANDALONE' ? '独立团队' : '课程团队'}</Badge>
          <Badge variant={team.projectId ? 'default' : 'secondary'} className="rounded-full">
            {team.projectId ? '已挂项目' : '待建项目'}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight text-foreground">{team.name}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="truncate">{team.courseName || '未关联课程'}</span>
              <span>{team.memberCount} 人</span>
              <span>队长：{team.leaderName || '未设置'}</span>
              <span>我的身份：{roleLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenCourse ? (
              <Button variant="outline" size="sm" className="rounded-full" onClick={onOpenCourse}>
                返回课程
              </Button>
            ) : null}
            {canInvite && onGenerateInvite ? (
              <InviteMemberDialog team={team} onGenerate={onGenerateInvite} busy={!!inviteBusy} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <FolderKanban size={13} />
              项目
            </div>
            <div className="mt-1 truncate text-sm font-medium text-foreground">{projectName}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{projectStatus}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-lg font-semibold text-foreground">{progress}%</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" className="rounded-full gap-2" onClick={onOpen}>
          进入团队
          <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function ChoicePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/70 bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1 md:max-w-[360px]">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full border-border/70 bg-background pl-10 pr-10"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      ) : null}
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
      <DialogTrigger render={<Button size="sm" variant="outline" className="rounded-full">加入团队</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>通过邀请码加入团队</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>邀请码</Label>
            <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="输入 8 位邀请码" className="font-mono tracking-wider" />
          </div>
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
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
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="rounded-full">邀请成员</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>邀请成员加入团队</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="mb-2 text-xs text-muted-foreground">邀请码</div>
            <div className="font-mono text-2xl font-bold tracking-widest">{displayCode}</div>
          </div>
          <div className="text-sm text-muted-foreground">将此邀请码分享给对方，对方可在团队页面输入邀请码加入。</div>
        </div>
        <DialogFooter>
          {!code ? (
            <Button onClick={() => void onGenerate()} disabled={busy} className="w-full">{busy ? '生成中...' : '生成邀请码'}</Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={() => void onGenerate()} disabled={busy} className="flex-1">重新生成</Button>
              <Button onClick={() => void handleCopy()} className="flex-1 gap-1"><Copy size={14} />{copied ? '已复制' : '复制邀请码'}</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTeamDialog({ courses, onSubmit, busy }: { courses: CourseRecord[]; onSubmit: (payload: { name: string; courseId: number | null }) => Promise<void>; busy: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [courseId, setCourseId] = React.useState<number | null>(null);
  const [error, setError] = React.useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入团队名称');
      return;
    }
    setError('');
    try {
      await onSubmit({ name: name.trim(), courseId });
      setName('');
      setCourseId(null);
      setOpen(false);
    } catch {
      setError('创建失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="rounded-full"><Plus size={14} className="mr-1" />创建团队</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>创建新团队</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>团队名称</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="输入团队名称" />
          </div>
          <div className="space-y-2">
            <Label>关联课程（可选）</Label>
            <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value) || null)}>
              <option value="">不关联课程</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.name}（{course.teacherName}）</option>
              ))}
            </select>
          </div>
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || busy}>{busy ? '创建中...' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
