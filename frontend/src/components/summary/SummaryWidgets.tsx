import React from 'react';
import { BarChart3, Clock3, Flame, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  activityEventLabel,
  activityEventSummary,
  breakdownMetricLabel,
  formatScore,
  groupHeatmapWeeks,
  heatmapLevelClass,
  maxTrendScore,
} from '@/lib/project-reporting';
import type {
  ContributionBreakdownRecord,
  ProjectActivityEventRecord,
  SummaryHeatmapCell,
  SummaryKpiRecord,
  SummaryLeaderboardEntry,
  SummaryTrendBucket,
  SummaryWeeklyDigestRecord,
} from '@/lib/types';

export function SummaryKpiGrid({ items }: { items: SummaryKpiRecord[] }) {
  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
    score: Flame,
    effective: BarChart3,
    raw: Clock3,
    active: Users,
    members: Users,
    projects: BarChart3,
  };
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = iconMap[item.key] || BarChart3;
        return (
          <Card key={item.key} className="border-muted/70">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">{item.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function SummaryHeatmapCard({ title, cells }: { title: string; cells: SummaryHeatmapCell[] }) {
  const weeks = groupHeatmapWeeks(cells);
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cells.length ? (
          <Empty text="当前范围内还没有热力图数据。" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="inline-flex min-w-full gap-1 rounded-2xl border bg-background p-3">
                {weeks.map((week, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, row) => {
                      const cell = week[row];
                      return (
                        <div
                          key={row}
                          title={cell ? `${cell.date} · ${formatScore(cell.contributionScore)} 分 · ${cell.effectiveCount} 次有效行为` : ''}
                          className={cn('h-3.5 w-3.5 rounded-[4px] border border-background/60', cell ? heatmapLevelClass(cell.level) : 'bg-transparent')}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>越深代表当天贡献越高</span>
              <div className="flex items-center gap-1">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={cn('h-3 w-3 rounded-[3px]', heatmapLevelClass(level))} />
                ))}
                <span>多</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryTrendCard({ title, buckets }: { title: string; buckets: SummaryTrendBucket[] }) {
  const maxScore = maxTrendScore(buckets);
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!buckets.length ? (
          <Empty text="当前范围内还没有趋势数据。" />
        ) : (
          <div className="space-y-3">
            <div className="flex h-48 items-end gap-2 rounded-2xl border bg-background px-3 py-4">
              {buckets.map((bucket) => {
                const height = maxScore <= 0 ? 4 : Math.max(4, (bucket.contributionScore / maxScore) * 160);
                return (
                  <div key={bucket.bucketKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="text-[10px] text-muted-foreground">{formatScore(bucket.contributionScore)}</div>
                    <div className="w-full rounded-t-xl bg-primary/85 transition-all" style={{ height }} />
                    <div className="line-clamp-1 text-center text-[10px] text-muted-foreground">{bucket.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {buckets.slice(-3).map((bucket) => (
                <div key={bucket.bucketKey} className="rounded-2xl border px-3 py-2 text-sm">
                  <div className="font-medium">{bucket.label}</div>
                  <div className="mt-1 text-muted-foreground">贡献 {formatScore(bucket.contributionScore)} · 有效 {bucket.effectiveCount}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryBreakdownCard({ title, items }: { title: string; items: ContributionBreakdownRecord[] }) {
  const maxScore = items.reduce((max, item) => Math.max(max, item.contributionScore), 0);
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <Empty text="当前范围内还没有可计分的行为。" />
        ) : (
          items.map((item) => (
            <div key={item.key} className="rounded-2xl border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{breakdownMetricLabel(item)}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${maxScore <= 0 ? 0 : (item.contributionScore / maxScore) * 100}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold">{formatScore(item.contributionScore)}</div>
                  <div className="text-xs text-muted-foreground">贡献值</div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryLeaderboardCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: SummaryLeaderboardEntry[];
  emptyText: string;
}) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <Empty text={emptyText} />
        ) : (
          items.map((item, index) => (
            <div key={`${item.subjectId}-${index}`} className={cn('rounded-2xl border px-4 py-3', item.highlighted && 'border-primary/40 bg-primary/5')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="font-medium">{item.title}</span>
                    {item.highlighted ? <Badge>当前查看</Badge> : null}
                  </div>
                  {item.subtitle ? <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div> : null}
                  <div className="mt-2 text-xs text-muted-foreground">原始 {item.rawCount} · 有效 {item.effectiveCount}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-semibold">{formatScore(item.contributionScore)}</div>
                  <div className="text-xs text-muted-foreground">贡献值</div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function WeeklyDigestCard({ digest }: { digest: SummaryWeeklyDigestRecord }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">本周摘要</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-background px-4 py-4">
          <div className="text-sm text-muted-foreground">{digest.weekStart} ~ {digest.weekEnd}</div>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{formatScore(digest.contributionScore)}</div>
              <div className="text-xs text-muted-foreground">本周贡献值</div>
            </div>
            <div className="text-sm text-muted-foreground">活跃成员 {digest.activeUserCount} · 原始 {digest.rawCount} · 有效 {digest.effectiveCount}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {digest.breakdowns.slice(0, 4).map((item) => (
            <div key={item.key} className="rounded-2xl border px-3 py-3 text-sm">
              <div className="font-medium">{item.label}</div>
              <div className="mt-1 text-muted-foreground">{breakdownMetricLabel(item)}</div>
              <div className="mt-2 font-semibold">{formatScore(item.contributionScore)} 分</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryTimelineCard({ title, events, raw = false }: { title: string; events: ProjectActivityEventRecord[]; raw?: boolean }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!events.length ? (
          <Empty text={raw ? '当前范围内还没有原始日志。' : '当前范围内还没有关键事件。'} />
        ) : (
          events.map((event) => (
            <div key={event.id} className="rounded-2xl border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{activityEventLabel(event.eventType)}</Badge>
                  <span className="text-sm font-medium">{event.userName || '系统'}</span>
                  {event.contributionScore > 0 ? <Badge variant="secondary">+{formatScore(event.contributionScore)}</Badge> : null}
                </div>
                <span className="text-xs text-muted-foreground">{event.occurredAt}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{activityEventSummary(event)}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function RawLogCard({ events }: { events: ProjectActivityEventRecord[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const list = expanded ? events : events.slice(0, 12);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">原始日志</div>
        {events.length > 12 ? (
          <Button variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? '收起' : `展开全部 (${events.length})`}
          </Button>
        ) : null}
      </div>
      <SummaryTimelineCard title="原始日志" events={list} raw />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">{text}</div>;
}
