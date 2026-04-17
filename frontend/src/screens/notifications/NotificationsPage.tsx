import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ExternalLink, Eye } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { notificationSourceTypeLabel, notificationTypeLabel, notificationTypeOptions } from './notificationMeta';

type ReadFilter = 'ALL' | 'UNREAD';
type TypeFilter = (typeof notificationTypeOptions)[number]['value'];

export function NotificationsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [readFilter, setReadFilter] = React.useState<ReadFilter>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('ALL');

  React.useEffect(() => setTitle(['通知中心']), []);

  const notificationsQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
  });

  const markReadM = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: async (_, id) => {
      qc.setQueryData(['notifications'], (current: Awaited<ReturnType<typeof api.notifications>> | undefined) =>
        current?.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['notification', id] }),
      ]);
    },
  });

  const markAllReadM = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: async () => {
      qc.setQueryData(['notifications'], (current: Awaited<ReturnType<typeof api.notifications>> | undefined) =>
        current?.map((item) => ({ ...item, read: true })),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });

  if (notificationsQ.isLoading) return <PageLoading label="正在加载通知中心..." />;
  if (notificationsQ.isError) return <PageError title="通知加载失败" onRetry={() => notificationsQ.refetch()} />;

  const items = notificationsQ.data || [];
  const unreadCount = items.filter((item) => !item.read).length;
  const filteredItems = items.filter((item) => {
    if (readFilter === 'UNREAD' && item.read) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      <PageHero
        title="通知中心"
        subtitle="集中查看任务、讨论、文档与系统动态，并在需要时继续跳回原始业务页面。"
        actions={
          <>
            <Button
              variant={readFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setReadFilter('ALL')}
            >
              全部
            </Button>
            <Button
              variant={readFilter === 'UNREAD' ? 'default' : 'outline'}
              onClick={() => setReadFilter('UNREAD')}
            >
              未读
            </Button>
            {notificationTypeOptions.map((option) => (
              <Button
                key={option.value}
                variant={typeFilter === option.value ? 'default' : 'outline'}
                onClick={() => setTypeFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => markAllReadM.mutate()}
              disabled={!unreadCount || markAllReadM.isPending}
            >
              <CheckCheck size={16} />
              全部标记已读
            </Button>
          </>
        }
        right={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
              全部 {items.length}
            </Badge>
            <Badge
              variant="outline"
              className={cn('border-primary/15 bg-primary/5 text-primary', unreadCount ? '' : 'opacity-60')}
            >
              未读 {unreadCount}
            </Badge>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1200px] space-y-4">
          {!filteredItems.length ? (
            <PageEmpty
              title={items.length ? '当前筛选下没有通知' : '暂无通知'}
              message={items.length ? '试试切换筛选条件，或稍后再回来查看。' : '任务、讨论、文档或班级动态会在这里第一时间提醒你。'}
              icon={Bell}
            />
          ) : (
            filteredItems.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  'cursor-pointer border-muted/70 transition-shadow hover:shadow-md',
                  !notification.read && 'shadow-lg shadow-primary/10',
                )}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/app/notifications/${notification.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/app/notifications/${notification.id}`);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{notification.title}</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{notificationTypeLabel(notification.type)}</Badge>
                        <span>{notification.createdAt}</span>
                        {notification.sourceLabel ? (
                          <span>来源：{notification.sourceLabel}</span>
                        ) : notification.sourceType ? (
                          <span>来源：{notificationSourceTypeLabel(notification.sourceType)}</span>
                        ) : null}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        notification.read
                          ? 'opacity-70'
                          : 'border-primary/15 bg-primary/10 text-primary',
                      )}
                    >
                      {notification.read ? '已读' : '未读'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {notification.content}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/app/notifications/${notification.id}`);
                      }}
                    >
                      <Eye size={14} />
                      查看详情
                    </Button>
                    {!notification.read ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={markReadM.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          markReadM.mutate(notification.id);
                        }}
                      >
                        <Check size={14} />
                        标记已读
                      </Button>
                    ) : null}
                    {notification.sourcePath ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(notification.sourcePath!);
                        }}
                      >
                        <ExternalLink size={14} />
                        查看关联内容
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
