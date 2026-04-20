import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeacherAssignmentReviewBoard } from '@/screens/assignments/AssignmentPanels';
import { PageHero } from '@/screens/shell/PageHero';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';

export function TeacherAssignmentsPage() {
  const api = useApi();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['作业批阅']), []);

  const q = useQuery({ queryKey: ['teacherAssignments'], queryFn: () => api.assignments() });
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!q.data?.length) {
      setSelectedAssignmentId(null);
      return;
    }
    if (!selectedAssignmentId || !q.data.some((item) => item.id === selectedAssignmentId)) {
      setSelectedAssignmentId(q.data[0].id);
    }
  }, [q.data, selectedAssignmentId]);

  const refreshAll = React.useCallback(
    async () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['teacherAssignments'] }),
        qc.invalidateQueries({ queryKey: ['classDetail'] }),
        qc.invalidateQueries({ queryKey: ['assignmentSubmissions'] }),
      ]),
    [qc],
  );

  if (q.isLoading) return <PageLoading label="正在加载作业批阅台..." />;
  if (q.isError) return <PageError title="作业列表加载失败" onRetry={() => q.refetch()} />;

  const assignments = q.data || [];
  const selectedAssignment =
    assignments.find((item) => item.id === selectedAssignmentId) || assignments[0];

  return (
    <div>
      <PageHero
        title="作业批阅"
        subtitle="集中查看课程作业的提交进度，完成评分与退回修改。"
      />
      <div className="px-8 pb-10">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 xl:grid-cols-[360px,1fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">全部作业</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!assignments.length ? (
                <PageEmpty
                  title="暂无作业"
                  message="先到课程中心发布普通作业，这里会自动汇总批阅进度。"
                  icon={ClipboardCheck}
                />
              ) : (
                assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      assignment.id === selectedAssignment?.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted/70 hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{assignment.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {(assignment.className || '未知课程') + ' · 截止：' + (assignment.dueDate || '未设置')}
                        </div>
                      </div>
                      <Badge variant="outline">{assignment.pendingSubmissions ?? 0} 待处理</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>已提交 {assignment.totalSubmissions ?? 0}</span>
                      <span>已评分 {assignment.gradedSubmissions ?? 0}</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {!selectedAssignment ? (
            <PageEmpty
              title="暂无批阅内容"
              message="选择一份作业后即可查看学生提交并完成批阅。"
              icon={ClipboardCheck}
            />
          ) : (
            <div className="space-y-4">
              <Card className="border-muted/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{selectedAssignment.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    课程：{selectedAssignment.className || '未知课程'} · 发布时间：
                    {selectedAssignment.createdAt}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {selectedAssignment.summary || '暂无说明'}
                  </div>
                </CardContent>
              </Card>

              <TeacherAssignmentReviewBoard
                assignment={selectedAssignment}
                classId={selectedAssignment.classId!}
                onRefresh={refreshAll}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
