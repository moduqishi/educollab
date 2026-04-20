import React from 'react';
import { NavLink, Outlet, useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, CheckSquare, FileText, Settings, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GroupTaskTeamDetail } from '@/lib/types';

const TeamDetailContext = React.createContext<{
  detail: GroupTaskTeamDetail;
  refresh: () => Promise<void>;
  currentUserId?: number;
  currentUserName?: string;
  teamId: number;
} | null>(null);

export function useTeamDetail() {
  const ctx = React.useContext(TeamDetailContext);
  if (!ctx) throw new Error('useTeamDetail must be used within TeamDetailLayout');
  return ctx;
}

export function TeamDetailLayout() {
  const api = useApi();
  const nav = useNavigate();
  const { teamId } = useParams();
  const id = Number(teamId);
  const qc = useQueryClient();
  const { session } = useAuth();

  if (!id) return <Navigate to="/app/teams" replace />;

  const currentUserId = session?.profile.id;

  const teamQ = useQuery({ queryKey: ['teams'], queryFn: () => api.teams() });
  const team = teamQ.data?.find(t => t.id === id);

  const detailQ = useQuery({
    queryKey: ['groupTaskTeamDetail', id],
    queryFn: () => api.groupTaskTeamDetail(id),
    enabled: !!team?.groupTaskId,
    retry: false,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', id] });
    await qc.invalidateQueries({ queryKey: ['teams'] });
  };

  const detail = detailQ.data;

  // Set title — must be unconditional (hooks can't be in conditional branches)
  React.useEffect(() => {
    const name = team && !team.groupTaskId ? team.name : detail?.name;
    if (name) setTitle([name, '团队详情']);
  }, [team, detail]);

  // Standalone team — no groupTaskId
  if (team && !team.groupTaskId) {
    return (
      <div className="px-8 pt-6 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav('/app/teams')} title="返回团队列表">
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">独立团队</Badge>
                <span>{team.courseName || '未关联课程'}</span>
              </div>
              <h1 className="mt-2 truncate text-4xl font-display font-bold tracking-tight">{team.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{team.courseName || '未关联课程'} · {team.memberCount} 人 · 队长：{team.leaderName || '未设置'}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="rounded-full">{team.memberCount} 人</Badge>
            </div>
          </div>

          <div className="mt-6">
            <StandaloneTeamOverview team={team} />
          </div>
        </div>
      </div>
    );
  }

  if (detailQ.isLoading) {
    return <div className="px-8 py-10 text-muted-foreground">正在加载团队...</div>;
  }

  if (!detail) {
    return <div className="px-8 py-10 text-muted-foreground">团队不存在或无权访问。</div>;
  }

  const tabs = [
    { to: `/app/teams/${id}/overview`, label: '概览', icon: BarChart3 },
    { to: `/app/teams/${id}/members`, label: '成员', icon: Users },
    { to: `/app/teams/${id}/tasks`, label: '任务', icon: CheckSquare },
    { to: `/app/teams/${id}/reports`, label: '周报', icon: FileText },
  ];

  return (
    <TeamDetailContext.Provider value={{ detail, refresh, currentUserId, currentUserName: session?.profile.name, teamId: id }}>
      <div className="px-8 pt-6 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => nav('/app/teams')} title="返回团队列表">
                  <ArrowLeft size={18} />
                </Button>
                <Badge variant="outline" className="rounded-full">组队任务</Badge>
                <span className="truncate">{detail.className || '未关联课程'}</span>
              </div>
              <h1 className="mt-2 truncate text-4xl font-display font-bold tracking-tight">{detail.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">
                {detail.className || '未关联课程'} · 队长：{detail.leaderName || '未设置'}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="rounded-full">{detail.members.length} 人</Badge>
              {detail.teacherView && <Badge variant="secondary" className="rounded-full">教师只读视图</Badge>}

              <Dialog>
                <DialogTrigger render={
                  <Button variant="outline" size="icon" className="rounded-full gap-2" title="团队设置">
                    <Settings size={16} />
                  </Button>
                } />
                <DialogContent className="max-w-[640px]">
                  <DialogHeader><DialogTitle>团队设置</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>团队名称</Label>
                      <Input readOnly value={detail.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>所属课程</Label>
                      <Input readOnly value={detail.className || '未关联课程'} />
                    </div>
                    <div className="space-y-2">
                      <Label>组队任务</Label>
                      <Input readOnly value={detail.groupTaskTitle || '无'} />
                    </div>
                    <div className="space-y-2">
                      <Label>队长</Label>
                      <Input readOnly value={detail.leaderName || '未设置'} />
                    </div>
                    <div className="space-y-2">
                      <Label>状态</Label>
                      <Input readOnly value={detail.status} />
                    </div>
                    <div className="space-y-2">
                      <Label>成员数量</Label>
                      <Input readOnly value={`${detail.members.length} 人`} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">关闭</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b pb-3">
            {tabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn('flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')
                }
              >
                <t.icon size={16} />
                {t.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </div>
    </TeamDetailContext.Provider>
  );
}

function StandaloneTeamOverview({ team }: { team: { id: number; name: string; courseName: string; memberCount: number; leaderName: string; leaderId: number | null } }) {
  return (
    <div className="max-w-[600px]">
      <div className="rounded-2xl border border-muted/70 p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">所属课程</div>
              <div className="font-medium">{team.courseName || '未关联课程'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">队长</div>
              <div className="font-medium">{team.leaderName || '未设置'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">成员数量</div>
              <div className="font-medium">{team.memberCount} 人</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">团队类型</div>
              <div className="font-medium">独立团队</div>
            </div>
          </div>
          <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            此为独立团队，没有关联组队任务。如需使用队内任务和项目功能，请在课程中的组队任务里创建队伍。
          </div>
        </div>
      </div>
    </div>
  );
}
