import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BellRing, Database, HardDrive, RefreshCcw, Shield, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

export function AdminSystemPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [announcement, setAnnouncement] = React.useState({ title: '', content: '' });
  const [lastMaintenance, setLastMaintenance] = React.useState<string>('');

  React.useEffect(() => {
    setTitle(['系统管理', '系统控制']);
  }, []);

  const overviewQ = useQuery({ queryKey: ['adminSystemOverview'], queryFn: () => api.adminSystemOverview() });
  const healthQ = useQuery({ queryKey: ['adminSystemHealth'], queryFn: () => api.adminSystemHealth() });

  const refreshAll = React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['adminSystemOverview'] }),
      qc.invalidateQueries({ queryKey: ['adminSystemHealth'] }),
      qc.invalidateQueries({ queryKey: ['adminStorageTree'] }),
      qc.invalidateQueries({ queryKey: ['adminStorageFiles'] }),
      qc.invalidateQueries({ queryKey: ['adminStorageRepos'] }),
      qc.invalidateQueries({ queryKey: ['adminStorageLogs'] }),
      qc.invalidateQueries({ queryKey: ['projects'] }),
      qc.invalidateQueries({ queryKey: ['adminProjects'] }),
    ]);
  }, [qc]);

  const announceM = useMutation({
    mutationFn: () => api.adminSendAnnouncement({ title: announcement.title, content: announcement.content, sourcePath: '/app/notifications', sourceLabel: '系统公告' }),
    onSuccess: async (result) => {
      setAnnouncement({ title: '', content: '' });
      setLastMaintenance(result.message);
      await refreshAll();
    },
  });
  const recomputeM = useMutation({
    mutationFn: () => api.adminRecomputeProgress(),
    onSuccess: async (result) => {
      setLastMaintenance(result.message || '已触发项目进度重算');
      await refreshAll();
    },
  });
  const scanM = useMutation({
    mutationFn: () => api.adminScanStorage(),
    onSuccess: async (result) => {
      setLastMaintenance(`${result.action}：处理 ${result.affectedCount} 项${result.warnings.length ? `，警告 ${result.warnings.length} 条` : ''}`);
      await refreshAll();
    },
  });
  const migrateM = useMutation({
    mutationFn: () => api.adminMigrateStorage(),
    onSuccess: async (result) => {
      setLastMaintenance(result.message || '已触发旧存储迁移');
      await refreshAll();
    },
  });

  if (overviewQ.isLoading || healthQ.isLoading) return <PageLoading label="正在加载系统控制台..." />;
  if (overviewQ.isError || healthQ.isError || !overviewQ.data) {
    return <PageError onRetry={() => { void overviewQ.refetch(); void healthQ.refetch(); }} title="系统控制台加载失败" />;
  }

  const overview = overviewQ.data;
  const healthRecords = healthQ.data || [];
  const healthyCount = healthRecords.filter((item) => item.status === 'UP').length;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">系统控制</h1>
            <p className="mt-1 text-sm text-muted-foreground">查看真实运行状态、执行维护动作、发布系统公告，并回看最近导入与管理员审计。</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={healthyCount === healthRecords.length ? 'default' : 'secondary'}>服务 {healthyCount}/{healthRecords.length} 正常</Badge>
            <Button variant="outline" className="gap-2" onClick={() => refreshAll()}>
              <RefreshCcw size={14} />刷新状态
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {overview.metrics.map((item) => (
            <Card key={item.key} className="border-muted/70">
              <CardContent className="p-5">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</div>
                <div className="mt-2 text-xs text-muted-foreground">{item.hint || '实时统计'}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Activity size={16} />真实服务状态</CardTitle></CardHeader>
            <CardContent>
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
                    {healthRecords.map((item) => (
                      <tr key={item.serviceKey} className="border-b last:border-b-0">
                        <td className="px-3 py-3 font-medium">{item.label}</td>
                        <td className="px-3 py-3"><Badge variant={item.status === 'UP' ? 'default' : 'secondary'}>{item.status}</Badge></td>
                        <td className="px-3 py-3 text-muted-foreground">{item.detail}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.checkedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Wrench size={16} />维护动作中心</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ActionButton label="重算项目进度" hint="按最新里程碑权重与任务树重建进度" icon={RefreshCcw} busy={recomputeM.isPending} onClick={() => recomputeM.mutate()} />
                <ActionButton label="扫描存储归属" hint="检测孤儿文件、孤儿仓库与缺失归属" icon={Database} busy={scanM.isPending} onClick={() => scanM.mutate()} />
                <ActionButton label="迁移旧平铺存储" hint="把旧 uploads / repos 迁到课程-团队-项目层级" icon={HardDrive} busy={migrateM.isPending} onClick={() => migrateM.mutate()} />
                <ActionButton label="打开文件与存储" hint="进入层级树和物理路径管理页" icon={Shield} onClick={() => nav('/app/admin/storage')} />
              </div>
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {lastMaintenance || '维护动作执行结果会显示在这里，所有写操作也会进入管理员审计日志。'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BellRing size={16} />发布系统公告</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label>标题</Label><Input value={announcement.title} onChange={(e) => setAnnouncement((current) => ({ ...current, title: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>内容</Label><textarea className="min-h-[140px] w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none" value={announcement.content} onChange={(e) => setAnnouncement((current) => ({ ...current, content: e.target.value }))} /></div>
              <Button onClick={() => announceM.mutate()} disabled={announceM.isPending || !announcement.title.trim() || !announcement.content.trim()}>
                {announceM.isPending ? '发送中...' : '发送公告'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">系统维护说明</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border px-4 py-3">
                <div className="font-medium text-foreground">管理员后台职责</div>
                <div className="mt-1">这里优先处理课程、团队、项目、用户、存储和系统健康；任务/讨论/作业仅作为异常治理入口。</div>
              </div>
              <div className="rounded-2xl border px-4 py-3">
                <div className="font-medium text-foreground">真实状态来源</div>
                <div className="mt-1">Backend / collab-server / MySQL / uploads / repos 都以后端实时检测为准，不再使用前端写死状态。</div>
              </div>
              <div className="rounded-2xl border px-4 py-3">
                <div className="font-medium text-foreground">存储层级治理</div>
                <div className="mt-1">新写入已按课程 → 团队 → 项目分层；旧平铺数据可在这里扫描并迁移。</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">最近导入与批量维护</CardTitle></CardHeader>
            <CardContent>
              {!overview.recentImports.length ? (
                <PageEmpty title="暂无导入记录" message="后续课程导入、批量操作会在这里沉淀结果。" icon={Database} />
              ) : (
                <div className="space-y-3">
                  {overview.recentImports.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{item.courseName || '未关联课程'} · {item.fileName || '导入文件'}</div>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>
                      <div className="mt-2 text-muted-foreground">导入 {item.importedRows || 0} · 跳过 {item.skippedRows || 0} · 创建账号 {item.createdUsersCount || 0}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.createdByName || '管理员'} · {item.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Shield size={16} />最近管理员审计</CardTitle></CardHeader>
            <CardContent>
              {!overview.recentAudits.length ? (
                <PageEmpty title="暂无审计记录" message="管理员写操作会在这里展示。" icon={Shield} />
              ) : (
                <div className="space-y-3">
                  {overview.recentAudits.map((item) => (
                    <div key={item.id} className="rounded-2xl border p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{item.actionType}</div>
                        <Button size="sm" variant="ghost" onClick={() => nav('/app/admin/system/audit')}>全部审计</Button>
                      </div>
                      <div className="mt-1 text-muted-foreground">{item.detail || '无附加说明'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{item.adminName || '管理员'} · {item.createdAt}</div>
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

function ActionButton({
  label,
  hint,
  icon: Icon,
  onClick,
  busy,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60">
      <div className="flex items-center gap-2 font-medium"><Icon size={16} />{busy ? '执行中...' : label}</div>
      <div className="mt-2 text-sm text-muted-foreground">{hint}</div>
    </button>
  );
}
