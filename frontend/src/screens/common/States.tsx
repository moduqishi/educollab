import React from 'react';
import { AlertTriangle, Inbox, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PageLoading({ label = '正在加载…' }: { label?: string }) {
  return (
    <div className="px-8 py-10">
      <div className="max-w-[1500px] mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-10 text-sm text-muted-foreground flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
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
      <div className="max-w-[1500px] mx-auto">
        <Card>
          <CardContent className="py-10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{message}</div>
                {onRetry ? (
                  <div className="mt-5">
                    <Button size="sm" className="gap-2" onClick={onRetry}>
                      <RefreshCcw size={14} /> 重新加载
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
}: {
  title?: string;
  message?: string;
  icon?: any;
  action?: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <Card className={cn('border-dashed')}>
      <CardContent className="py-10">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
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

