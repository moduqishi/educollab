import type {
  ContributionBreakdownRecord,
  ProjectActivityEventRecord,
  SummaryHeatmapCell,
  SummaryTrendBucket,
} from './types';

export type SummaryRangeType = 'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM';

export function todayIso(reference = new Date()) {
  return toIsoDate(reference);
}

export function monthAnchorIso(reference = new Date()) {
  const d = new Date(reference);
  d.setDate(1);
  return toIsoDate(d);
}

export function activityEventLabel(eventType: string) {
  switch (eventType) {
    case 'PROJECT_CREATED':
      return '创建项目';
    case 'PROJECT_VISIT':
      return '访问项目';
    case 'MILESTONE_CREATED':
      return '创建里程碑';
    case 'MILESTONE_COMPLETED':
      return '完成里程碑';
    case 'TASK_CREATED':
      return '创建任务';
    case 'TASK_STATUS_CHANGED':
      return '推进任务';
    case 'TASK_COMPLETED':
      return '完成任务';
    case 'DISCUSSION_POST_CREATED':
      return '发起讨论';
    case 'DISCUSSION_REPLY_CREATED':
      return '讨论回复';
    case 'DOCUMENT_CREATED':
      return '创建文档';
    case 'DOCUMENT_VERSION_SAVED':
      return '保存版本';
    case 'FILE_UPLOADED':
      return '上传文件';
    case 'ASSIGNMENT_SUBMITTED':
      return '提交作业';
    case 'GIT_COMMIT_PUSHED':
      return '提交代码';
    default:
      return eventType;
  }
}

export function activityEventSummary(event: ProjectActivityEventRecord) {
  const actor = event.userName || '系统';
  const title = event.targetTitle || '未命名对象';
  switch (event.eventType) {
    case 'PROJECT_VISIT':
      return `${actor} 打开了 ${title} 页面`;
    case 'GIT_COMMIT_PUSHED':
      return `${actor} 推送了提交：${title}`;
    case 'ASSIGNMENT_SUBMITTED':
      return `${actor} 提交了作业：${title}`;
    default:
      return `${actor} ${activityEventLabel(event.eventType)}：${title}`;
  }
}

export function breakdownMetricLabel(item: ContributionBreakdownRecord) {
  switch (item.key) {
    case 'GIT_COMMIT_PUSHED':
      return `${item.metricValue} 行改动 / ${item.eventCount} 次提交`;
    case 'PROJECT_VISIT':
      return `${item.eventCount} 次有效访问`;
    default:
      return `${item.eventCount} 次有效行为`;
  }
}

export function summaryRangeLabel(rangeType: SummaryRangeType) {
  switch (rangeType) {
    case 'ALL':
      return '全部';
    case 'WEEK':
      return '本周';
    case 'MONTH':
      return '本月';
    case 'CUSTOM':
      return '自定义';
    default:
      return rangeType;
  }
}

export function heatmapLevelClass(level: number) {
  switch (level) {
    case 4:
      return 'bg-emerald-600';
    case 3:
      return 'bg-emerald-500';
    case 2:
      return 'bg-emerald-400';
    case 1:
      return 'bg-emerald-200';
    default:
      return 'bg-muted';
  }
}

export function groupHeatmapWeeks(cells: SummaryHeatmapCell[]) {
  const ordered = [...cells].sort((a, b) => a.date.localeCompare(b.date));
  const weeks: SummaryHeatmapCell[][] = [];
  for (const cell of ordered) {
    const date = new Date(`${cell.date}T00:00:00`);
    const day = date.getDay();
    const normalized = day === 0 ? 7 : day;
    if (!weeks.length || normalized === 1) {
      weeks.push([]);
    }
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}

export function maxTrendScore(buckets: SummaryTrendBucket[]) {
  return buckets.reduce((max, item) => Math.max(max, item.contributionScore), 0);
}

export function formatScore(value: number) {
  return value.toFixed(1);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
