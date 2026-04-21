import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, UserRound } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { todayIso, summaryRangeLabel } from '@/lib/project-reporting';
import { RawLogCard, SummaryBreakdownCard, SummaryHeatmapCard, SummaryKpiGrid, SummaryLeaderboardCard, SummaryTimelineCard, SummaryTrendCard, WeeklyDigestCard } from '@/components/summary/SummaryWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageError, PageLoading } from '@/screens/common/States';
import type { MemberSummaryRecord } from '@/lib/types';

const RANGE_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'WEEK', label: '本周' },
  { value: 'MONTH', label: '本月' },
  { value: 'CUSTOM', label: '自定义' },
] as const;

export function ProjectReportsPage() {
  const api = useApi();
  const { detail } = useProjectDetail();
  const { session } = useAuth();
  const [rangeType, setRangeType] = React.useState<'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM'>('WEEK');
  const [anchorDate, setAnchorDate] = React.useState(() => todayIso());
  const [startDate, setStartDate] = React.useState(() => todayIso(new Date(Date.now() - 6 * 24 * 3600 * 1000)));
  const [endDate, setEndDate] = React.useState(() => todayIso());
  const [memberId, setMemberId] = React.useState<'ALL' | string>('ALL');

  React.useEffect(() => setTitle([detail.project.name, '总结']), [detail.project.name]);

  const q = useQuery({
    queryKey: ['projectSummary', detail.project.id, rangeType, anchorDate, startDate, endDate, memberId],
    queryFn: () =>
      api.projectSummary(detail.project.id, {
        rangeType,
        anchorDate: rangeType === 'ALL' ? undefined : anchorDate,
        startDate: rangeType === 'CUSTOM' ? startDate : undefined,
        endDate: rangeType === 'CUSTOM' ? endDate : undefined,
        memberId: memberId === 'ALL' ? undefined : Number(memberId),
      }),
  });

  const mySummary = React.useMemo<MemberSummaryRecord | null>(() => {
    if (!q.data || !session?.profile.id) return null;
    return q.data.members.find((item) => item.userId === session.profile.id) || null;
  }, [q.data, session?.profile.id]);

  if (q.isLoading) return <PageLoading label="正在汇总项目总结..." />;
  if (q.isError || !q.data) return <PageError title="项目总结加载失败" onRetry={() => q.refetch()} />;

  const report = q.data;

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">总结工作台会按有效贡献规则自动汇总项目行为，并保留完整原始日志。</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">{report.rangeLabel}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1"><Filter size={12} /> {summaryRangeLabel(report.rangeType as any)}</Badge>
              <Badge variant="secondary">当前范围贡献 {report.contributionScore.toFixed(1)}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((item) => (
                <Button key={item.value} variant={rangeType === item.value ? 'default' : 'outline'} size="sm" onClick={() => setRangeType(item.value)}>
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {rangeType === 'CUSTOM' ? (
                <div className="flex items-center gap-2">
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-[150px]" />
                  <span className="text-sm text-muted-foreground">至</span>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-[150px]" />
                </div>
              ) : rangeType !== 'ALL' ? (
                <Input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="w-[170px]" />
              ) : null}
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择成员视图" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部成员</SelectItem>
                  {report.members.map((member) => (
                    <SelectItem key={member.userId} value={String(member.userId)}>{member.userName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <SummaryKpiGrid items={report.kpis} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">我的总结</CardTitle>
          </CardHeader>
          <CardContent>
            {!mySummary ? (
              <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">当前用户在这个时间范围内还没有贡献记录。</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border bg-background px-5 py-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound size={14} /> {mySummary.userName}
                  </div>
                  <div className="mt-3 text-4xl font-semibold tracking-tight">{mySummary.contributionScore.toFixed(1)}</div>
                  <div className="mt-2 text-sm text-muted-foreground">原始日志 {mySummary.rawCount} · 有效行为 {mySummary.effectiveCount} · 最近活跃 {mySummary.lastActiveAt || '暂无'}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {mySummary.breakdowns.slice(0, 4).map((item) => (
                    <div key={item.key} className="rounded-2xl border px-4 py-3">
                      <div className="font-medium">{item.label}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.eventCount} 次 · {item.contributionScore.toFixed(1)} 分</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <SummaryLeaderboardCard title="总体贡献榜" items={report.leaderboard} emptyText="当前范围内还没有成员贡献排行。" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SummaryHeatmapCard title="活跃点阵图" cells={report.heatmap} />
        <SummaryTrendCard title="贡献趋势" buckets={report.trendBuckets} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SummaryBreakdownCard title="行为构成" items={report.breakdowns} />
        <WeeklyDigestCard digest={report.weeklyDigest} />
      </div>

      <SummaryTimelineCard title="关键事件" events={report.timeline} />

      <RawLogCard events={report.rawEvents} />
    </div>
  );
}
