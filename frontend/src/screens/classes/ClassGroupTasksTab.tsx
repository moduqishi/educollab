import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-base">{task.title}</div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {task.description || '暂无说明'}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>人数：{task.minMembers || 1} - {task.maxMembers || '不限'}</span>
            {task.dueDate && <span>截止：{task.dueDate}</span>}
          </div>
        </div>
        {!isTeacher && !myTeam && (
          <CreateTeamDialog onSubmit={(name) => onCreateTeam(task.id, name)} />
        )}
      </div>

      {!task.teams.length ? (
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>暂无队伍，</span>
          {!isTeacher && !myTeam ? (
            <span className="text-primary">可点击右上角「创建团队」组建队伍</span>
          ) : <span>等待学生创建或加入</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {task.teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between rounded-xl border p-3 gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{team.name}</div>
                <div className="text-xs text-muted-foreground">
                  队长：{team.leaderName || '未设置'} · {team.memberCount} 人
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {team.canLeave && (
                  <Button size="sm" variant="outline" onClick={() => onLeaveTeam(team.id)} className="text-xs h-7">
                    退出
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onOpenTeam(team.id)} className="text-xs h-7">
                  进入
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTeamDialog({ onSubmit }: { onSubmit: (name: string) => Promise<unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">创建团队</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>创建团队</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>队伍名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入队伍名称，创建后你将成为队长"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button
            onClick={async () => {
              if (name.trim()) {
                await onSubmit(name.trim());
                setName('');
                setOpen(false);
              }
            }}
            disabled={!name.trim()}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferLeaderInline({
  members,
  onSubmit,
}: {
  members: ClassDetail['members'];
  onSubmit: (leaderUserId: number) => Promise<unknown>;
}) {
  const [leaderUserId, setLeaderUserId] = React.useState<string>('');
  return (
    <div className="space-y-2 rounded-xl bg-muted/20 p-3">
      <div className="text-sm font-medium">转让队长</div>
      <Select value={leaderUserId} onValueChange={(v) => setLeaderUserId(v)}>
        <SelectTrigger className="w-full"><SelectValue placeholder="请选择成员" /></SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.userId} value={String(member.userId)}>{member.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
