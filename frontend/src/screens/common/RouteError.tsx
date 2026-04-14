import React from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function RouteError() {
  const err = useRouteError();
  const nav = useNavigate();

  let title = '页面出错';
  let message = '发生了未知错误。';

  if (isRouteErrorResponse(err)) {
    title = `${err.status} ${err.statusText || 'Error'}`;
    message = typeof err.data === 'string' ? err.data : '页面不存在或无权访问。';
  } else if (err instanceof Error) {
    message = err.message;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-[680px] border-muted/60">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <AlertTriangle size={20} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">{message}</div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full gap-2" onClick={() => window.location.reload()}>
                  <RotateCcw size={16} /> 刷新
                </Button>
                <Button className="rounded-full gap-2" onClick={() => nav('/app/dashboard')}>
                  <Home size={16} /> 回到仪表盘
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

