import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, FolderKanban, ArrowRight } from 'lucide-react';
import { useApi } from '@/app/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTeamDetail } from './TeamDetailLayout';
import { CreateProjectDialog } from './TeamDialogs';
import type { TeamProjectFormPayload } from './types';

export function TeamOverviewTab() {
  const { detail, teamId, refresh } = useTeamDetail();
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();

  const createProjectM = useMutation({
    mutationFn: (payload: TeamProjectFormPayload) => api.createTeamProject(detail.id, payload),
    onSuccess: async () => {
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  const hasProject = !!detail.project;
  const projectQ = useQuery({
    queryKey: ['projectDetail', detail.project?.projectId],
    queryFn: () => api.projectDetail(detail.project!.projectId),
    enabled: hasProject,
  });

  const projectTasks = projectQ.data?.tasks ?? [];
  const totalTaskCount = hasProject ? projectQ.data?.stats?.taskCount ?? detail.project?.taskCount ?? 0 : 0;
  const completedTaskCount = hasProject ? projectQ.data?.stats?.completedTaskCount ?? detail.project?.completedTaskCount ?? 0 : 0;
  const progress = hasProject ? projectQ.data?.project?.progress ?? detail.project?.projectProgress ?? 0 : 0;

  const statusLabel: Record<string, string> = {
    TODO: '待办',
    IN_PROGRESS: '进行中',
    REVIEW: '待审核',
    DONE: '已完成',
  };

  const statusColor: Record<string, string> = {
    TODO: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-500',
    REVIEW: 'bg-amber-500',
    DONE: 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      {/* Top row: progress + team info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress card */}
        <Card className="md:col-span-2 border-muted/70">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{hasProject ? '项目进度' : '队内任务进度'}</CardTitle>
                <p className="text-sm text-muted-foreground">{hasProject ? '统一使用项目任务完成率，确保和项目页、课程项目看板一致。' : '当前团队尚未创建项目，先按队内任务推进。'}</p>
              </div>
              <Badge variant={detail.project ? 'default' : 'secondary'}>
                {detail.project ? '已关联项目' : '未关联项目'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{progress}%</span>
              <span className="text-sm text-muted-foreground">
                已完成 {completedTaskCount} / {totalTaskCount} 项任务
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <StatItem icon={CheckSquare} label="任务" value={totalTaskCount} />
              <StatItem icon={Users} label="成员" value={detail.members.length} />
              <StatItem icon={FolderKanban} label="项目" value={detail.project ? 1 : 0} />
            </div>
          </CardContent>
        </Card>

        {/* Team info card */}
        <Card className="border-muted/70">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} /> 团队信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">所属课程</span>
              <span className="font-medium">{detail.courseName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">团队类型</span>
              <span className="font-medium">{detail.source === 'COURSE' ? '课程团队' : '独立团队'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">队长</span>
              <span className="font-medium">{detail.leaderName || '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <Badge variant="outline">{detail.status || '活跃'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: members + project + tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members card */}
        <Card className="border-muted/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} /> 团队成员
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => nav(`/app/teams/${teamId}/members`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {detail.members.map(m => (
                <Avatar key={m.userId} className="border-2 border-background">
                  <AvatarFallback className="text-xs">{m.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{detail.members.length}</span> 名成员
              {detail.leaderName && (
                <span> · 队长 <span className="font-medium text-foreground">{detail.leaderName}</span></span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project card */}
        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban size={16} /> 关联项目
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.project ? (
              <div className="space-y-3">
                <button
                  className="flex w-full items-center justify-between rounded-2xl border bg-muted/10 px-4 py-3 text-left transition-colors hover:bg-muted/20"
                  onClick={() => nav(`/app/projects/${detail.project!.projectId}/overview`)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{detail.project.projectName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {detail.project.projectType === 'CODE' ? '代码项目' : '非代码项目'} · {detail.project.projectProgress ?? 0}%
                    </div>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
                </button>
                <div className="text-xs text-muted-foreground">目前每个团队默认只关联 1 个项目，这里按“项目名称列表”样式展示。</div>
              </div>
            ) : (detail.currentUserLeader || detail.adminView) && !detail.teacherView ? (
              <CreateProjectDialog onSubmit={p => createProjectM.mutateAsync(p)} />
            ) : (
              <div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground text-center">
                暂未创建项目
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks summary card */}
        <Card className="border-muted/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare size={16} /> 最近任务
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => nav(`/app/teams/${teamId}/tasks`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectTasks.slice(0, 5).length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">暂无任务</div>
            ) : (
              projectTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', statusColor[task.status] || 'bg-gray-400')} />
                    <span className="text-sm font-medium line-clamp-1">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                    {statusLabel[task.status] || task.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon size={16} />
      </div>
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
