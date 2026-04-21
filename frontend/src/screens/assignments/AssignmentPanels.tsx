import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Link2,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  AssignmentRecord,
  AssignmentSubmissionRecord,
  AssignmentSubmissionStatus,
  DocumentRecord,
  ProjectRecord,
} from '@/lib/types';

const statusText: Record<AssignmentSubmissionStatus, string> = {
  NOT_SUBMITTED: '未提交',
  DRAFT: '草稿',
  SUBMITTED: '待批改',
  RETURNED: '已退回',
  GRADED: '已评分',
};

const queuePriority: Record<AssignmentSubmissionStatus, number> = {
  SUBMITTED: 0,
  RETURNED: 1,
  GRADED: 2,
  DRAFT: 3,
  NOT_SUBMITTED: 4,
};

export function getAssignmentStatusLabel(status?: AssignmentSubmissionStatus | null) {
  return status ? statusText[status] : '未提交';
}

export function SubmissionStatusBadge({
  status,
}: {
  status?: AssignmentSubmissionStatus | null;
}) {
  const normalized = status ?? 'NOT_SUBMITTED';
  const variant =
    normalized === 'GRADED'
      ? 'default'
      : normalized === 'SUBMITTED'
        ? 'secondary'
        : normalized === 'RETURNED'
          ? 'outline'
          : 'outline';
  return <Badge variant={variant}>{statusText[normalized]}</Badge>;
}

function normalizeSubmissionPayload(state: {
  content: string;
  submissionUrl: string;
  linkedProjectId: string;
  linkedDocumentId: string;
}) {
  return {
    content: state.content.trim(),
    submissionUrl: state.submissionUrl.trim(),
    linkedProjectId: state.linkedProjectId ? Number(state.linkedProjectId) : null,
    linkedDocumentId: state.linkedDocumentId ? Number(state.linkedDocumentId) : null,
  };
}

