import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTeamDetail } from './TeamDetailLayout';
import { PageError, PageLoading } from '@/screens/common/States';
import { SummaryLeaderboardCard } from '@/components/summary/SummaryWidgets';

export function TeamReportsTab() {
  const api = useApi();
  const nav = useNavigate();
  const { detail } = useTeamDetail();
  const projectId = detail.project?.projectId;

  const q = useQuery({
    queryKey: ['teamProjectSummary', projectId],
    queryFn: () => api.projectSummary(projectId!, { rangeType: 'WEEK' }),
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">总结</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>当前团队还没有关联项目，自动总结会在团队项目建立后开始生成。</div>
        </CardContent>
      </Card>
    );
  }

  if (q.isLoading) return <PageLoading label="正在加载团队项目总结..." />;
  if (q.isError || !q.data) return <PageError title="团队总结加载失败" onRetry={() => q.refetch()} />;

  const report = q.data;

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">项目总结摘要</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">团队页只保留项目总结摘要，完整图表与日志统一放到项目总结页查看。</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{report.rangeLabel}</Badge>
              <Button size="sm" className="gap-1" onClick={() => nav(`/app/projects/${projectId}/reports`)}>
                进入完整总结 <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Summary label="贡献值" value={report.contributionScore.toFixed(1)} />
          <Summary label="有效行为" value={String(report.effectiveCount)} />
          <Summary label="原始日志" value={String(report.rawCount)} />
          <Summary label="活跃成员" value={String(report.activeUserCount)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SummaryLeaderboardCard title="本周团队贡献榜" items={report.leaderboard.slice(0, 6)} emptyText="本周还没有成员总结数据。" />
        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 size={16} /> 本周摘要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.weeklyDigest.breakdowns.slice(0, 5).map((item) => (
              <div key={item.key} className="rounded-2xl border px-4 py-3">
                <div className="font-medium">{item.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.eventCount} 次有效行为 · {item.contributionScore.toFixed(1)} 分</div>
              </div>
            ))}
            {!report.weeklyDigest.breakdowns.length ? (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">本周还没有可展示的有效行为。</div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border px-4 py-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
