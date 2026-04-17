import React from 'react';
import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PageLoading({ label = '正在加载...' }: { label?: string }) {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-[1500px]">
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            {label}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PageError({
  title = '加载失败',
  message = '服务暂时不可用或网络异常，请稍后重试。',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-[1500px]">
        <Card>
          <CardContent className="py-10">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{message}</div>
                {onRetry ? (
                  <div className="mt-5">
                    <Button size="sm" className="gap-2" onClick={onRetry}>
                      <RefreshCcw size={14} />
                      重新加载
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function PageEmpty({
  title = '暂无数据',
  message = '当前列表为空。',
  icon = Inbox,
  action,
  className,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = icon;

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="py-10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{message}</div>
            {action ? <div className="mt-5">{action}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
