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
  if (q.isLoading) return <PageLoading label="正在加载贡献数据…" />;
  if (q.isError) return <PageError title="贡献数据加载失败" onRetry={() => q.refetch()} />;

  const rows = q.data?.contributionRows || [];

  return (
    <div>
      <PageHero title="贡献分析" subtitle="从任务完成、提交次数与参与度看见真实投入，方便指导与激励。" />
      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto">
          {!rows.length ? (
            <PageEmpty title="暂无贡献数据" message="当学生有任务/提交/讨论等行为后，这里会生成贡献分析。" icon={BarChart3} />
          ) : (
            <Card className="border-muted/70 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 size={16} /> 贡献榜单
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-5 gap-0 text-xs text-muted-foreground border-b bg-white">
                  {['学生', '项目', '完成任务', 'Commits', '参与度'].map((h) => (
                    <div key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </div>
                  ))}
                </div>
                {rows.map((r, idx) => (
                  <div key={`${r.studentName}-${r.projectName}-${idx}`} className="grid grid-cols-5 gap-0 border-b last:border-b-0 bg-white">
                    <div className="px-4 py-3 text-sm font-medium">{r.studentName}</div>
                    <div className="px-4 py-3 text-sm text-muted-foreground">{r.projectName}</div>
                    <div className="px-4 py-3">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                        {r.tasksDone}
                      </Badge>
                    </div>
                    <div className="px-4 py-3">
                      <Badge variant="outline">{r.commits}</Badge>
                    </div>
                    <div className="px-4 py-3 text-sm font-semibold">{r.engagement}</div>
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

