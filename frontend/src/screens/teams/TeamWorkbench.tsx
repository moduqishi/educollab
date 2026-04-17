import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupTaskTeamDetail } from '@/lib/types';
import {
  CreateProjectDialog,
  CreateTaskDialog,
  EditTaskDialog,
  TransferLeaderInline,
  WeeklyReportSection,
} from './TeamDialogs';
import type { TeamProjectFormPayload, TeamTaskFormPayload } from './types';
import { useWeeklyReports } from './weeklyReports';

export function TeamWorkbench({
  detail,
  currentUserId,
  currentUserName,
  onCreateTask,
  onUpdateTask,
  onTransferLeader,
  onCreateProject,
}: {
  detail: GroupTaskTeamDetail;
  currentUserId?: number;
  currentUserName: string;
  onCreateTask: (payload: TeamTaskFormPayload) => Promise<unknown>;
  onUpdateTask: (taskId: number, payload: TeamTaskFormPayload) => Promise<unknown>;
  onTransferLeader: (leaderUserId: number) => Promise<unknown>;
  onCreateProject: (payload: TeamProjectFormPayload) => Promise<unknown>;
}) {
  const navigate = useNavigate();
  const reports = useWeeklyReports(detail.id);
  const canEditReports = !detail.teacherView && !!currentUserId;

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{detail.name}</CardTitle>
              <div className="mt-2 text-sm text-muted-foreground">
              {detail.className || '未关联课程'} · {detail.groupTaskTitle || '未关联组队任务'} · 队长：{detail.leaderName || '未设置'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{detail.members.length} 人</Badge>
              {detail.teacherView ? <Badge variant="secondary">教师只读视图</Badge> : null}
              {detail.projectId ? (
                <Button size="sm" variant="outline" onClick={() => navigate(`/app/projects/${detail.projectId}/overview`)}>
                  进入项目
                </Button>
              ) : detail.currentUserLeader ? (
                <CreateProjectDialog onSubmit={onCreateProject} />
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">团队成员</CardTitle>
              {detail.currentUserLeader && !detail.teacherView ? (
                <TransferLeaderInline members={detail.members.filter((member) => !member.leader)} onSubmit={onTransferLeader} />
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{member.email}</div>
                </div>
                {member.leader ? <Badge>队长</Badge> : <Badge variant="outline">队员</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">队内任务</CardTitle>
              {detail.currentUserLeader && !detail.teacherView ? <CreateTaskDialog members={detail.members} onSubmit={onCreateTask} /> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!detail.tasks.length ? (
              <div className="text-sm text-muted-foreground">暂无队内任务。</div>
            ) : (
              detail.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">负责人：{task.assigneeName || '暂未指定'} · 状态：{task.status} · 截止：{task.dueDate || '未设置'}</div>
                    </div>
                    {detail.currentUserLeader && !detail.teacherView ? (
                      <EditTaskDialog task={task} members={detail.members} onSubmit={(payload) => onUpdateTask(task.id, payload)} />
                    ) : null}
                  </div>
                  {task.description ? <div className="mt-3 text-sm text-muted-foreground">{task.description}</div> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">周报</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <WeeklyReportSection
            items={reports.items}
            canEditReports={canEditReports}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onCreate={(payload) => reports.createReport(payload, currentUserId, currentUserName)}
            onUpdate={(reportId, payload) => reports.updateReport(reportId, payload)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
