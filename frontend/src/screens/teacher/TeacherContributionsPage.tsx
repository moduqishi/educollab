import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading } from '@/screens/common/States';
import { SummaryBreakdownCard, SummaryHeatmapCard, SummaryKpiGrid, SummaryLeaderboardCard, SummaryTimelineCard, SummaryTrendCard, WeeklyDigestCard } from '@/components/summary/SummaryWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { summaryRangeLabel, todayIso } from '@/lib/project-reporting';

const RANGE_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'WEEK', label: '本周' },
  { value: 'MONTH', label: '本月' },
  { value: 'CUSTOM', label: '自定义' },
] as const;

export function TeacherContributionsPage() {
  const api = useApi();
  const [courseId, setCourseId] = React.useState<number | undefined>();
  const [rangeType, setRangeType] = React.useState<'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM'>('WEEK');
  const [anchorDate, setAnchorDate] = React.useState(() => todayIso());
  const [startDate, setStartDate] = React.useState(() => todayIso(new Date(Date.now() - 6 * 24 * 3600 * 1000)));
  const [endDate, setEndDate] = React.useState(() => todayIso());

  React.useEffect(() => setTitle(['总结总览']), []);

  const q = useQuery({
    queryKey: ['teacherSummary', courseId ?? 'all', rangeType, anchorDate, startDate, endDate],
    queryFn: () => api.teacherSummary({
      courseId,
      rangeType,
      anchorDate: rangeType === 'ALL' ? undefined : anchorDate,
      startDate: rangeType === 'CUSTOM' ? startDate : undefined,
      endDate: rangeType === 'CUSTOM' ? endDate : undefined,
    }),
  });

  React.useEffect(() => {
    if (!q.data?.courses?.length || courseId == null) return;
    if (!q.data.courses.some((item) => item.id === courseId)) {
      setCourseId(undefined);
    }
  }, [q.data?.courses, courseId]);

  if (q.isLoading) return <PageLoading label="正在加载总结总览..." />;
  if (q.isError || !q.data) return <PageError title="总结总览加载失败" onRetry={() => q.refetch()} />;

  const report = q.data;

  return (
    <div>
      <PageHero title="总结总览" subtitle="按课程和时间范围汇总项目行为、贡献值与关键趋势，支持教师快速审阅整体投入。" />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <Card className="border-muted/70">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">当前范围</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">{report.rangeLabel}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1"><Filter size={12} /> {summaryRangeLabel(report.rangeType as any)}</Badge>
                  <Badge variant="secondary">总贡献 {report.contributionScore.toFixed(1)}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant={courseId == null ? 'default' : 'outline'} size="sm" onClick={() => setCourseId(undefined)}>全部课程</Button>
                {report.courses.map((course) => (
                  <Button key={course.id} variant={courseId === course.id ? 'default' : 'outline'} size="sm" onClick={() => setCourseId(course.id)}>
                    {course.name}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
                </div>
              </div>
            </CardContent>
          </Card>

          <SummaryKpiGrid items={report.kpis} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SummaryHeatmapCard title="课程活跃点阵图" cells={report.heatmap} />
            <SummaryTrendCard title="贡献趋势" buckets={report.trendBuckets} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SummaryBreakdownCard title="行为构成" items={report.breakdowns} />
            <WeeklyDigestCard digest={report.weeklyDigest} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SummaryLeaderboardCard title="项目榜" items={report.projectLeaderboard} emptyText="当前范围内还没有项目总结数据。" />
            <SummaryLeaderboardCard title="成员榜" items={report.userLeaderboard} emptyText="当前范围内还没有成员总结数据。" />
          </div>

          <SummaryTimelineCard title="关键事件" events={report.timeline} />
        </div>
      </div>
    </div>
  );
}
