import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import { notificationSourceTypeLabel, notificationTypeLabel } from './notificationMeta';

export function NotificationDetailPage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notificationId } = useParams();
  const resolvedId = Number(notificationId);
  const autoMarkedRef = React.useRef(false);

  const detailQ = useQuery({
    queryKey: ['notification', resolvedId],
    queryFn: () => api.notificationDetail(resolvedId),
    enabled: !!resolvedId,
  });

  React.useEffect(() => {
    setTitle([detailQ.data?.title || '通知详情']);
  }, [detailQ.data?.title]);

  const markReadM = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: async (_, id) => {
      qc.setQueryData(['notification', id], (current: Awaited<ReturnType<typeof api.notificationDetail>> | undefined) =>
        current ? { ...current, read: true } : current,
      );
      qc.setQueryData(['notifications'], (current: Awaited<ReturnType<typeof api.notifications>> | undefined) =>
        current?.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notification', id] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });

  React.useEffect(() => {
    if (!detailQ.data || detailQ.data.read || markReadM.isPending || autoMarkedRef.current) return;
    autoMarkedRef.current = true;
    markReadM.mutate(resolvedId);
  }, [detailQ.data, markReadM, resolvedId]);

  if (!resolvedId) {
    return (
      <PageError
        title="通知不存在"
        message="通知编号无效，请返回通知中心重新选择。"
        onRetry={() => navigate('/app/notifications')}
      />
    );
  }

  if (detailQ.isLoading) return <PageLoading label="正在加载通知详情..." />;
  if (detailQ.isError || !detailQ.data) {
    return (
      <PageError
        title="通知详情加载失败"
        message="这条通知可能不存在，或你当前没有访问权限。"
        onRetry={() => detailQ.refetch()}
      />
    );
  }

  const notification = detailQ.data;
  const hasSource = Boolean(notification.sourcePath);

  return (
    <div>
      <PageHero
        title={notification.title}
        subtitle="查看完整通知内容，并在需要时跳回对应的业务页面继续处理。"
        actions={
          <Button variant="outline" className="gap-2" onClick={() => navigate('/app/notifications')}>
            <ArrowLeft size={14} />
            返回通知中心
          </Button>
        }
        right={
          <Badge
            variant="outline"
            className={notification.read ? 'opacity-70' : 'border-primary/15 bg-primary/10 text-primary'}
          >
            {notification.read ? '已读' : '未读'}
          </Badge>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1200px] space-y-6">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{notificationTypeLabel(notification.type)}</Badge>
                <span>{notification.createdAt}</span>
                {notification.read ? (
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} />
                    已读
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {notification.content}
            </CardContent>
          </Card>

          {hasSource ? (
            <Card className="border-muted/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">关联内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{notification.sourceLabel || '关联内容'}</Badge>
                  <span>{notificationSourceTypeLabel(notification.sourceType)}</span>
                </div>
                <Button className="gap-2" onClick={() => navigate(notification.sourcePath!)}>
                  <ExternalLink size={14} />
                  查看关联内容
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
