import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ADMIN_CONTENT_CONTEXT = 'content';

export function buildAdminOverrideUrl(path: string, returnTo = '/app/admin/content') {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('adminContext', ADMIN_CONTENT_CONTEXT);
  params.set('adminReturn', returnTo);
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function useAdminOverrideState() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const enabled = session?.profile.role === 'ADMIN' && params.get('adminContext') === ADMIN_CONTENT_CONTEXT;
  const returnTo = params.get('adminReturn') || '/app/admin/content';
  return { enabled, returnTo };
}

export function AdminOverrideBanner({
  title = '当前为管理员接管视图',
  description = '你正在使用前台真实业务界面处理课程、团队、项目与内容数据，拥有管理员最高权限。',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { enabled, returnTo } = useAdminOverrideState();

  if (!enabled) return null;

  return (
    <div className={cn('mb-4 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-primary/15 bg-white p-2 text-primary">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{title}</span>
              <Badge variant="outline" className="border-primary/20 bg-white/80 text-primary">管理员最高权限</Badge>
            </div>
            <div className="mt-1 text-muted-foreground">{description}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(returnTo)}>
          <ArrowLeft size={14} /> 返回内容治理
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">当前路径：{location.pathname}</div>
    </div>
  );
}
