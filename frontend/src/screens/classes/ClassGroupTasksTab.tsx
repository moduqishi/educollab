import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GroupTaskDialog } from '@/screens/classes/ClassDialogs';
import type { ClassDetail, GroupTaskRecord } from '@/lib/types';

export function GroupTasksTab({
  detail,
  isTeacher,
  currentUserId,
  onCreateGroupTask,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onTransferLeader,
  onOpenTeam,
}: {
  detail: ClassDetail;
  isTeacher: boolean;
  currentUserId?: number;
  onCreateGroupTask: (payload: {
    title: string;
    description: string;
    minMembers?: number;
    maxMembers?: number;
    dueDate?: string;
  }) => Promise<unknown>;
  onCreateTeam: (groupTaskId: number, name: string) => Promise<unknown>;
  onJoinTeam: (teamId: number) => Promise<unknown>;
  onLeaveTeam: (teamId: number) => Promise<unknown>;
  onTransferLeader: (teamId: number, leaderUserId: number) => Promise<unknown>;
  onOpenTeam: (teamId: number) => void;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">组队任务</CardTitle>
          {isTeacher ? <GroupTaskDialog onSubmit={onCreateGroupTask} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!detail.groupTasks.length ? (
          <div className="text-sm text-muted-foreground">当前还没有组队任务。</div>
        ) : (
          detail.groupTasks.map((task) => (
            <GroupTaskCard
              key={task.id}
              task={task}
              detail={detail}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
              onCreateTeam={onCreateTeam}
              onJoinTeam={onJoinTeam}
              onLeaveTeam={onLeaveTeam}
              onTransferLeader={onTransferLeader}
              onOpenTeam={onOpenTeam}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function GroupTaskCard({
  task,
  detail,
  currentUserId,
  isTeacher,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onTransferLeader,
  onOpenTeam,
}: {
  task: GroupTaskRecord;
  detail: ClassDetail;
  currentUserId?: number;
  isTeacher: boolean;
  onCreateTeam: (groupTaskId: number, name: string) => Promise<unknown>;
  onJoinTeam: (teamId: number) => Promise<unknown>;
  onLeaveTeam: (teamId: number) => Promise<unknown>;
  onTransferLeader: (teamId: number, leaderUserId: number) => Promise<unknown>;
  onOpenTeam: (teamId: number) => void;
}) {
  const myTeam = task.teams.find((team) => team.leaderId === currentUserId || team.canLeave);

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div>
        <div className="font-medium">{task.title}</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {task.description || '暂无说明'}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          人数限制：{task.minMembers || 1} - {task.maxMembers || '不限'} · 截止时间：
          {task.dueDate || '未设置'}
        </div>
      </div>

      {!isTeacher && !myTeam ? (
        <CreateTeamInline onSubmit={(name) => onCreateTeam(task.id, name)} />
      ) : null}

      <div className="space-y-3">
        {!task.teams.length ? (
          <div className="text-sm text-muted-foreground">暂无队伍，学生可以自由创建。</div>
        ) : (
          task.teams.map((team) => (
            <div key={team.id} className="space-y-3 rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{team.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    队长：{team.leaderName || '未设置'} · {team.memberCount} 人
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.canJoin ? (
                    <Button size="sm" onClick={() => onJoinTeam(team.id)}>
                      加入
                    </Button>
                  ) : null}
                  {team.canLeave ? (
                    <Button size="sm" variant="outline" onClick={() => onLeaveTeam(team.id)}>
                      退出
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => onOpenTeam(team.id)}>
                    进入团队
                  </Button>
                </div>
              </div>

              {team.canTransfer ? (
                <TransferLeaderInline
                  members={detail.members.filter((member) => member.classRole === 'STUDENT')}
                  onSubmit={(leaderUserId) => onTransferLeader(team.id, leaderUserId)}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateTeamInline({ onSubmit }: { onSubmit: (name: string) => Promise<unknown> }) {
  const [name, setName] = React.useState('');
  return (
    <div className="space-y-3 rounded-2xl border border-dashed p-4">
      <div className="text-sm font-medium">创建队伍</div>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="输入队伍名称，创建后你将成为队长"
      />
      <Button
        size="sm"
        onClick={async () => {
          await onSubmit(name.trim());
          setName('');
        }}
        disabled={!name.trim()}
      >
        创建队伍
      </Button>
    </div>
  );
}

function TransferLeaderInline({
  members,
  onSubmit,
}: {
  members: ClassDetail['members'];
  onSubmit: (leaderUserId: number) => Promise<unknown>;
}) {
  const [leaderUserId, setLeaderUserId] = React.useState('');
  return (
    <div className="space-y-2 rounded-xl bg-muted/20 p-3">
      <div className="text-sm font-medium">转让队长</div>
      <select
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={leaderUserId}
        onChange={(event) => setLeaderUserId(event.target.value)}
      >
        <option value="">请选择成员</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSubmit(Number(leaderUserId))}
        disabled={!leaderUserId}
      >
        确认转让
      </Button>
    </div>
  );
}
