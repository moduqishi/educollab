import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCcw,
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
} from '@/lib/types';

const statusText: Record<AssignmentSubmissionStatus, string> = {
  NOT_SUBMITTED: '未提交',
  SUBMITTED: '已提交',
  RETURNED: '已退回',
  GRADED: '已评分',
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
    normalized === 'GRADED' ? 'default' : normalized === 'SUBMITTED' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{statusText[normalized]}</Badge>;
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

  const [content, setContent] = React.useState('');
  const [submissionUrl, setSubmissionUrl] = React.useState('');
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!submissionQ.data) return;
    setContent(submissionQ.data.content || '');
    setSubmissionUrl(submissionQ.data.submissionUrl || '');
  }, [submissionQ.data]);

  const saveM = useMutation({
    mutationFn: () =>
      api.saveMyAssignmentSubmission(classId, assignment.id, {
        content: content.trim(),
        submissionUrl: submissionUrl.trim(),
      }),
    onSuccess: async () => {
      setAttachmentError(null);
      await qc.invalidateQueries({
        queryKey: ['assignmentSubmission', 'me', classId, assignment.id],
      });
      await onRefresh();
    },
    onError: (err: Error) => {
      setAttachmentError(err.message || '提交保存失败，请稍后重试。');
    },
  });

  const activeSubmission = saveM.data ?? submissionQ.data;
  const submissionId = activeSubmission?.id ?? null;

  const uploadM = useMutation({
    mutationFn: ({ file, targetSubmissionId }: { file: File; targetSubmissionId: number }) =>
      api.uploadFile('ASSIGNMENT_SUBMISSION', targetSubmissionId, file),
    onSuccess: async () => {
      setAttachmentError(null);
      await qc.invalidateQueries({
        queryKey: ['assignmentSubmission', 'me', classId, assignment.id],
      });
      await onRefresh();
    },
    onError: (err: Error) => {
      setAttachmentError(err.message || '附件上传失败，请稍后重试。');
    },
  });

  const deleteAttachmentM = useMutation({
    mutationFn: (fileId: number) => api.deleteMyAssignmentAttachment(classId, assignment.id, fileId),
    onSuccess: async () => {
      setAttachmentError(null);
      await qc.invalidateQueries({
        queryKey: ['assignmentSubmission', 'me', classId, assignment.id],
      });
      await onRefresh();
    },
    onError: (err: Error) => {
      setAttachmentError(err.message || '附件删除失败，请稍后重试。');
    },
  });

  const handlePickAttachment = React.useCallback(() => {
    if (!uploadM.isPending && !saveM.isPending && !deleteAttachmentM.isPending) {
      fileInputRef.current?.click();
    }
  }, [deleteAttachmentM.isPending, saveM.isPending, uploadM.isPending]);

  const handleAttachmentChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;

      setAttachmentError(null);

      try {
        let targetSubmissionId = submissionId;
        if (!targetSubmissionId) {
          const createdSubmission = await saveM.mutateAsync();
          targetSubmissionId = createdSubmission.id ?? null;
        }

        if (!targetSubmissionId) {
          setAttachmentError('未能创建作业提交记录，请稍后重试。');
          return;
        }

        await uploadM.mutateAsync({ file, targetSubmissionId });
      } catch (error) {
        if (error instanceof Error) {
          setAttachmentError(error.message || '附件上传失败，请稍后重试。');
          return;
        }
        setAttachmentError('附件上传失败，请稍后重试。');
      }
    },
    [saveM, submissionId, uploadM],
  );

  if (submissionQ.isLoading) {
    return (
      <Card className="border-muted/70">
        <CardContent className="py-6 text-sm text-muted-foreground">
          正在加载你的提交记录...
        </CardContent>
      </Card>
    );
  }

  if (submissionQ.isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-sm text-destructive">
          作业提交记录加载失败，请稍后重试。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base">提交作业</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <SubmissionStatusBadge status={activeSubmission?.status} />
              <span>尝试次数：{activeSubmission?.attemptCount ?? 0}</span>
              <span>最近提交：{activeSubmission?.submittedAt || '暂无'}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSubmission?.teacherFeedback ? (
          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-medium">教师反馈</div>
            <div className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {activeSubmission.teacherFeedback}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              分数：{activeSubmission.score ?? '未评分'} | 批阅时间：
              {activeSubmission.reviewedAt || '暂无'}
            </div>
          </div>
        ) : null}

        {attachmentError ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {attachmentError}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`assignment-content-${assignment.id}`}>作业说明</Label>
          <Textarea
            id={`assignment-content-${assignment.id}`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="补充本次作业的思路、实现说明、完成情况等内容"
            className="min-h-[140px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`assignment-link-${assignment.id}`}>提交链接</Label>
          <Input
            id={`assignment-link-${assignment.id}`}
            value={submissionUrl}
            onChange={(event) => setSubmissionUrl(event.target.value)}
            placeholder="例如作品链接、文档链接、仓库地址"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending || (!content.trim() && !submissionUrl.trim())}
          >
            {saveM.isPending ? '正在保存...' : activeSubmission?.id ? '更新提交' : '提交作业'}
          </Button>
          <div className="text-xs text-muted-foreground">
            直接选择附件即可自动创建或更新提交记录，再次提交会保留原有附件。
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">附件</div>
              <div className="mt-1 text-xs text-muted-foreground">
                支持上传作业文件、截图、压缩包等材料。
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
              disabled={uploadM.isPending || saveM.isPending || deleteAttachmentM.isPending}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={uploadM.isPending || saveM.isPending || deleteAttachmentM.isPending}
              onClick={handlePickAttachment}
            >
              <Upload size={14} />
              {uploadM.isPending || saveM.isPending ? '上传中...' : '上传附件'}
            </Button>
          </div>

          {!submissionId ? (
            <div className="text-sm text-muted-foreground">
              选择附件后会自动创建提交记录并开始上传。
            </div>
          ) : !(activeSubmission?.attachments?.length) ? (
            <div className="text-sm text-muted-foreground">当前还没有附件。</div>
          ) : (
            <div className="space-y-2">
              {activeSubmission.attachments.map((file) => {
                const deleting = deleteAttachmentM.isPending && deleteAttachmentM.variables === file.id;
                return (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText size={16} />
                        <span className="truncate">{file.fileName}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatBytes(file.sizeBytes)} | {file.createdAt}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={api.downloadFileUrl(file.id)} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="outline">
                          <Download size={14} className="mr-1" />
                          下载
                        </Button>
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deleteAttachmentM.isPending}
                        onClick={() => deleteAttachmentM.mutate(file.id)}
                      >
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
      </CardContent>
    </Card>
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

  if (submissionsQ.isLoading) {
    return (
      <Card className="border-muted/70">
        <CardContent className="py-6 text-sm text-muted-foreground">
          正在加载提交列表...
        </CardContent>
      </Card>
    );
  }

  if (submissionsQ.isError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-sm text-destructive">
          提交列表加载失败，请稍后重试。
        </CardContent>
      </Card>
    );
  }

  const submissions = submissionsQ.data || [];
  const total = submissions.length;
  const submitted = submissions.filter((item) => item.status !== 'NOT_SUBMITTED').length;
  const graded = submissions.filter((item) => item.status === 'GRADED').length;

  return (
    <div className="space-y-4">
      <Card className="border-muted/70">
        <CardContent className="flex flex-wrap gap-4 py-4 text-sm">
          <span>已提交：{submitted}/{total}</span>
          <span>已评分：{graded}/{total}</span>
          <span>待处理：{submissions.filter((item) => item.status === 'SUBMITTED').length}</span>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {submissions.map((submission) => (
          <TeacherSubmissionCard
            key={`${submission.studentId}-${submission.assignmentId}`}
            assignment={assignment}
            classId={classId}
            submission={submission}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}

function TeacherSubmissionCard({
  assignment,
  classId,
  submission,
  onRefresh,
}: {
  assignment: AssignmentRecord;
  classId: number;
  submission: AssignmentSubmissionRecord;
  onRefresh: () => Promise<unknown>;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [score, setScore] = React.useState(
    submission.score === null || submission.score === undefined ? '' : String(submission.score),
  );
  const [feedback, setFeedback] = React.useState(submission.teacherFeedback || '');

  React.useEffect(() => {
    setScore(
      submission.score === null || submission.score === undefined ? '' : String(submission.score),
    );
    setFeedback(submission.teacherFeedback || '');
  }, [submission.score, submission.teacherFeedback]);

  const reviewM = useMutation({
    mutationFn: (status: 'RETURNED' | 'GRADED') =>
      api.reviewAssignmentSubmission(classId, assignment.id, submission.id!, {
        status,
        score: score.trim() ? Number(score) : null,
        teacherFeedback: feedback.trim(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ['assignmentSubmissions', classId, assignment.id],
      });
      await onRefresh();
    },
  });

  const canReview = submission.status !== 'NOT_SUBMITTED' && !!submission.id;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{submission.studentName}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {submission.studentEmail} | 最近提交：{submission.submittedAt || '未提交'}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={submission.status} />
            <Badge variant="outline">尝试 {submission.attemptCount}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.status === 'NOT_SUBMITTED' ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            该学生还没有提交作业。
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="text-sm font-medium">学生说明</div>
              <div className="whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                {submission.content || '未填写说明'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {submission.submissionUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(submission.submissionUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink size={14} className="mr-1" />
                  打开提交链接
                </Button>
              ) : null}
              {submission.attachments.map((file) => (
                <a
                  key={file.id}
                  href={api.downloadFileUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button type="button" variant="outline" size="sm">
                    <Download size={14} className="mr-1" />
                    {file.fileName}
                  </Button>
                </a>
              ))}
            </div>
          </>
        )}

        <div className="grid gap-4 md:grid-cols-[140px,1fr]">
          <div className="space-y-2">
            <Label htmlFor={`score-${submission.studentId}`}>评分</Label>
            <Input
              id={`score-${submission.studentId}`}
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="0-100"
              disabled={!canReview}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`feedback-${submission.studentId}`}>反馈</Label>
            <Textarea
              id={`feedback-${submission.studentId}`}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="写给学生的评语、修改建议或退回说明"
              className="min-h-[120px]"
              disabled={!canReview}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => reviewM.mutate('RETURNED')}
            disabled={!canReview || reviewM.isPending}
          >
            <RefreshCcw size={14} className="mr-1" />
            退回修改
          </Button>
          <Button
            type="button"
            onClick={() => reviewM.mutate('GRADED')}
            disabled={!canReview || reviewM.isPending}
          >
            保存评分
          </Button>
          {submission.reviewedAt ? (
            <div className="text-xs text-muted-foreground">最近批阅：{submission.reviewedAt}</div>
          ) : null}
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
