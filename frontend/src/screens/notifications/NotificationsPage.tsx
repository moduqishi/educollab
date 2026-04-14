import React from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const api = useApi();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['通知']), []);

  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications() });

  const readM = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const markAll = async () => {
    const items = q.data || [];
    const unread = items.filter((x) => !x.read);
    if (!unread.length) return;
    await Promise.all(unread.map((n) => readM.mutateAsync(n.id)));
  };

  if (q.isLoading) return <PageLoading label="正在加载通知…" />;
  if (q.isError) return <PageError title="通知加载失败" onRetry={() => q.refetch()} />;

  const items = q.data || [];
  const unreadCount = items.filter((x) => !x.read).length;

  return (
    <div>
      <PageHero
        title="通知"
        subtitle="保持信息同步：任务变更、讨论回复、文档更新都会汇总在这里。"
        actions={
          <Button variant="outline" className="gap-2" onClick={markAll} disabled={!unreadCount || readM.isPending}>
            <CheckCheck size={16} /> 全部标为已读
          </Button>
        }
        right={
          <Badge variant="outline" className={cn('bg-primary/5 text-primary border-primary/15', unreadCount ? '' : 'opacity-60')}>
            未读 {unreadCount}
          </Badge>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1200px] mx-auto space-y-4">
          {!items.length ? (
            <PageEmpty title="暂无通知" message="当任务/讨论/文档有新动态时，这里会第一时间提醒你。" icon={Bell} />
          ) : (
            items.map((n) => (
              <Card key={n.id} className={cn('border-muted/70', !n.read && 'shadow-lg shadow-primary/10')}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{n.title}</CardTitle>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {n.createdAt} · {n.type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!n.read ? (
                        <Badge className="bg-primary/10 text-primary border-primary/15" variant="outline">
                          未读
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="opacity-70">
                          已读
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2"
                        disabled={n.read || readM.isPending}
                        onClick={() => readM.mutate(n.id)}
                      >
                        <Check size={14} /> 标记已读
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{n.content}</CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
