import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, Plus, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageError, PageLoading } from '@/screens/common/States';
import { useClassDetail } from './ClassDetailLayout';

export function ClassTeamsTabPage() {
  const { classId, isTeacher } = useClassDetail();
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['classTeams', classId],
    queryFn: () => api.classTeams(classId),
  });

  const createTeamM = useMutation({
    mutationFn: (name: string) => api.createTeamStandalone({ name, courseId: classId }),
    onSuccess: async (team) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['classTeams', classId] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]);
      navigate(`/app/teams/${team.id}/overview`);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载课程团队..." />;
  if (q.isError) return <PageError title="课程团队加载失败" onRetry={() => q.refetch()} />;

  const teams = q.data || [];
  const linkedCount = teams.filter((item) => item.projectId).length;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={16} />
              课程团队
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              当前课程下的团队会直接在这里管理，创建时默认绑定本课程。
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">共 {teams.length} 个团队</Badge>
            <Badge variant="outline">已挂项目 {linkedCount}</Badge>
            {isTeacher ? <CreateCourseTeamDialog onSubmit={(name) => createTeamM.mutateAsync(name)} busy={createTeamM.isPending} /> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!teams.length ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            当前课程还没有团队。教师可以直接创建课程团队，团队创建后会默认挂在本课程下。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">组序号</th>
                  <th className="px-4 py-3 font-medium">团队名</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">队长</th>
                  <th className="px-4 py-3 font-medium">成员数</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">关联项目</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b last:border-b-0">
                    <td className="px-4 py-4 font-medium">{team.groupOrder ? `第 ${team.groupOrder} 组` : '—'}</td>
                    <td className="px-4 py-4 font-medium">{team.name}</td>
                    <td className="px-4 py-4">
                      <Badge variant="outline">{team.source === 'COURSE' ? '课程团队' : '独立团队'}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{team.leaderName || '未设置'}</td>
                    <td className="px-4 py-4 text-muted-foreground">{team.memberCount}</td>
                    <td className="px-4 py-4 text-muted-foreground">{team.status === 'LOCKED' ? '已锁定' : '组建中'}</td>
                    <td className="px-4 py-4">
                      {team.projectId ? (
                        <button
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={() => navigate(`/app/projects/${team.projectId}/overview`)}
                        >
                          <FolderKanban size={14} />
                          {team.projectName || '查看项目'}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">未关联</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button size="sm" onClick={() => navigate(`/app/teams/${team.id}/overview`)}>
                        进入团队
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateCourseTeamDialog({
  onSubmit,
  busy,
}: {
  onSubmit: (name: string) => Promise<unknown>;
  busy: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus size={14} />
        创建团队
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>创建课程团队</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>团队名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：前端协作组" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>取消</Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              await onSubmit(name.trim());
              setName('');
              setOpen(false);
            }}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
