import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useClassDetail } from './ClassDetailLayout';

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ClassOverviewTab() {
  const { detail, classId } = useClassDetail();
  const api = useApi();
  const navigate = useNavigate();
  const teamsQ = useQuery({
    queryKey: ['classTeams', classId],
    queryFn: () => api.classTeams(classId),
  });
  const projectsQ = useQuery({
    queryKey: ['classProjects', classId],
    queryFn: () => api.classProjects(classId),
  });

  const teams = teamsQ.data || [];
  const classProjects = projectsQ.data || [];
  const linkedProjectTeams = classProjects.filter((item) => item.projectId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <StatCard title="成员数" value={detail.members.length} />
        <StatCard title="课程作业" value={detail.assignments.length} />
        <StatCard
          title="课程团队"
          value={teams.length}
          subtitle={`已挂项目 ${linkedProjectTeams.length} · 未建项目 ${Math.max(teams.length - linkedProjectTeams.length, 0)}`}
        />
        <StatCard title="团队项目" value={linkedProjectTeams.length} subtitle={`平均进度 ${linkedProjectTeams.length ? Math.round(linkedProjectTeams.reduce((sum, item) => sum + item.progress, 0) / linkedProjectTeams.length) : 0}%`} />
      </div>

      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users size={16} />
                团队摘要
              </CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                课程下的团队、项目挂载情况与协作规模会在这里集中展示。
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/app/classes/${classId}/teams`)}>
              查看团队列表
              <ArrowRight size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryMiniCard
              title="课程团队"
              value={teams.length}
              icon={Users}
              hint="当前课程下所有普通团队"
            />
            <SummaryMiniCard
              title="已关联项目"
              value={linkedProjectTeams.length}
              icon={FolderKanban}
              hint="已在系统内继续推进项目协作的团队"
            />
            <SummaryMiniCard
              title="待建项目"
              value={Math.max(teams.length - linkedProjectTeams.length, 0)}
              icon={FolderKanban}
              hint="还没有挂项目，可继续从团队页创建"
            />
          </div>

          {linkedProjectTeams.length ? (
            <div className="rounded-2xl border border-muted/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium">课程项目预览</div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/app/classes/${classId}/projects`)}>
                  查看课程项目
                </Button>
              </div>
              <div className="space-y-3">
                {linkedProjectTeams.slice(0, 3).map((item, index) => (
                  <div key={item.teamId} className="rounded-2xl border border-muted/70 bg-muted/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{`第 ${item.groupOrder || index + 1} 组`}</Badge>
                          <div className="font-medium">{item.teamName}</div>
                          {item.projectName ? <Badge variant="secondary">{item.projectName}</Badge> : null}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {item.completedTaskCount} / {item.totalTaskCount} 项任务已完成
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{item.progress}%</div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {teams.length ? (
            <div className="space-y-3">
              {teams.slice(0, 4).map((team) => (
                <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-muted/70 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{team.name}</div>
                      <Badge variant="outline">课程团队</Badge>
                      {team.projectName ? <Badge variant="secondary">{team.projectName}</Badge> : null}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      队长：{team.leaderName || '未设置'} · {team.memberCount} 人
                      {team.projectName ? ` · 项目：${team.projectName}` : ''}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/app/teams/${team.id}/overview`)}>
                    查看团队
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              当前课程还没有团队。教师可直接在课程团队页创建课程团队，不再需要先经过其他流程。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryMiniCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className="rounded-2xl border border-muted/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon size={15} />
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
