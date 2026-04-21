import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, GitBranch, Plus } from 'lucide-react';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateProjectDialog } from './TeamDialogs';
import { useTeamDetail } from './TeamDetailLayout';
import type { TeamProjectFormPayload } from './types';

export function TeamProjectsTab() {
  const { detail, refresh } = useTeamDetail();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const createProjectM = useMutation({
    mutationFn: (payload: TeamProjectFormPayload) => api.createTeamProject(detail.id, payload),
    onSuccess: async (project) => {
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]);
      navigate(`/app/projects/${project.id}/overview`);
    },
  });

  const canCreate = (detail.currentUserLeader || detail.adminView) && !detail.teacherView && !detail.project;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban size={16} />
              团队项目
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              团队项目直接挂在当前团队之下；课程团队会自动继承课程归属。
            </div>
          </div>
          {canCreate ? <CreateProjectDialog onSubmit={(payload) => createProjectM.mutateAsync(payload)} /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {detail.project ? (
          <div className="rounded-3xl border border-muted/70 bg-muted/10 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-semibold">{detail.project.projectName}</div>
                  <Badge variant="outline">{detail.project.projectType === 'CODE' ? '代码项目' : '非代码项目'}</Badge>
                  <Badge variant="secondary">{detail.project.projectStatus || 'ACTIVE'}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {detail.project.description || '暂无项目说明'}
                </div>
              </div>
              <Button className="gap-2" onClick={() => navigate(`/app/projects/${detail.project?.projectId}/overview`)}>
                进入项目
                <ArrowRight size={14} />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MiniMetric
                icon={FolderKanban}
                label="项目状态"
                value={detail.project.projectStatus === 'COMPLETED' ? '已完成' : detail.project.projectStatus === 'ARCHIVED' ? '已归档' : '进行中'}
              />
              <MiniMetric
                icon={GitBranch}
                label="项目类型"
                value={detail.project.projectType === 'CODE' ? '代码项目' : '非代码项目'}
              />
              <div className="rounded-2xl border border-muted/70 p-4">
                <div className="text-xs text-muted-foreground">项目进度</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{detail.project.projectProgress ?? 0}%</span>
                  <span className="text-muted-foreground">当前团队协作进度</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${detail.project.projectProgress ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Plus size={18} />
            </div>
            <div className="mt-4 text-base font-medium">当前团队还没有项目</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {detail.teacherView
                ? '教师可在这里查看项目挂载情况；当前团队还未创建项目。'
                : detail.currentUserLeader
                  ? '你可以直接从团队工作台创建项目，后续任务、讨论、文档与仓库都会挂在这个项目下。'
                  : '当前团队还未创建项目，队长创建后这里会直接显示项目入口。'}
            </div>
            {canCreate ? (
              <div className="mt-5">
                <CreateProjectDialog onSubmit={(payload) => createProjectM.mutateAsync(payload)} />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-muted/70 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-3 text-base font-semibold">{value}</div>
    </div>
  );
}
