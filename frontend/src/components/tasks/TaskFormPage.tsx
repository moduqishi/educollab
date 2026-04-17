import React from 'react';
import {
  CalendarDays,
  ChevronLeft,
  Download,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FileAssetRecord, ProjectRecord, TaskRecord, UserProfile } from '@/lib/types';

export const taskStatusLabel: Record<TaskRecord['status'], string> = {
  TODO: '待开始',
  IN_PROGRESS: '进行中',
  REVIEW: '待验收',
  DONE: '已完成',
};

export const taskPriorityLabel: Record<TaskRecord['priority'], string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

type TaskFormState = {
  projectId: number | null;
  title: string;
  description: string;
  status: TaskRecord['status'];
  priority: TaskRecord['priority'];
  assigneeId: number | null;
  dueDate: string;
};

export function TaskFormPage({
  heading,
  description,
  projects,
  users,
  initialValue,
  fixedProjectId,
  saving,
  attachments,
  loadingAttachments,
  uploadingAttachment,
  deletingAttachmentId,
  attachmentError,
  onBack,
  onSave,
  onUploadAttachment,
  onDeleteAttachment,
}: {
  heading: string;
  description: string;
  projects: ProjectRecord[];
  users: UserProfile[];
  initialValue?: Partial<TaskFormState> | null;
  fixedProjectId?: number;
  saving?: boolean;
  attachments?: FileAssetRecord[];
  loadingAttachments?: boolean;
  uploadingAttachment?: boolean;
  deletingAttachmentId?: number | null;
  attachmentError?: string | null;
  onBack: () => void;
  onSave: (payload: TaskFormState) => Promise<void>;
  onUploadAttachment?: (file: File) => Promise<void>;
  onDeleteAttachment?: (fileId: number) => Promise<void>;
}) {
  const api = useApi();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [form, setForm] = React.useState<TaskFormState>({
    projectId: fixedProjectId ?? initialValue?.projectId ?? null,
    title: initialValue?.title ?? '',
    description: initialValue?.description ?? '',
    status: initialValue?.status ?? 'TODO',
    priority: initialValue?.priority ?? 'MEDIUM',
    assigneeId: initialValue?.assigneeId ?? null,
    dueDate: initialValue?.dueDate ?? '',
  });

  React.useEffect(() => {
    setForm({
      projectId: fixedProjectId ?? initialValue?.projectId ?? null,
      title: initialValue?.title ?? '',
      description: initialValue?.description ?? '',
      status: initialValue?.status ?? 'TODO',
      priority: initialValue?.priority ?? 'MEDIUM',
      assigneeId: initialValue?.assigneeId ?? null,
      dueDate: initialValue?.dueDate ?? '',
    });
  }, [fixedProjectId, initialValue]);

  const canSubmit = !!form.projectId && !!form.title.trim();
  const attachmentBusy = !!uploadingAttachment || !!deletingAttachmentId;

  const handlePickAttachment = React.useCallback(() => {
    if (!attachmentBusy) {
      fileInputRef.current?.click();
    }
  }, [attachmentBusy]);

  const handleAttachmentChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file || !onUploadAttachment) return;
      await onUploadAttachment(file);
    },
    [onUploadAttachment],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={14} />
            返回任务列表
          </Button>
          <div>
            <h2 className="text-2xl font-display font-bold">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button type="button" onClick={() => onSave(form)} disabled={!canSubmit || saving}>
          {saving ? '保存中...' : '保存任务'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,360px]">
        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">任务信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fixedProjectId ? null : (
              <div className="space-y-2 md:col-span-2">
                <Label>所属项目</Label>
                <Select
                  value={form.projectId ? String(form.projectId) : ''}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, projectId: Number(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="例如：整理任务页交互"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>描述</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="补充目标、验收标准、交付物和注意事项"
                className="min-h-[180px]"
              />
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={(value: TaskRecord['status']) =>
                  setForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>{taskStatusLabel[form.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(taskStatusLabel) as TaskRecord['status'][]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {taskStatusLabel[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={form.priority}
                onValueChange={(value: TaskRecord['priority']) =>
                  setForm((current) => ({ ...current, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>{taskPriorityLabel[form.priority]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(taskPriorityLabel) as TaskRecord['priority'][]).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {taskPriorityLabel[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>负责人</Label>
              <Select
                value={form.assigneeId ? String(form.assigneeId) : 'unassigned'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    assigneeId: value === 'unassigned' ? null : Number(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="未指派">
                    {form.assigneeId
                      ? users.find((user) => user.id === form.assigneeId)?.name ?? '未指派'
                      : '未指派'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">未指派</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>截止日期</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueDate: event.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">附件与提示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CalendarDays size={16} />
                使用建议
              </div>
              <div className="mt-2">
                标题尽量使用动词开头，描述里写清验收标准，负责人和截止日期尽量都补齐。
              </div>
            </div>

            {attachmentError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {attachmentError}
              </div>
            ) : null}

            {onUploadAttachment ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAttachmentChange}
                  disabled={attachmentBusy}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={attachmentBusy}
                  onClick={handlePickAttachment}
                >
                  <Upload size={14} />
                  {uploadingAttachment ? '上传中...' : '上传附件'}
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                保存任务后即可上传附件。
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Paperclip size={14} />
                当前附件
              </div>
              {loadingAttachments ? (
                <div className="text-sm text-muted-foreground">正在加载附件...</div>
              ) : !attachments?.length ? (
                <div className="text-sm text-muted-foreground">当前还没有附件。</div>
              ) : (
                attachments.map((file) => {
                  const deleting = deletingAttachmentId === file.id;
                  return (
                    <div key={file.id} className="rounded-xl border p-3">
                      <div className="truncate text-sm font-medium">{file.fileName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatFileSize(file.sizeBytes)} | {file.createdAt}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={api.downloadFileUrl(file.id)} target="_blank" rel="noreferrer">
                          <Button type="button" variant="outline" size="sm">
                            <Download size={14} className="mr-1" />
                            下载
                          </Button>
                        </a>
                        {onDeleteAttachment ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={attachmentBusy}
                            onClick={() => void onDeleteAttachment(file.id)}
                          >
                            <Trash2 size={14} className="mr-1" />
                            {deleting ? '删除中...' : '删除'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatFileSize(sizeBytes?: number | null) {
  if (!sizeBytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = sizeBytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
