import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Clock3, Cpu, HardDrive, LayoutDashboard, MemoryStick, RefreshCcw, ServerCrash, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPageIntro, AdminPanel, AdminStatGrid } from './admin-layout';
import type { AdminHealthRecord, AdminIssueRecord, AdminSystemResourceRecord } from '@/lib/types';

const quickActions = [
  { label: '系统控制', href: '/app/admin/system', hint: '进入维护动作、公告、迁移和详细审计' },
  { label: '课程管理', href: '/app/admin/courses', hint: '处理课程、教师和结构异常' },
  { label: '团队管理', href: '/app/admin/teams', hint: '处理队长、组序和成员迁移' },
  { label: '项目管理', href: '/app/admin/projects', hint: '处理项目归属、状态、文件和仓库' },
  { label: '导入与维护', href: '/app/admin/imports', hint: '处理批量导入与结果报告' },
  { label: '文件与存储', href: '/app/admin/storage', hint: '查看 uploads、repos、logs 与层级存储' },
];

export function AdminDashboardPage() {
  const api = useApi();
  const navigate = useNavigate();

  React.useEffect(() => {
    setTitle(['系统管理', '系统概览']);
  }, []);

  const q = useQuery({ queryKey: ['adminOverview'], queryFn: () => api.adminOverview() });

  if (q.isLoading) return <PageLoading label="正在加载系统概览..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} title="系统概览加载失败" />;

  const detail = q.data;
  const metrics = detail.metrics || [];
  const resourceMetrics = detail.resourceMetrics || [];
  const healthChecks = detail.healthChecks || [];
  const pendingItems = detail.pendingItems || [];
  const recentActivities = detail.recentActivities || [];
  const overallStatus = summarizeOverallStatus(healthChecks, resourceMetrics, pendingItems);
  const resourceMap = new Map(resourceMetrics.map((item) => [item.key, item]));
  const primaryResources = ['cpu', 'memory', 'disk'].map((key) => resourceMap.get(key)).filter(Boolean) as AdminSystemResourceRecord[];
  const storageResources = ['data', 'logs'].map((key) => resourceMap.get(key)).filter(Boolean) as AdminSystemResourceRecord[];

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <AdminPageIntro
          eyebrow={<span className="inline-flex items-center gap-2"><LayoutDashboard size={16} />系统管理员监控台</span>}
          title="系统概览"
          description="优先查看系统规模、CPU / 内存 / 磁盘资源、服务运行状态和系统告警，再进入具体维护页面处理问题。"
          badges={
            <>
              <Badge variant={overallStatus.variant}>{overallStatus.label}</Badge>
              <Badge variant="outline" className="gap-1 border-primary/15 bg-primary/5 text-primary"><Clock3 size={12} />最近刷新 {detail.checkedAt || '刚刚'}</Badge>
            </>
          }
          actions={<Button variant="outline" className="gap-2" onClick={() => q.refetch()}><RefreshCcw size={14} />刷新概览</Button>}
        />

        <AdminStatGrid
          columns="xl:grid-cols-6"
          items={metrics.map((metric) => ({ label: metric.label, value: metric.value, hint: metric.hint || '实时统计' }))}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel title="系统资源概览" description="首页直接展示 CPU、内存、磁盘与主要目录占用。">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {primaryResources.map((item) => <ResourceCard key={item.key} item={item} />)}
            </div>
            {storageResources.length ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {storageResources.map((item) => <StorageCard key={item.key} item={item} />)}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel title="快捷维护动作" description="需要进一步处理时，从这里进入维护页面。">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((item) => (
                <Button key={item.href} variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4" onClick={() => navigate(item.href)}>
                  <span className="min-w-0 text-left">
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <ArrowRight size={16} />
                </Button>
              ))}
            </div>
          </AdminPanel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <AdminPanel title="服务状态" description="服务、存储目录和协同组件的实时状态。">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">服务</th>
                    <th className="px-3 py-2 font-medium">状态</th>
                    <th className="px-3 py-2 font-medium">详情</th>
                    <th className="px-3 py-2 font-medium">检查时间</th>
                  </tr>
                </thead>
                <tbody>
                  {healthChecks.map((item) => (
                    <tr key={item.key} className="border-b last:border-b-0">
                      <td className="px-3 py-3 font-medium">{item.label}</td>
                      <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-3 py-3 text-muted-foreground">{item.detail || '—'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.checkedAt || detail.checkedAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminPanel>

          <AdminPanel title="系统告警 / 风险" description="资源高占用、服务异常、结构异常都统一汇总到这里。">
            {!pendingItems.length ? (
              <PageEmpty title="暂无系统告警" message="当前资源、服务和结构状态均正常。" icon={Shield} />
            ) : (
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <button
                    key={`${item.key}-${item.title}`}
                    type="button"
                    onClick={() => item.href && navigate(item.href)}
                    className="flex w-full items-start justify-between gap-4 rounded-2xl border border-muted/70 p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <Badge variant={item.level === 'warn' ? 'destructive' : item.level === 'info' ? 'outline' : 'secondary'}>{issueLabel(item)}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">{item.detail}</div>
                    </div>
                    {item.href ? <ArrowRight size={16} className="mt-1 shrink-0 text-muted-foreground" /> : null}
                  </button>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
          <AdminPanel title="最近系统活动" description="关注最近创建、导入、管理员维护等系统级事件。">
            {!recentActivities.length ? (
              <PageEmpty title="暂无系统活动" message="这里会显示最近的新用户、新课程和管理员动作。" icon={LayoutDashboard} />
            ) : (
              <div className="space-y-3">
                {recentActivities.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-2xl border border-muted/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{item.detail}</div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{item.createdAt}</div>
                    </div>
                    {item.href ? <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => navigate(item.href!)}>打开</Button> : null}
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="系统摘要" description="快速判断当前系统是否需要介入。">
            <div className="space-y-3 text-sm text-muted-foreground">
              <SummaryLine icon={Cpu} title="CPU" text={resourceMap.get('cpu')?.hint || resourceMap.get('cpu')?.value || '暂无数据'} />
              <SummaryLine icon={MemoryStick} title="内存" text={resourceMap.get('memory')?.hint || resourceMap.get('memory')?.value || '暂无数据'} />
              <SummaryLine icon={HardDrive} title="磁盘" text={resourceMap.get('disk')?.hint || resourceMap.get('disk')?.value || '暂无数据'} />
              <SummaryLine icon={ServerCrash} title="服务" text={`正常 ${healthChecks.filter((item) => item.status === 'UP').length} / ${healthChecks.length}`} />
              <SummaryLine icon={AlertTriangle} title="风险" text={`${pendingItems.length} 项系统告警或结构异常待处理`} />
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ item }: { item: AdminSystemResourceRecord }) {
  return (
    <div className="rounded-2xl border border-muted/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</div>
        </div>
        <StatusBadge status={item.status} compact />
      </div>
      {item.usagePercent != null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>使用率</span>
            <span>{item.usagePercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className={`h-2 rounded-full ${item.status === 'WARN' || item.status === 'DOWN' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(item.usagePercent, 100)}%` }} />
          </div>
        </div>
      ) : null}
      {item.hint ? <div className="mt-3 text-xs text-muted-foreground">{item.hint}</div> : null}
    </div>
  );
}

function StorageCard({ item }: { item: AdminSystemResourceRecord }) {
  return (
    <div className="rounded-2xl border border-muted/70 bg-muted/20 p-4">
      <div className="text-xs text-muted-foreground">{item.label}</div>
      <div className="mt-2 text-lg font-semibold">{item.value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
    </div>
  );
}

function SummaryLine({ icon: Icon, title, text }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-muted/70 px-4 py-3">
      <div className="flex items-center gap-2 font-medium text-foreground"><Icon size={15} className="text-muted-foreground" />{title}</div>
      <div className="mt-1">{text}</div>
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const variant = status === 'UP' ? 'default' : status === 'WARN' ? 'secondary' : 'destructive';
  return <Badge variant={variant} className={compact ? 'shrink-0' : undefined}>{status}</Badge>;
}

function summarizeOverallStatus(healthChecks: AdminHealthRecord[], resources: AdminSystemResourceRecord[], issues: AdminIssueRecord[]) {
  const hasDown = healthChecks.some((item) => item.status === 'DOWN');
  const hasWarn = resources.some((item) => item.status === 'WARN' || item.status === 'DOWN') || healthChecks.some((item) => item.status === 'WARN') || issues.some((item) => item.level === 'warn');
  if (hasDown) return { label: '存在服务异常', variant: 'destructive' as const };
  if (hasWarn) return { label: '存在系统风险', variant: 'secondary' as const };
  return { label: '系统运行正常', variant: 'default' as const };
}

function issueLabel(item: AdminIssueRecord) {
  if (item.level === 'warn') return '告警';
  if (item.level === 'info') return '提示';
  return '正常';
}
