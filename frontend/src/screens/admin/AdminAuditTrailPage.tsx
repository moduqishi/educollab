import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useApi } from '@/app/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

export function AdminAuditTrailPage() {
  const api = useApi();
  const location = useLocation();
  const params = useParams();
  const scope = React.useMemo(() => {
    if (params.classId) return { scopeType: 'COURSE', scopeId: Number(params.classId), title: '课程审计' };
    if (params.teamId) return { scopeType: 'TEAM', scopeId: Number(params.teamId), title: '团队审计' };
    if (params.projectId) return { scopeType: 'PROJECT', scopeId: Number(params.projectId), title: '项目审计' };
    return { scopeType: undefined, scopeId: undefined, title: location.pathname.startsWith('/app/admin/system') ? '系统审计' : '审计日志' };
  }, [location.pathname, params.classId, params.projectId, params.teamId]);

  const q = useQuery({
    queryKey: ['adminAudit', scope.scopeType ?? 'all', scope.scopeId ?? 'all'],
    queryFn: () => api.adminAudit({ scopeType: scope.scopeType, scopeId: scope.scopeId, limit: 100 }),
  });

  if (q.isLoading) return <PageLoading label="正在加载审计日志..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} title="审计日志加载失败" />;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Shield size={16} />{scope.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!q.data?.length ? (
          <PageEmpty title="暂无审计记录" message="当前范围内还没有管理员操作记录。" icon={Shield} />
        ) : (
          <div className="space-y-3">
            {q.data.map((item) => (
              <div key={item.id} className="rounded-2xl border border-muted/70 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{item.actionType}</span>
                  <span className="text-muted-foreground">{item.scopeTitle || item.scopeType}</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{item.detail || '无附加说明'}</div>
                <div className="mt-3 text-xs text-muted-foreground">{item.adminName || '管理员'} · {item.createdAt}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
