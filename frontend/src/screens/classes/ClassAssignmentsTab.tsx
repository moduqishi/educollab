import React from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentDialog } from '@/screens/classes/ClassDialogs';
import { SubmissionStatusBadge } from '@/screens/assignments/AssignmentPanels';
import { PageEmpty } from '@/screens/common/States';
import type { ClassDetail } from '@/lib/types';

export function AssignmentsTab({
  detail,
  isTeacher,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onCloseAssignment,
  onReopenAssignment,
}: {
  detail: ClassDetail;
  isTeacher: boolean;
  onCreateAssignment: (payload: {
    title: string;
    summary: string;
    submissionUrl?: string;
    dueDate?: string;
  }) => Promise<unknown>;
  onUpdateAssignment: (assignmentId: number, payload: {
    title: string;
    summary: string;
    submissionUrl?: string;
    dueDate?: string;
  }) => Promise<unknown>;
  onDeleteAssignment: (assignmentId: number) => Promise<unknown>;
  onCloseAssignment: (assignmentId: number) => Promise<unknown>;
  onReopenAssignment: (assignmentId: number) => Promise<unknown>;
}) {
  const navigate = useNavigate();

  if (!detail.assignments.length) {
    return (
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">普通作业</CardTitle>
            {isTeacher ? <AssignmentDialog onSubmit={onCreateAssignment} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          <PageEmpty
            title="当前还没有普通作业"
            message={isTeacher ? '先发布一份作业，学生才能进入提交页完成作业。' : '老师发布作业后，你就可以进入作业详情页完成提交。'}
            icon={ClipboardCheck}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">普通作业</CardTitle>
          {isTeacher ? <AssignmentDialog onSubmit={onCreateAssignment} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {detail.assignments.map((assignment) => (
          <div key={assignment.id} className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{assignment.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  截止：{assignment.dueDate || '未设置'}
                </div>
              </div>
              {isTeacher ? (
                <Badge variant="outline">{assignment.pendingSubmissions ?? 0} 待处理</Badge>
              ) : (
                <SubmissionStatusBadge status={assignment.currentUserSubmissionStatus} />
              )}
            </div>

            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {assignment.summary || '暂无说明'}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {isTeacher ? (
                <>
                  <span>状态：{assignment.status === 'CLOSED' ? '已关闭' : '开放中'}</span>
                  <span>已提交 {assignment.totalSubmissions ?? 0}</span>
                  <span>已评分 {assignment.gradedSubmissions ?? 0}</span>
                </>
              ) : (
                <>
                  <span>最近提交：{assignment.currentUserSubmittedAt || '暂无'}</span>
                  <span>得分：{assignment.currentUserScore ?? '未评分'}</span>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={() =>
                  navigate(`/app/classes/${detail.classInfo.id}/assignments/${assignment.id}`)
                }
              >
                {isTeacher ? '进入批阅页' : '进入作业页'}
                <ArrowRight size={14} className="ml-1" />
              </Button>
              {isTeacher ? (
                <>
                  <AssignmentDialog
                    mode="edit"
                    initialValue={{
                      title: assignment.title,
                      summary: assignment.summary,
                      submissionUrl: assignment.submissionUrl,
                      dueDate: assignment.dueDate || '',
                    }}
                    triggerLabel="编辑"
                    dialogTitle="编辑作业"
                    submitLabel="保存"
                    onSubmit={(payload) => onUpdateAssignment(assignment.id, payload)}
                  />
                  {assignment.status === 'CLOSED' ? (
                    <Button variant="outline" onClick={() => onReopenAssignment(assignment.id)}>重新开放</Button>
                  ) : (
                    <Button variant="outline" onClick={() => onCloseAssignment(assignment.id)}>关闭提交</Button>
                  )}
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDeleteAssignment(assignment.id)}>
                    删除
                  </Button>
                </>
              ) : null}
              <div className="text-xs text-muted-foreground">
                {isTeacher
                  ? '在详情页里查看全班提交、评分和退回修改。'
                  : '在详情页里填写作业说明、提交链接并上传附件。'}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
