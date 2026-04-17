import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import { TeamWorkbench } from './TeamWorkbench';
import type { TeamProjectFormPayload, TeamTaskFormPayload } from './types';

export function TeamsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { session } = useAuth();

  React.useEffect(() => setTitle(['团队']), []);

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.teams() });
  const selectedId = Number(params.get('teamId') || 0) || teamsQ.data?.[0]?.id || null;

  React.useEffect(() => {
    if (!params.get('teamId') && teamsQ.data?.[0]?.id) {
      setParams({ teamId: String(teamsQ.data[0].id) }, { replace: true });
    }
  }, [params, setParams, teamsQ.data]);

  const detailQ = useQuery({
    queryKey: ['groupTaskTeamDetail', selectedId],
    queryFn: () => api.groupTaskTeamDetail(selectedId!),
    enabled: !!selectedId,
  });

  const createTaskM = useMutation({
    mutationFn: ({ teamId, payload }: { teamId: number; payload: TeamTaskFormPayload }) =>
      api.createGroupTaskTeamTask(teamId, payload),
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', vars.teamId] });
    },
  });

  const updateTaskM = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: TeamTaskFormPayload }) =>
      api.updateGroupTaskTeamTask(taskId, payload),
    onSuccess: async () => {
      if (selectedId) await qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', selectedId] });
    },
  });

  const transferLeaderM = useMutation({
    mutationFn: ({ teamId, leaderUserId }: { teamId: number; leaderUserId: number }) => api.transferGroupTaskLeader(teamId, leaderUserId),
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', vars.teamId] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]);
    },
  });

  const createProjectM = useMutation({
    mutationFn: ({ teamId, payload }: { teamId: number; payload: TeamProjectFormPayload }) =>
      api.createGroupTaskTeamProject(teamId, payload),
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['groupTaskTeamDetail', vars.teamId] }),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]);
    },
  });

  if (teamsQ.isLoading) return <PageLoading label="正在加载团队..." />;
  if (teamsQ.isError) return <PageError title="团队加载失败" onRetry={() => teamsQ.refetch()} />;

  const teams = teamsQ.data || [];
  const detail = detailQ.data || null;

  return (
    <div>
      <PageHero title="团队工作台" subtitle="只展示你已加入的组队任务队伍，并在这里完成队内协作、任务分配和周报记录。" />

      <div className="px-8 pb-10">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 xl:grid-cols-[320px,1fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">我的团队</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!teams.length ? (
                <PageEmpty
                  title="还没有团队"
                  message="先在课程中的组队任务里创建或加入队伍。"
                  icon={Users}
                  action={<Button onClick={() => navigate('/app/classes')}>前往课程</Button>}
                />
              ) : (
                teams.map((team) => (
                  <button
                    key={team.id}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === team.id ? 'border-primary bg-primary/5' : 'border-muted/70 hover:bg-muted/30'}`}
                    onClick={() => setParams({ teamId: String(team.id) })}
                  >
                    <div className="font-semibold">{team.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{team.courseName || '未关联课程'} · {team.memberCount} 人</div>
                    <div className="mt-2 text-xs text-muted-foreground">队长：{team.leaderName || '未设置'}</div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {!selectedId ? (
            <PageEmpty title="请选择一个团队" message="从左侧选择队伍后，可查看成员、任务、周报和项目入口。" icon={Users} />
          ) : detailQ.isLoading ? (
            <PageLoading label="正在加载团队详情..." />
          ) : detailQ.isError ? (
            <PageError title="团队详情加载失败" onRetry={() => detailQ.refetch()} />
          ) : detail ? (
            <TeamWorkbench
              detail={detail}
              currentUserId={session?.profile.id}
              currentUserName={session?.profile.name || '当前用户'}
              onCreateTask={(payload) => createTaskM.mutateAsync({ teamId: detail.id, payload })}
              onUpdateTask={(taskId, payload) => updateTaskM.mutateAsync({ taskId, payload })}
              onTransferLeader={(leaderUserId) => transferLeaderM.mutateAsync({ teamId: detail.id, leaderUserId })}
              onCreateProject={(payload) => createProjectM.mutateAsync({ teamId: detail.id, payload })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
