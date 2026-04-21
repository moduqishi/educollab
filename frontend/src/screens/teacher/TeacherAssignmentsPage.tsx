import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ClipboardCheck, FolderOpen } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { AssignmentsTab } from '@/screens/classes/ClassAssignmentsTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import { deriveAssignmentCoursesFromAssignments } from './teacherAssignmentCourseUtils';

export function TeacherAssignmentsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const selectedCourseId = Number(searchParams.get('courseId') || '');

  React.useEffect(() => setTitle(['教师作业']), []);

  const coursesQ = useQuery({
    queryKey: ['teacherAssignmentCourses'],
    queryFn: () => api.assignmentCourses(),
  });
  const assignmentsFallbackQ = useQuery({
    queryKey: ['teacherAssignments'],
    queryFn: () => api.assignments(),
  });

  const selectedCourseQ = useQuery({
    queryKey: ['classDetail', selectedCourseId],
    queryFn: () => api.classDetail(selectedCourseId),
    enabled: Number.isFinite(selectedCourseId) && selectedCourseId > 0,
  });

  const createAssignmentM = useMutation({
    mutationFn: (payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string }) =>
      api.createAssignment(selectedCourseId, payload),
    onSuccess: refreshCourseData,
  });
  const updateAssignmentM = useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: number; payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string } }) =>
      api.updateAssignment(selectedCourseId, assignmentId, payload),
    onSuccess: refreshCourseData,
  });
  const deleteAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.deleteClassAssignment(selectedCourseId, assignmentId),
    onSuccess: refreshCourseData,
  });
  const closeAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.closeAssignment(selectedCourseId, assignmentId),
    onSuccess: refreshCourseData,
  });
  const reopenAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.reopenAssignment(selectedCourseId, assignmentId),
    onSuccess: refreshCourseData,
  });

  async function refreshCourseData() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['teacherAssignmentCourses'] }),
      qc.invalidateQueries({ queryKey: ['classDetail', selectedCourseId] }),
      qc.invalidateQueries({ queryKey: ['classDetail'] }),
      qc.invalidateQueries({ queryKey: ['assignmentSubmissions'] }),
    ]);
  }

  const openCourse = (courseId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('courseId', String(courseId));
    setSearchParams(next);
  };

  const closeCourse = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('courseId');
    setSearchParams(next);
    setKeyword('');
    setStatusFilter('ALL');
  };

  const derivedCourses = React.useMemo(
    () =>
      assignmentsFallbackQ.data
        ? deriveAssignmentCoursesFromAssignments(assignmentsFallbackQ.data)
        : [],
    [assignmentsFallbackQ.data],
  );
  const courses = coursesQ.data || derivedCourses;

  if (coursesQ.isLoading && assignmentsFallbackQ.isLoading) {
    return <PageLoading label="正在加载教师作业中心..." />;
  }
  if (!courses.length && coursesQ.isError && assignmentsFallbackQ.isError) {
    return (
      <PageError
        title="课程作业概览加载失败"
        onRetry={() => {
          coursesQ.refetch();
          assignmentsFallbackQ.refetch();
        }}
      />
    );
  }

  if (selectedCourseId > 0) {
    if (selectedCourseQ.isLoading) return <PageLoading label="正在加载课程作业..." />;
    if (selectedCourseQ.isError || !selectedCourseQ.data) {
      return <PageError title="课程作业加载失败" onRetry={() => selectedCourseQ.refetch()} />;
    }

    const filteredAssignments = selectedCourseQ.data.assignments.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (keyword.trim()) {
        const haystack = `${item.title} ${item.summary || ''}`.toLowerCase();
        if (!haystack.includes(keyword.trim().toLowerCase())) return false;
      }
      return true;
    });

    return (
      <div>
        <PageHero
          title={`${selectedCourseQ.data.classInfo.name} · 课程作业`}
          subtitle="先按课程组织教师作业，再进入每份作业的批阅详情页。"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={closeCourse}>
                <ArrowLeft size={14} />
                返回课程列表
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/classes/${selectedCourseId}/assignments`)}>
                进入课程作业页
              </Button>
            </div>
          }
        />
        <div className="px-8 pb-10">
          <div className="mx-auto max-w-[1500px] space-y-6">
            <Card className="border-muted/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">作业 {selectedCourseQ.data.assignments.length}</Badge>
                    <Badge variant="outline">
                      待批改 {selectedCourseQ.data.assignments.reduce((sum, item) => sum + (item.pendingSubmissions || 0), 0)}
                    </Badge>
                    <Badge variant="outline">
                      已评分 {selectedCourseQ.data.assignments.reduce((sum, item) => sum + (item.gradedSubmissions || 0), 0)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="搜索当前课程作业"
                      className="w-[220px]"
                    />
                    <select
                      className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'OPEN' | 'CLOSED')}
                    >
                      <option value="ALL">全部状态</option>
                      <option value="OPEN">开放中</option>
                      <option value="CLOSED">已关闭</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <AssignmentsTab
              detail={{ ...selectedCourseQ.data, assignments: filteredAssignments }}
              isTeacher
              onCreateAssignment={(payload) => createAssignmentM.mutateAsync(payload)}
              onUpdateAssignment={(assignmentId, payload) =>
                updateAssignmentM.mutateAsync({ assignmentId, payload })}
              onDeleteAssignment={(assignmentId) => deleteAssignmentM.mutateAsync(assignmentId)}
              onCloseAssignment={(assignmentId) => closeAssignmentM.mutateAsync(assignmentId)}
              onReopenAssignment={(assignmentId) => reopenAssignmentM.mutateAsync(assignmentId)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title="课程作业中心"
        subtitle="教师端先按课程进入，再查看该课程下的作业与批阅进度。"
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px]">
          {!courses.length ? (
            <PageEmpty
              title="你还没有课程"
              message="先创建课程，课程下才会承载作业与批阅流转。"
              icon={FolderOpen}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {courses.map((course) => (
                <button
                  key={course.classId}
                  className="rounded-3xl border border-muted/70 bg-card p-6 text-left transition hover:bg-muted/20 hover:shadow-sm"
                  onClick={() => openCourse(course.classId)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-semibold">{course.className}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{course.assignmentCount} 份作业</Badge>
                        <Badge variant="outline">{course.openAssignmentCount} 开放中</Badge>
                        <Badge variant="outline">{course.closedAssignmentCount} 已关闭</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
                      {course.pendingSubmissions} 待批改
                    </Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <div className="text-xs">正式提交</div>
                      <div className="mt-1 text-base font-medium text-foreground">{course.totalSubmissions}</div>
                    </div>
                    <div>
                      <div className="text-xs">已评分</div>
                      <div className="mt-1 text-base font-medium text-foreground">{course.gradedSubmissions}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs">最近截止时间</div>
                      <div className="mt-1 text-base font-medium text-foreground">
                        {course.latestDueDate || '未设置'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">进入该课程后再看具体作业与批阅</span>
                    <span className="inline-flex items-center text-primary">
                      进入课程作业
                      <ArrowRight size={14} className="ml-1" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
