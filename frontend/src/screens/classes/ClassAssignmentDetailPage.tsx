import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { SubmissionStatusBadge, StudentAssignmentWorkspace, TeacherAssignmentReviewBoard } from '@/screens/assignments/AssignmentPanels';
import { PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ClassAssignmentDetailPage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();
  const { classId, assignmentId } = useParams();
  const resolvedClassId = Number(classId);
  const resolvedAssignmentId = Number(assignmentId);
  const isTeacher = session?.profile.role === 'TEACHER';

  const detailQ = useQuery({
    queryKey: ['classDetail', resolvedClassId],
    queryFn: () => api.classDetail(resolvedClassId),
    enabled: !!resolvedClassId,
  });

  const assignment = detailQ.data?.assignments.find((item) => item.id === resolvedAssignmentId) || null;

  React.useEffect(() => {
    setTitle([assignment?.title || '作业详情']);
  }, [assignment?.title]);

  const refreshAll = React.useCallback(
    async () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['classes'] }),
        qc.invalidateQueries({ queryKey: ['classDetail', resolvedClassId] }),
        qc.invalidateQueries({ queryKey: ['teacherAssignments'] }),
        qc.invalidateQueries({ queryKey: ['assignmentSubmissions', resolvedClassId, resolvedAssignmentId] }),
        qc.invalidateQueries({ queryKey: ['assignmentSubmission', 'me', resolvedClassId, resolvedAssignmentId] }),
      ]),
    [qc, resolvedAssignmentId, resolvedClassId],
  );

  if (!resolvedClassId || !resolvedAssignmentId) {
    return (
      <PageError
        title="作业不存在"
        message="课程编号或作业编号无效。"
        onRetry={() => navigate('/app/classes')}
      />
    );
  }

  if (detailQ.isLoading) {
    return <PageLoading label="正在加载作业详情..." />;
  }

  if (detailQ.isError || !detailQ.data) {
    return (
      <PageError
        title="作业详情加载失败"
        message="暂时无法读取课程作业，请稍后重试。"
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  if (!assignment) {
    return (
      <PageError
        title="作业不存在"
        message="当前课程中没有找到这份作业。"
        onRetry={() => navigate(`/app/classes?classId=${resolvedClassId}&tab=assignments`)}
      />
    );
  }

  return (
    <div>
      <PageHero
        title={assignment.title}
        subtitle={`${detailQ.data.classInfo.name} · 截止时间：${assignment.dueDate || '未设置'}`}
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/app/classes?classId=${resolvedClassId}&tab=assignments`)}
          >
            <ArrowLeft size={14} />
            返回课程作业
          </Button>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1200px] space-y-6">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {isTeacher ? (
                      <>
                        <Badge variant="outline">已提交 {assignment.totalSubmissions ?? 0}</Badge>
                        <Badge variant="outline">已评分 {assignment.gradedSubmissions ?? 0}</Badge>
                        <Badge variant="outline">待处理 {assignment.pendingSubmissions ?? 0}</Badge>
                      </>
                    ) : (
                      <>
                        <SubmissionStatusBadge status={assignment.currentUserSubmissionStatus} />
                        <span>最近提交：{assignment.currentUserSubmittedAt || '暂无'}</span>
                        <span>得分：{assignment.currentUserScore ?? '未评分'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                {assignment.summary || '暂无说明'}
              </div>
            </CardContent>
          </Card>

          {isTeacher ? (
            <TeacherAssignmentReviewBoard
              assignment={assignment}
              classId={resolvedClassId}
              onRefresh={refreshAll}
            />
          ) : (
            <StudentAssignmentWorkspace
              assignment={assignment}
              classId={resolvedClassId}
              onRefresh={refreshAll}
            />
          )}

          <Card className="border-dashed">
            <CardContent className="py-4 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <ClipboardCheck size={14} className="mt-0.5" />
                {isTeacher
                  ? '教师可以在这个页面直接查看学生提交、填写反馈、评分或退回修改。'
                  : '学生可以在这个页面直接填写作业说明、保存提交链接并上传附件完成作业。'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
