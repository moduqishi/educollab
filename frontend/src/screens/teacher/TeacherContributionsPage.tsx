import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TeacherContributionsPage() {
  const api = useApi();
  React.useEffect(() => setTitle(['贡献分析']), []);

  const q = useQuery({ queryKey: ['teacherOverview'], queryFn: () => api.teacherOverview() });
  if (q.isLoading) return <PageLoading label="正在加载贡献数据..." />;
  if (q.isError) return <PageError title="贡献数据加载失败" onRetry={() => q.refetch()} />;

  const rows = q.data?.contributionRows || [];

  return (
    <div>
      <PageHero title="贡献分析" subtitle="从任务完成、提交次数与参与度看见团队投入情况。" />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px]">
          {!rows.length ? (
            <PageEmpty title="暂无贡献数据" message="当学生产生任务、提交或讨论后，这里会生成贡献分析。" icon={BarChart3} />
          ) : (
            <Card className="overflow-hidden border-muted/70">
              <CardHeader className="border-b bg-muted/20 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 size={16} />
                  贡献榜单
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-5 gap-0 border-b bg-white text-xs text-muted-foreground">
                  {['学生', '项目', '完成任务', 'Commits', '参与度'].map((title) => (
                    <div key={title} className="px-4 py-3 font-semibold">{title}</div>
                  ))}
                </div>
                {rows.map((row, idx) => (
                  <div key={`${row.studentName}-${row.projectName}-${idx}`} className="grid grid-cols-5 gap-0 border-b last:border-b-0 bg-white">
                    <div className="px-4 py-3 text-sm font-medium">{row.studentName}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">{row.projectName}</div>
                    <div className="px-4 py-3">
                      <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">{row.tasksDone}</Badge>
                    </div>
                    <div className="px-4 py-3"><Badge variant="outline">{row.commits}</Badge></div>
                    <div className="px-4 py-3 text-sm font-semibold">{row.engagement}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
