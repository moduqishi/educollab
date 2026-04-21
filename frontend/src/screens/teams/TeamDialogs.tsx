import React from 'react';
import { BarChart3, ClipboardList, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TeamDetailRecord, WeeklyReportRecord } from '@/lib/types';
import type { TeamProjectFormPayload, TeamTaskFormPayload, WeeklyReportDraft } from './types';

export function CreateTaskDialog({
  members,
  onSubmit,
}: {
  members: TeamDetailRecord['members'];
  onSubmit: (payload: TeamTaskFormPayload) => Promise<unknown>;
}) {
  return <TaskDialog triggerLabel="新建任务" members={members} onSubmit={onSubmit} />;
}

export function EditTaskDialog({
  task,
  members,
  onSubmit,
}: {
  task: TeamDetailRecord['tasks'][number];
  members: TeamDetailRecord['members'];
  onSubmit: (payload: TeamTaskFormPayload) => Promise<unknown>;
}) {
  return <TaskDialog triggerLabel="编辑" members={members} initialValue={task} onSubmit={onSubmit} />;
}

function TaskDialog({
  triggerLabel,
  members,
  initialValue,
  onSubmit,
}: {
  triggerLabel: string;
  members: TeamDetailRecord['members'];
  initialValue?: TeamDetailRecord['tasks'][number];
  onSubmit: (payload: TeamTaskFormPayload) => Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(initialValue?.title || '');
  const [description, setDescription] = React.useState(initialValue?.description || '');
  const [assigneeId, setAssigneeId] = React.useState(initialValue?.assigneeId ? String(initialValue.assigneeId) : '');
  const [dueDate, setDueDate] = React.useState(initialValue?.dueDate || '');
  const [status, setStatus] = React.useState(initialValue?.status || 'TODO');

  React.useEffect(() => {
    if (!open) {
      setTitle(initialValue?.title || '');
      setDescription(initialValue?.description || '');
      setAssigneeId(initialValue?.assigneeId ? String(initialValue.assigneeId) : '');
      setDueDate(initialValue?.dueDate || '');
      setStatus(initialValue?.status || 'TODO');
    }
  }, [initialValue, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={initialValue ? 'outline' : 'default'}>{triggerLabel}</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{initialValue ? '编辑队内任务' : '新建队内任务'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2"><Label>任务标题</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>任务说明</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>负责人</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">暂不指定</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}{member.leader ? '（队长）' : ''}</option>)}
            </select>
            <div className="text-xs text-muted-foreground">这里只会显示当前队伍成员。</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>状态</Label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="TODO">待开始</option>
                <option value="IN_PROGRESS">进行中</option>
                <option value="REVIEW">待验收</option>
                <option value="DONE">已完成</option>
              </select>
            </div>
            <div className="space-y-2"><Label>截止日期</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button
            onClick={async () => {
              await onSubmit({
                title: title.trim(),
                description: description.trim(),
                assigneeId: assigneeId ? Number(assigneeId) : undefined,
                dueDate: dueDate || undefined,
                status,
              });
              setOpen(false);
            }}
            disabled={!title.trim()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransferLeaderInline({
  members,
  onSubmit,
}: {
  members: TeamDetailRecord['members'];
  onSubmit: (leaderUserId: number) => Promise<unknown>;
}) {
  const [leaderUserId, setLeaderUserId] = React.useState('');
  return (
    <div className="flex items-center gap-2">
      <select className="rounded-md border bg-background px-3 py-2 text-sm" value={leaderUserId} onChange={(e) => setLeaderUserId(e.target.value)}>
        <option value="">转让队长</option>
        {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={!leaderUserId} onClick={() => onSubmit(Number(leaderUserId))}>确认</Button>
    </div>
  );
}

export function CreateProjectDialog({
  onSubmit,
}: {
  onSubmit: (payload: TeamProjectFormPayload) => Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState<'CODE' | 'NON_CODE'>('CODE');
  const [dueDate, setDueDate] = React.useState('');
  const [initRepository, setInitRepository] = React.useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">创建项目</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>为团队创建项目</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2"><Label>项目名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>项目说明</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>项目类型</Label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as 'CODE' | 'NON_CODE')}>
                <option value="CODE">代码项目</option>
                <option value="NON_CODE">非代码项目</option>
              </select>
            </div>
            <div className="space-y-2"><Label>截止日期</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={initRepository} onChange={(e) => setInitRepository(e.target.checked)} disabled={type !== 'CODE'} />
            代码项目同时初始化仓库
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button
            onClick={async () => {
              await onSubmit({
                name: name.trim(),
                description: description.trim(),
                type,
                dueDate: dueDate || undefined,
                initRepository: type === 'CODE' ? initRepository : false,
              });
              setOpen(false);
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

export function WeeklyReportDialog({
  currentUserId,
  currentUserName,
  initialValue,
  triggerLabel,
  onSubmit,
}: {
  currentUserId?: number;
  currentUserName: string;
  initialValue?: WeeklyReportRecord;
  triggerLabel: string;
  onSubmit: (payload: WeeklyReportDraft) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(initialValue?.title || '');
  const [weekLabel, setWeekLabel] = React.useState(initialValue?.weekLabel || '');
  const [dateRange, setDateRange] = React.useState(initialValue?.dateRange || '');
  const [completed, setCompleted] = React.useState(initialValue?.completed || '');
  const [blockers, setBlockers] = React.useState(initialValue?.blockers || '');
  const [nextPlan, setNextPlan] = React.useState(initialValue?.nextPlan || '');

  React.useEffect(() => {
    if (!open) {
      setTitle(initialValue?.title || '');
      setWeekLabel(initialValue?.weekLabel || '');
      setDateRange(initialValue?.dateRange || '');
      setCompleted(initialValue?.completed || '');
      setBlockers(initialValue?.blockers || '');
      setNextPlan(initialValue?.nextPlan || '');
    }
  }, [initialValue, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={initialValue ? 'outline' : 'default'}>{triggerLabel}</Button>} />
      <DialogContent className="max-w-[760px]">
        <DialogHeader><DialogTitle>{initialValue ? '编辑周报' : '新建周报'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>标题</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>周次</Label><Input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="例如：第 8 周" /></div>
          </div>
          <div className="space-y-2"><Label>日期范围</Label><Input value={dateRange} onChange={(e) => setDateRange(e.target.value)} placeholder="例如：2026-04-13 ~ 2026-04-19" /></div>
          <div className="text-xs text-muted-foreground">填写人：{currentUserName || currentUserId || '当前成员'}</div>
          <div className="space-y-2"><Label>本周完成</Label><Textarea value={completed} onChange={(e) => setCompleted(e.target.value)} className="min-h-[100px]" /></div>
          <div className="space-y-2"><Label>当前问题</Label><Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} className="min-h-[100px]" /></div>
          <div className="space-y-2"><Label>下周计划</Label><Textarea value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} className="min-h-[100px]" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={() => { onSubmit({ title, weekLabel, dateRange, completed, blockers, nextPlan }); setOpen(false); }} disabled={!title.trim()}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WeeklyReportSection({
  items,
  canEditReports,
  currentUserId,
  currentUserName,
  onCreate,
  onUpdate,
}: {
  items: WeeklyReportRecord[];
  canEditReports: boolean;
  currentUserId?: number;
  currentUserName: string;
  onCreate: (payload: WeeklyReportDraft) => void;
  onUpdate: (reportId: string, payload: WeeklyReportDraft) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">记录团队每周进展、问题和下周安排。</div>
        {canEditReports ? (
          <WeeklyReportDialog
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onSubmit={onCreate}
            triggerLabel="新建周报"
          />
        ) : null}
      </div>
      {!items.length ? (
        <div className="text-sm text-muted-foreground">暂无周报记录。本期为前端演示功能，数据会保存在当前浏览器本地。</div>
      ) : (
        items.map((report) => (
          <div key={report.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{report.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{report.weekLabel} · {report.dateRange} · {report.authorName}</div>
              </div>
              {canEditReports && report.authorId === currentUserId ? (
                <WeeklyReportDialog
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  initialValue={report}
                  onSubmit={(payload) => onUpdate(report.id, payload)}
                  triggerLabel="编辑"
                />
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
              <ReportBlock icon={<ClipboardList size={14} />} title="本周完成" content={report.completed} />
              <ReportBlock icon={<BarChart3 size={14} />} title="当前问题" content={report.blockers} />
              <ReportBlock icon={<FolderKanban size={14} />} title="下周计划" content={report.nextPlan} />
            </div>
          </div>
        ))
      )}
    </>
  );
}

function ReportBlock({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{content || '暂无内容'}</div>
    </div>
  );
}
