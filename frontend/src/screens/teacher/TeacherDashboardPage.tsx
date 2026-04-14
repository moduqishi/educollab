import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TeacherDashboardPage() {
  const api = useApi();
  React.useEffect(() => setTitle(['教师工作台']), []);

  const q = useQuery({ queryKey: ['teacherOverview'], queryFn: () => api.teacherOverview() });
  if (q.isLoading) return <PageLoading label="正在加载教师数据…" />;
  if (q.isError) return <PageError title="教师数据加载失败" onRetry={() => q.refetch()} />;

  const data = q.data!;

  return (
    <div>
      <PageHero title="教师工作台" subtitle="课程项目概览、学生活跃与待评审项一屏掌握。" right={<Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">教师</Badge>} />
      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Metric title="项目总数" value={data.totalProjects} />
            <Metric title="活跃学生" value={data.activeStudents} />
            <Metric title="待评审" value={data.pendingReviews} />
            <Metric title="平均进度" value={`${data.averageProgress}%`} />
          </div>

          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap size={16} /> 项目列表
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.projects.length ? (
                <PageEmpty title="暂无项目" message="当学生创建项目后，这里会展示课程项目概览。" icon={GraduationCap} />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.projects.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl border bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="mt-1 text-sm text-muted-foreground truncate">
                            {p.courseName} · {p.teamName}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                          {p.progress}%
                        </Badge>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.description || '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}

