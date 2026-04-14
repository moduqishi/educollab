import React from 'react';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useAuth } from '@/app/auth';
import { PageHero } from '@/screens/shell/PageHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE, COLLAB_BASE } from '@/lib/mappers';

export function SettingsPage() {
  const { session, logout } = useAuth();
  React.useEffect(() => setTitle(['设置']), []);

  const apiBase = API_BASE;
  const collabBase = COLLAB_BASE;

  return (
    <div>
      <PageHero title="设置" subtitle="账号信息、环境配置与偏好设置。" />
      <div className="px-8 pb-10">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SettingsIcon size={16} /> 账号
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">姓名</div>
                <div className="font-medium">{session?.profile.name || '—'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">邮箱</div>
                <div className="font-medium">{session?.profile.email || '—'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">身份</div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                  {session?.profile.role === 'TEACHER' ? '教师' : '学生'}
                </Badge>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="gap-2" onClick={logout}>
                  <LogOut size={16} /> 退出登录
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">环境</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground shrink-0">API Base</div>
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">{apiBase}</code>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-muted-foreground shrink-0">Collab Base</div>
                <code className="text-xs bg-muted px-2 py-1 rounded break-all">{collabBase}</code>
              </div>
              <div className="text-[11px] text-muted-foreground pt-2">
                提示：在 docker-compose 或本地启动脚本里配置 <code>VITE_API_BASE_URL</code> / <code>VITE_COLLAB_BASE_URL</code> 即可切换环境。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