export function StudentAssignmentWorkspace({
  assignment,
  classId,
  onRefresh,
}: {
  assignment: AssignmentRecord;
  classId: number;
  onRefresh: () => Promise<unknown>;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const submissionQ = useQuery({
    queryKey: ['assignmentSubmission', 'me', classId, assignment.id],
    queryFn: () => api.myAssignmentSubmission(classId, assignment.id),
  });
  const projectsQ = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects(),
  });
  const documentsQ = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.documents(),
  });

  const [content, setContent] = React.useState('');
  const [submissionUrl, setSubmissionUrl] = React.useState('');
  const [linkedProjectId, setLinkedProjectId] = React.useState('');
  const [linkedDocumentId, setLinkedDocumentId] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);

  React.useEffect(() => {
    const submission = submissionQ.data;
    if (!submission) return;
    setContent(submission.content || '');
    setSubmissionUrl(submission.submissionUrl || '');
    setLinkedProjectId(submission.linkedProjectId ? String(submission.linkedProjectId) : '');
    setLinkedDocumentId(submission.linkedDocumentId ? String(submission.linkedDocumentId) : '');
  }, [submissionQ.data]);

  const draftM = useMutation({
    mutationFn: () => api.saveMyAssignmentDraft(classId, assignment.id, normalizeSubmissionPayload({ content, submissionUrl, linkedProjectId, linkedDocumentId })),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '草稿已保存' });
      await qc.invalidateQueries({ queryKey: ['assignmentSubmission', 'me', classId, assignment.id] });
      await onRefresh();
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message || '草稿保存失败，请稍后重试。' }),
  });

  const submitM = useMutation({
    mutationFn: () => api.submitMyAssignment(classId, assignment.id, normalizeSubmissionPayload({ content, submissionUrl, linkedProjectId, linkedDocumentId })),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '作业已正式提交' });
      await qc.invalidateQueries({ queryKey: ['assignmentSubmission', 'me', classId, assignment.id] });
      await onRefresh();
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message || '作业提交失败，请稍后重试。' }),
  });

  const activeSubmission = submitM.data ?? draftM.data ?? submissionQ.data;
  const submissionId = activeSubmission?.id ?? null;

  const uploadM = useMutation({
    mutationFn: async (file: File) => {
      let targetSubmissionId = submissionId;
      if (!targetSubmissionId) {
        const draft = await draftM.mutateAsync();
        targetSubmissionId = draft.id ?? null;
      }
      if (!targetSubmissionId) {
        throw new Error('未能创建草稿记录，请稍后重试。');
      }
      return api.uploadFile('ASSIGNMENT_SUBMISSION', targetSubmissionId, file);
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '附件已上传到当前草稿' });
      await qc.invalidateQueries({ queryKey: ['assignmentSubmission', 'me', classId, assignment.id] });
      await onRefresh();
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message || '附件上传失败，请稍后重试。' }),
  });

  const deleteAttachmentM = useMutation({
    mutationFn: (fileId: number) => api.deleteMyAssignmentAttachment(classId, assignment.id, fileId),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: '附件已删除' });
      await qc.invalidateQueries({ queryKey: ['assignmentSubmission', 'me', classId, assignment.id] });
      await onRefresh();
    },
    onError: (err: Error) => setFeedback({ type: 'error', message: err.message || '附件删除失败，请稍后重试。' }),
  });

  const isClosed = !assignment.allowSubmission;
  const visibleProjects = React.useMemo(() => {
    const all = projectsQ.data || [];
    const byClass = assignment.className ? all.filter((item) => item.courseName === assignment.className) : [];
    return byClass.length ? byClass : all;
  }, [assignment.className, projectsQ.data]);

  const selectedProject = visibleProjects.find((item) => String(item.id) === linkedProjectId) || null;
  const visibleDocuments = React.useMemo(() => {
    const all = documentsQ.data || [];
    if (!linkedProjectId) return [];
    return all.filter((item) => item.projectId === Number(linkedProjectId));
  }, [documentsQ.data, linkedProjectId]);

  const canSaveDraft = !isClosed && !(draftM.isPending || submitM.isPending || uploadM.isPending || deleteAttachmentM.isPending);
  const canSubmit = canSaveDraft;

  if (submissionQ.isLoading || projectsQ.isLoading || documentsQ.isLoading) {
    return (
      <Card className="border-muted/70">
        <CardContent className="py-6 text-sm text-muted-foreground">正在加载作业工作区...</CardContent>
      </Card>
    );
  }

  if (submissionQ.isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-sm text-destructive">作业提交记录加载失败，请稍后重试。</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">我的提交工作区</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SubmissionStatusBadge status={activeSubmission?.status} />
              <span>正式提交次数：{activeSubmission?.attemptCount ?? 0}</span>
              <span>最近正式提交：{activeSubmission?.submittedAt || '暂无'}</span>
            </div>
          </div>
          {isClosed ? <Badge variant="outline">已关闭提交</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {feedback ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {feedback.message}
          </div>
        ) : null}

        {(activeSubmission?.teacherFeedback || activeSubmission?.score !== null && activeSubmission?.score !== undefined) ? (
          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">上一轮教师反馈</div>
            <div className="mt-2 whitespace-pre-wrap text-muted-foreground">{activeSubmission?.teacherFeedback || '老师本轮仅给出了分数。'}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              分数：{activeSubmission?.score ?? '未评分'} · 最近批阅：{activeSubmission?.reviewedAt || '暂无'}
            </div>
          </div>
        ) : null}

        {assignment.submissionUrl ? (
          <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">老师提供的参考链接</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <a href={assignment.submissionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                <ExternalLink size={14} />
                打开参考链接
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`assignment-content-${assignment.id}`}>作业说明</Label>
              <Textarea
                id={`assignment-content-${assignment.id}`}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="补充本次作业的思路、实现说明、完成情况等内容"
                className="min-h-[180px]"
                disabled={isClosed}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`assignment-link-${assignment.id}`}>外部提交链接</Label>
              <Input
                id={`assignment-link-${assignment.id}`}
                value={submissionUrl}
                onChange={(event) => setSubmissionUrl(event.target.value)}
                placeholder="例如作品链接、演示地址、外部仓库地址"
                disabled={isClosed}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="space-y-2">
              <Label>关联项目</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={linkedProjectId}
                onChange={(event) => {
                  setLinkedProjectId(event.target.value);
                  setLinkedDocumentId('');
                }}
                disabled={isClosed}
              >
                <option value="">不绑定项目</option>
                {visibleProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}（{project.courseName || '未关联课程'}）
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>主文档</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={linkedDocumentId}
                onChange={(event) => setLinkedDocumentId(event.target.value)}
                disabled={isClosed || !linkedProjectId}
              >
                <option value="">{linkedProjectId ? '不绑定文档' : '请先选择项目'}</option>
                {visibleDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              {selectedProject ? (
                <>
                  <div className="font-medium text-foreground">当前绑定成果</div>
                  <div className="mt-2 flex items-center gap-2">
                    <FolderKanban size={14} />
                    <span>{selectedProject.name}</span>
                  </div>
                  {selectedProject.type === 'CODE' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Link2 size={14} />
                      <span>代码项目将自动关联仓库入口</span>
                    </div>
                  ) : null}
                  {linkedDocumentId ? (
                    <div className="mt-2 flex items-center gap-2">
                      <FileText size={14} />
                      <span>{visibleDocuments.find((item) => String(item.id) === linkedDocumentId)?.title || '已选择主文档'}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                '可以直接绑定系统内项目与文档，减少复制链接和填错。'
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">附件</div>
              <div className="mt-1 text-xs text-muted-foreground">附件会归入当前草稿或最近一次提交记录，但不会自动触发正式提交。</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) await uploadM.mutateAsync(file);
              }}
              disabled={isClosed || uploadM.isPending}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={isClosed || uploadM.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              {uploadM.isPending ? '上传中...' : '上传附件'}
            </Button>
          </div>

          {!(activeSubmission?.attachments?.length) ? (
            <div className="text-sm text-muted-foreground">当前还没有附件。</div>
          ) : (
            <div className="space-y-2">
              {activeSubmission.attachments.map((file) => {
                const deleting = deleteAttachmentM.isPending && deleteAttachmentM.variables === file.id;
                return (
                  <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText size={16} />
                        <span className="truncate">{file.fileName}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatBytes(file.sizeBytes)} · {file.createdAt}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={api.downloadFileUrl(file.id)} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="outline">
                          <Download size={14} className="mr-1" />
                          下载
                        </Button>
                      </a>
                      <Button type="button" size="sm" variant="outline" disabled={isClosed || deleteAttachmentM.isPending} onClick={() => deleteAttachmentM.mutate(file.id)}>
                        <Trash2 size={14} className="mr-1" />
                        {deleting ? '删除中...' : '删除'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isClosed ? (
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            当前作业已关闭提交，你仍可查看历史内容与上一轮反馈，但不能继续修改或正式提交。
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="gap-2" disabled={!canSaveDraft} onClick={() => draftM.mutate()}>
              <Save size={14} />
              {draftM.isPending ? '保存中...' : '保存草稿'}
            </Button>
            <Button type="button" className="gap-2" disabled={!canSubmit} onClick={() => submitM.mutate()}>
              <Send size={14} />
              {submitM.isPending ? '提交中...' : '正式提交'}
            </Button>
            <div className="text-xs text-muted-foreground">草稿不会进入教师待批队列；只有正式提交后老师才会看到你的新版本。</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ReviewFilter = 'ALL' | AssignmentSubmissionStatus;
type ReviewMode = 'overview' | 'review';
type CompletionStatus = 'NOT_STARTED' | 'DRAFT' | 'FORMALLY_SUBMITTED';

const completionStatusText: Record<CompletionStatus, string> = {
  NOT_STARTED: '未开始',
  DRAFT: '草稿',
  FORMALLY_SUBMITTED: '已正式提交',
};

const reviewStatusText: Record<AssignmentSubmissionStatus, string> = {
  NOT_SUBMITTED: '未进入批阅',
  DRAFT: '未进入批阅',
  SUBMITTED: '待批改',
  RETURNED: '已退回',
  GRADED: '已评分',
};

function getSubmissionKey(submission: AssignmentSubmissionRecord) {
  return submission.id ?? -submission.studentId;
}

function getCompletionStatus(status: AssignmentSubmissionStatus): CompletionStatus {
  if (status === 'NOT_SUBMITTED') return 'NOT_STARTED';
  if (status === 'DRAFT') return 'DRAFT';
  return 'FORMALLY_SUBMITTED';
}

function getReviewStatus(status: AssignmentSubmissionStatus) {
  return reviewStatusText[status];
}

function getDisplayScore(score?: number | null) {
  return score === null || score === undefined ? '—' : String(score);
}

function getDisplayTime(value?: string | null) {
  return value || '—';
}

function findDefaultReviewTarget(submissions: AssignmentSubmissionRecord[]) {
  return (
    submissions.find((item) => item.status === 'SUBMITTED') ||
    submissions.find((item) => item.status === 'RETURNED' || item.status === 'GRADED') ||
    submissions[0] ||
    null
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-muted/10 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

export function TeacherAssignmentReviewBoard({
  assignment,
  classId,
  onRefresh,
}: {
  assignment: AssignmentRecord;
  classId: number;
  onRefresh: () => Promise<unknown>;
}) {
  const api = useApi();
  const submissionsQ = useQuery({
    queryKey: ['assignmentSubmissions', classId, assignment.id],
    queryFn: () => api.assignmentSubmissions(classId, assignment.id),
  });

  const [mode, setMode] = React.useState<ReviewMode>('overview');
  const [filter, setFilter] = React.useState<ReviewFilter>('ALL');
  const [keyword, setKeyword] = React.useState('');
  const [selectedSubmissionKey, setSelectedSubmissionKey] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMode('overview');
    setFilter('ALL');
    setKeyword('');
    setSelectedSubmissionKey(null);
  }, [assignment.id]);

  const submissions = React.useMemo(() => submissionsQ.data || [], [submissionsQ.data]);
  const filtered = React.useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return submissions
      .filter((item) => {
        if (filter !== 'ALL' && item.status !== filter) return false;
        if (!normalizedKeyword) return true;
        return `${item.studentName} ${item.studentEmail}`.toLowerCase().includes(normalizedKeyword);
      })
      .sort((left, right) => {
        const priorityGap = queuePriority[left.status] - queuePriority[right.status];
        if (priorityGap !== 0) return priorityGap;
        return left.studentName.localeCompare(right.studentName, 'zh-CN');
      });
  }, [filter, keyword, submissions]);

  React.useEffect(() => {
    if (!filtered.length) {
      setSelectedSubmissionKey(null);
      return;
    }
    if (!selectedSubmissionKey || !filtered.some((item) => getSubmissionKey(item) === selectedSubmissionKey)) {
      setSelectedSubmissionKey(findDefaultReviewTarget(filtered) ? getSubmissionKey(findDefaultReviewTarget(filtered)!) : null);
    }
  }, [filtered, selectedSubmissionKey]);

  const selectedSubmission =
    filtered.find((item) => getSubmissionKey(item) === selectedSubmissionKey) || findDefaultReviewTarget(filtered);
  const selectedIndex = selectedSubmission ? filtered.findIndex((item) => getSubmissionKey(item) === getSubmissionKey(selectedSubmission)) : -1;

  if (submissionsQ.isLoading) {
    return (
      <Card className="border-muted/70">
        <CardContent className="py-6 text-sm text-muted-foreground">正在加载提交列表...</CardContent>
      </Card>
    );
  }

  if (submissionsQ.isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-sm text-destructive">提交列表加载失败，请稍后重试。</CardContent>
      </Card>
    );
  }

  const submittedCount = submissions.filter((item) => item.status === 'SUBMITTED').length;
  const returnedCount = submissions.filter((item) => item.status === 'RETURNED').length;
  const gradedCount = submissions.filter((item) => item.status === 'GRADED').length;
  const formalSubmissionCount = submissions.filter((item) => getCompletionStatus(item.status) === 'FORMALLY_SUBMITTED').length;

  const startReview = (targetKey?: number | null) => {
    const target =
      (targetKey !== null && targetKey !== undefined
        ? filtered.find((item) => getSubmissionKey(item) === targetKey)
        : findDefaultReviewTarget(filtered)) || null;
    if (!target) return;
    setSelectedSubmissionKey(getSubmissionKey(target));
    setMode('review');
  };

  if (mode === 'overview') {
    return (
      <div className="space-y-4">
        <Card className="border-muted/70">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-lg">批阅总览</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {assignment.className || '未知课程'} · 截止时间：{assignment.dueDate || '未设置'} · {assignment.status === 'CLOSED' ? '已关闭提交' : '开放提交中'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索学生姓名或邮箱" className="pl-9" />
                </div>
                <select
                  className="flex h-9 min-w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ReviewFilter)}
                >
                  <option value="ALL">全部状态</option>
                  <option value="SUBMITTED">待批改</option>
                  <option value="RETURNED">已退回</option>
                  <option value="GRADED">已评分</option>
                  <option value="DRAFT">草稿</option>
                  <option value="NOT_SUBMITTED">未提交</option>
                </select>
                <Button type="button" disabled={!filtered.length} onClick={() => startReview()}>
                  进入连续批阅模式
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <SummaryMetric label="全班学生" value={submissions.length} />
            <SummaryMetric label="已正式提交" value={formalSubmissionCount} />
            <SummaryMetric label="待批改" value={submittedCount} />
            <SummaryMetric label="已评分" value={gradedCount} />
          </CardContent>
        </Card>

        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">学生提交名单</CardTitle>
              <div className="text-xs text-muted-foreground">
                当前筛选：{filtered.length} / {submissions.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!filtered.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">当前筛选下没有学生记录。</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">学生</th>
                      <th className="px-4 py-3 font-medium">完成状态</th>
                      <th className="px-4 py-3 font-medium">批阅状态</th>
                      <th className="px-4 py-3 font-medium">分数</th>
                      <th className="px-4 py-3 font-medium">提交次数</th>
                      <th className="px-4 py-3 font-medium">最近正式提交</th>
                      <th className="px-4 py-3 font-medium">最近批阅</th>
                      <th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((submission) => {
                      const completionStatus = getCompletionStatus(submission.status);
                      const rowSelected = getSubmissionKey(submission) === selectedSubmissionKey;
                      return (
                        <tr key={getSubmissionKey(submission)} className={`border-t ${rowSelected ? 'bg-primary/5' : 'bg-background'}`}>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium">{submission.studentName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{submission.studentEmail}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant="outline">{completionStatusText[completionStatus]}</Badge>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <SubmissionStatusBadge status={submission.status} />
                            <div className="mt-1 text-xs text-muted-foreground">{getReviewStatus(submission.status)}</div>
                          </td>
                          <td className="px-4 py-3 align-top">{getDisplayScore(submission.score)}</td>
                          <td className="px-4 py-3 align-top">{submission.attemptCount}</td>
                          <td className="px-4 py-3 align-top text-muted-foreground">{getDisplayTime(submission.submittedAt)}</td>
                          <td className="px-4 py-3 align-top text-muted-foreground">{getDisplayTime(submission.reviewedAt)}</td>
                          <td className="px-4 py-3 align-top text-right">
                            <Button type="button" size="sm" variant="outline" onClick={() => startReview(getSubmissionKey(submission))}>
                              批阅该学生
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
      <Card className="border-muted/70 xl:sticky xl:top-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">学生名单</CardTitle>
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索学生姓名或邮箱" className="pl-9" />
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value as ReviewFilter)}
            >
              <option value="ALL">全部状态</option>
              <option value="SUBMITTED">待批改</option>
              <option value="RETURNED">已退回</option>
              <option value="GRADED">已评分</option>
              <option value="DRAFT">草稿</option>
              <option value="NOT_SUBMITTED">未提交</option>
            </select>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>待批改 {submittedCount}</span>
              <span>已退回 {returnedCount}</span>
              <span>已评分 {gradedCount}</span>
              <span>总计 {filtered.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 xl:max-h-[calc(100vh-16rem)] xl:overflow-y-auto">
          {!filtered.length ? (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">当前筛选下没有学生记录。</div>
          ) : (
            filtered.map((submission) => {
              const selected = getSubmissionKey(submission) === getSubmissionKey(selectedSubmission || submission);
              const completionStatus = getCompletionStatus(submission.status);
              return (
                <button
                  key={getSubmissionKey(submission)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${selected ? 'border-primary bg-primary/5' : 'border-muted/70 hover:bg-muted/30'}`}
                  onClick={() => setSelectedSubmissionKey(getSubmissionKey(submission))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{submission.studentName}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{submission.studentEmail}</div>
                    </div>
                    <SubmissionStatusBadge status={submission.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{completionStatusText[completionStatus]}</span>
                    <span>分数 {getDisplayScore(submission.score)}</span>
                    <span>{submission.submittedAt ? `提交：${submission.submittedAt}` : '暂无正式提交'}</span>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="border-muted/70">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-lg">{assignment.title}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {assignment.className || '未知课程'} · 截止时间：{assignment.dueDate || '未设置'} · {assignment.status === 'CLOSED' ? '已关闭提交' : '开放提交中'}
                </div>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {assignment.summary || '暂无说明'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedSubmission ? `${selectedIndex + 1} / ${filtered.length}` : `0 / ${filtered.length}`}</Badge>
                <Button type="button" variant="outline" onClick={() => setMode('overview')}>
                  返回名单总览
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={selectedIndex <= 0}
                  onClick={() => setSelectedSubmissionKey(getSubmissionKey(filtered[selectedIndex - 1]))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1}
                  onClick={() => setSelectedSubmissionKey(getSubmissionKey(filtered[selectedIndex + 1]))}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <SummaryMetric label="已正式提交" value={formalSubmissionCount} />
            <SummaryMetric label="待批改" value={submittedCount} />
            <SummaryMetric label="已评分" value={gradedCount} />
          </CardContent>
        </Card>

        {!selectedSubmission ? (
          <Card className="border-muted/70">
            <CardContent className="py-10 text-sm text-muted-foreground">请选择左侧学生以开始连续批改。</CardContent>
          </Card>
        ) : (
          <TeacherSubmissionWorkspace
            assignment={assignment}
            classId={classId}
            submission={selectedSubmission}
            onRefresh={onRefresh}
            onAdvanceAfterSubmitted={
              selectedIndex >= 0 && selectedIndex < filtered.length - 1
                ? () => {
                    setSelectedSubmissionKey(getSubmissionKey(filtered[selectedIndex + 1]));
                    return true;
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function TeacherSubmissionWorkspace({
  assignment,
  classId,
  submission,
  onRefresh,
  onAdvanceAfterSubmitted,
}: {
  assignment: AssignmentRecord;
  classId: number;
  submission: AssignmentSubmissionRecord;
  onRefresh: () => Promise<unknown>;
  onAdvanceAfterSubmitted?: () => boolean;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [score, setScore] = React.useState(submission.score === null || submission.score === undefined ? '' : String(submission.score));
  const [feedback, setFeedback] = React.useState(submission.teacherFeedback || '');
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setScore(submission.score === null || submission.score === undefined ? '' : String(submission.score));
    setFeedback(submission.teacherFeedback || '');
    setMessage(null);
  }, [submission]);

  const reviewM = useMutation({
    mutationFn: (status: 'RETURNED' | 'GRADED') =>
      api.reviewAssignmentSubmission(classId, assignment.id, submission.id!, {
        status,
        score: score.trim() ? Number(score) : null,
        teacherFeedback: feedback.trim(),
      }),
    onSuccess: async (_, status) => {
      await qc.invalidateQueries({ queryKey: ['assignmentSubmissions', classId, assignment.id] });
      await onRefresh();
      if (submission.status === 'SUBMITTED') {
        const advanced = onAdvanceAfterSubmitted?.() || false;
        if (!advanced) {
          setMessage(
            status === 'RETURNED'
              ? '已退回修改，当前筛选下已没有下一份待批改。'
              : '评分已保存，当前筛选下已没有下一份待批改。',
          );
        }
        return;
      }
      setMessage(status === 'RETURNED' ? '已退回修改' : '评分已保存');
    },
    onError: (err: Error) => setMessage(err.message || '批改失败，请稍后重试。'),
  });

  const canReview = submission.status === 'SUBMITTED' || submission.status === 'RETURNED' || submission.status === 'GRADED';

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{submission.studentName}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{submission.studentEmail}</span>
              <SubmissionStatusBadge status={submission.status} />
              <Badge variant="outline">{completionStatusText[getCompletionStatus(submission.status)]}</Badge>
              <span>尝试 {submission.attemptCount}</span>
              <span>{submission.submittedAt ? `最近正式提交：${submission.submittedAt}` : '暂无正式提交'}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">{message}</div> : null}

        <div className="grid gap-5 lg:grid-cols-[1.3fr,0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">学生说明</div>
              <div className="whitespace-pre-wrap rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                {submission.content || '未填写说明'}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border p-4">
              <div className="text-sm font-medium">成果绑定</div>
              {submission.linkedProjectName ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={15} className="text-muted-foreground" />
                    <span>{submission.linkedProjectName}</span>
                  </div>
                  {submission.linkedRepositoryUrl || submission.linkedRepositoryName ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Link2 size={15} />
                      {submission.linkedRepositoryUrl ? (
                        <a href={submission.linkedRepositoryUrl} className="text-primary hover:underline">
                          {submission.linkedRepositoryName || '查看仓库'}
                        </a>
                      ) : (
                        <span>{submission.linkedRepositoryName}</span>
                      )}
                    </div>
                  ) : null}
                  {submission.linkedDocumentTitle ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText size={15} />
                      <span>{submission.linkedDocumentTitle}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">未绑定系统内项目或文档。</div>
              )}
            </div>

            <div className="space-y-2 rounded-2xl border p-4">
              <div className="text-sm font-medium">外部链接与附件</div>
              <div className="flex flex-wrap gap-2">
                {submission.submissionUrl ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => window.open(submission.submissionUrl, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink size={14} className="mr-1" />
                    打开提交链接
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">未填写外部链接</span>
                )}
                {submission.attachments.map((file) => (
                  <a key={file.id} href={api.downloadFileUrl(file.id)} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      <Download size={14} className="mr-1" />
                      {file.fileName}
                    </Button>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="space-y-2">
              <Label htmlFor={`score-${submission.studentId}`}>评分</Label>
              <Input id={`score-${submission.studentId}`} type="number" min={0} max={100} value={score} onChange={(event) => setScore(event.target.value)} placeholder="0-100" disabled={!canReview} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`feedback-${submission.studentId}`}>反馈</Label>
              <Textarea
                id={`feedback-${submission.studentId}`}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="写给学生的评语、修改建议或退回说明"
                className="min-h-[180px]"
                disabled={!canReview}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!canReview || reviewM.isPending} onClick={() => reviewM.mutate('RETURNED')}>
                <RefreshCcw size={14} className="mr-1" />
                退回修改
              </Button>
              <Button type="button" disabled={!canReview || reviewM.isPending} onClick={() => reviewM.mutate('GRADED')}>
                保存评分
              </Button>
            </div>
            {submission.reviewedAt ? <div className="text-xs text-muted-foreground">最近批阅：{submission.reviewedAt}</div> : null}
            {!canReview ? (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                {submission.status === 'NOT_SUBMITTED' ? '该学生还没有正式提交作业。' : '当前是草稿状态，学生正式提交后才会进入待批改队列。'}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatBytes(size?: number | null) {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
