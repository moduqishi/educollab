import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function TeacherAssignmentsPage() {
  const api = useApi();
  React.useEffect(() => setTitle(['作业评审']), []);

  const q = useQuery({ queryKey: ['teacherAssignments'], queryFn: () => api.assignments() });
  if (q.isLoading) return <PageLoading label="正在加载作业…" />;
  if (q.isError) return <PageError title="作业加载失败" onRetry={() => q.refetch()} />;

  const items = q.data || [];

  return (
    <div>
      <PageHero title="作业评审" subtitle="查看提交材料、快速进入项目空间，按统一标准完成评审。" />
      <div className="px-8 pb-10">
        <div className="max-w-[1200px] mx-auto space-y-4">
          {!items.length ? (
            <PageEmpty title="暂无作业" message="当学生提交作业后，这里会展示待评审列表。" icon={ClipboardCheck} />
          ) : (
            items.map((a) => (
              <Card key={a.id} className="border-muted/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {a.projectName} · {a.createdAt}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{a.summary || '—'}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(a.submissionUrl, '_blank', 'noopener,noreferrer')}>
                      打开提交材料
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => (window.location.href = `/app/projects/${a.projectId}/overview`)}>
                      进入项目
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
