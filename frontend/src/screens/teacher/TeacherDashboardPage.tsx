import React from 'react';
import { GraduationCap, Users, FolderKanban, ClipboardCheck } from 'lucide-react';
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
  if (q.isLoading) return <PageLoading label="正在加载教师数据..." />;
  if (q.isError) return <PageError title="教师数据加载失败" onRetry={() => q.refetch()} />;

  const data = q.data!;

  return (
    <div>
      <PageHero
        title="教师工作台"
        subtitle="围绕课程、队伍和项目查看整体教学进展。"
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">教师</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <Metric title="项目总数" value={data.totalProjects} icon={FolderKanban} />
            <Metric title="活跃学生" value={data.activeStudents} icon={Users} />
            <Metric title="待处理评审" value={data.pendingReviews} icon={ClipboardCheck} />
            <Metric title="平均进度" value={`${data.averageProgress}%`} icon={GraduationCap} />
          </div>

          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban size={16} />
                项目总览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.projects.length ? (
                <PageEmpty title="暂无项目" message="学生在组队任务中创建项目后，这里会展示整体概览。" icon={FolderKanban} />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {data.projects.map((project) => (
                    <div key={project.id} className="rounded-2xl border bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{project.name}</div>
                          <div className="mt-1 truncate text-sm text-muted-foreground">
                    {project.courseName || '未关联课程'} · {project.teamName || '未关联团队'}
                          </div>
                        </div>
                        <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
                          {project.progress}%
                        </Badge>
                      </div>
                      <div className="mt-3 line-clamp-2 text-sm text-muted-foreground">{project.description || '暂无说明'}</div>
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

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon size={15} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}
