import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClassInvitation } from '@/lib/types';

export function CreateClassDialog({
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
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus size={16} />
        新建课程
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建课程</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>课程名称</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：软件工程 2026 春季班"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit(name.trim());
              setName('');
              setOpen(false);
            }}
            disabled={busy || !name.trim()}
          >
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JoinClassDialog({
  onSubmit,
  busy,
}: {
  onSubmit: (code: string) => Promise<unknown>;
  busy: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus size={16} />
        通过课程码加入
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>加入课程</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>课程码</Label>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="输入 6 位课程码"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit(code.trim());
              setCode('');
              setOpen(false);
            }}
            disabled={busy || !code.trim()}
          >
            加入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PendingInvitationCard({
  invitations,
  onAccept,
  onReject,
  busy,
}: {
  invitations: ClassInvitation[];
  onAccept: (id: number) => Promise<unknown>;
  onReject: (id: number) => Promise<unknown>;
  busy: boolean;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">待处理邀请</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!invitations.length ? (
          <div className="text-sm text-muted-foreground">暂无待处理邀请。</div>
        ) : (
          invitations.map((inv) => (
            <div key={inv.id} className="rounded-2xl border p-4">
              <div className="font-medium">{inv.className}</div>
              <div className="mt-1 text-xs text-muted-foreground">邀请人：{inv.invitedByName}</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="gap-1" disabled={busy} onClick={() => onAccept(inv.id)}>
                  <Check size={14} />
                  接受
                </Button>
                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => onReject(inv.id)}>
                  <X size={14} />
                  拒绝
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function InviteDialog({ onSubmit }: { onSubmit: (email: string) => Promise<unknown> }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1" />}>
        <Plus size={14} />
        邀请学生
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>通过账号邀请学生</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>学生邮箱</Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@example.com"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit(email.trim());
              setEmail('');
              setOpen(false);
            }}
            disabled={!email.trim()}
          >
            发送邀请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentDialog({
  onSubmit,
  initialValue,
  mode = 'create',
  triggerLabel,
  dialogTitle,
  submitLabel,
}: {
  onSubmit: (payload: {
    title: string;
    summary: string;
    submissionUrl?: string;
    dueDate?: string;
  }) => Promise<unknown>;
  initialValue?: {
    title?: string;
    summary?: string;
    submissionUrl?: string;
    dueDate?: string;
  };
  mode?: 'create' | 'edit';
  triggerLabel?: string;
  dialogTitle?: string;
  submitLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(initialValue?.title || '');
  const [summary, setSummary] = React.useState(initialValue?.summary || '');
  const [submissionUrl, setSubmissionUrl] = React.useState(initialValue?.submissionUrl || '');
  const [dueDate, setDueDate] = React.useState(initialValue?.dueDate || '');

  React.useEffect(() => {
    if (!open) {
      setTitle(initialValue?.title || '');
      setSummary(initialValue?.summary || '');
      setSubmissionUrl(initialValue?.submissionUrl || '');
      setDueDate(initialValue?.dueDate || '');
    }
  }, [initialValue?.dueDate, initialValue?.submissionUrl, initialValue?.summary, initialValue?.title, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1" variant={mode === 'edit' ? 'outline' : 'default'} />}>
        <Plus size={14} />
        {triggerLabel || (mode === 'edit' ? '编辑作业' : '发布作业')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle || (mode === 'edit' ? '编辑普通作业' : '发布普通作业')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>说明</Label>
            <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>参考链接</Label>
            <Input
              value={submissionUrl}
              onChange={(event) => setSubmissionUrl(event.target.value)}
              placeholder="可选，作为老师给学生的参考链接"
            />
          </div>
          <div className="space-y-2">
            <Label>截止日期</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit({
                title: title.trim(),
                summary: summary.trim(),
                submissionUrl: submissionUrl.trim() || undefined,
                dueDate: dueDate || undefined,
              });
              setTitle('');
              setSummary('');
              setSubmissionUrl('');
              setDueDate('');
              setOpen(false);
            }}
            disabled={!title.trim()}
          >
            {submitLabel || (mode === 'edit' ? '保存' : '发布')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupTaskDialog({
  onSubmit,
}: {
  onSubmit: (payload: {
    title: string;
    description: string;
    minMembers?: number;
    maxMembers?: number;
    dueDate?: string;
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [minMembers, setMinMembers] = React.useState('2');
  const [maxMembers, setMaxMembers] = React.useState('4');
  const [dueDate, setDueDate] = React.useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1" />}>
        <Plus size={14} />
        发布组队任务
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发布组队任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>说明</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>最少人数</Label>
              <Input type="number" value={minMembers} onChange={(event) => setMinMembers(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>最多人数</Label>
              <Input type="number" value={maxMembers} onChange={(event) => setMaxMembers(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>截止日期</Label>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              await onSubmit({
                title: title.trim(),
                description: description.trim(),
                minMembers: Number(minMembers || 0) || undefined,
                maxMembers: Number(maxMembers || 0) || undefined,
                dueDate: dueDate || undefined,
              });
              setTitle('');
              setDescription('');
              setMinMembers('2');
              setMaxMembers('4');
              setDueDate('');
              setOpen(false);
            }}
            disabled={!title.trim()}
          >
            发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
