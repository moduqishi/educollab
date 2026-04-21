import React from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { stripHtml } from '@/lib/mappers';
import { AdminOverrideBanner, buildAdminOverrideUrl, useAdminOverrideState } from '@/components/admin/AdminOverrideBanner';

export function DocumentsPage() {
  const api = useApi();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  React.useEffect(() => setTitle(['文档']), []);

  const q = useQuery({ queryKey: ['documents'], queryFn: () => api.documents() });
  const { enabled: adminOverride } = useAdminOverrideState();
  const [kw, setKw] = React.useState(params.get('q') || '');

  React.useEffect(() => {
    setKw(params.get('q') || '');
  }, [params]);

  if (q.isLoading) return <PageLoading label="正在加载文档..." />;
  if (q.isError) return <PageError title="文档加载失败" onRetry={() => q.refetch()} />;

  const docs = (q.data || []).filter((d) => {
    const key = kw.trim().toLowerCase();
    if (!key) return true;
    return `${d.title} ${d.projectName} ${d.excerpt}`.toLowerCase().includes(key);
  });

  return (
    <div>
      <PageHero
        title="文档"
        subtitle="跨项目查看 Markdown 协同文档与 Office 文档，把会议纪要、方案评审和联调记录集中沉淀在这里。"
        actions={
          <Button variant="outline" className="gap-2" onClick={() => nav('/app/projects')}>
            <Plus size={16} /> 去项目里新建文档
          </Button>
        }
        right={
          <div className="relative w-[360px] max-w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="border-border/60 bg-muted/40 pl-9"
              placeholder="搜索文档标题、项目..."
              value={kw}
              onChange={(e) => {
                const next = e.target.value;
                setKw(next);
                setParams((prev) => {
                  const nextParams = new URLSearchParams(prev);
                  if (next.trim()) nextParams.set('q', next);
                  else nextParams.delete('q');
                  return nextParams;
                }, { replace: true });
              }}
            />
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <AdminOverrideBanner description="管理员正在全局文档页中接管全部 Markdown / Office 文档。" />
          {!docs.length ? (
            <PageEmpty
              title={kw.trim() ? '没有找到匹配的文档' : '还没有文档'}
              message={kw.trim() ? '换个关键词试试，或者去项目里新建一篇文档。' : '去任意项目新建文档后，这里会自动聚合显示。'}
              icon={FileText}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {docs.map((d) => (
                <Card key={d.id} className={cn('border-muted/70 transition-shadow hover:shadow-sm')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{d.title}</CardTitle>
                        <CardDescription className="truncate">{d.projectName}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[11px]">
                        {(d.kind || 'MARKDOWN') === 'OFFICE' ? `Office · ${(d.officeExt || 'file').toUpperCase()}` : 'Markdown'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="line-clamp-3 text-sm text-muted-foreground">
                      {(d.kind || 'MARKDOWN') === 'OFFICE'
                        ? d.excerpt || `Office 文档（${d.officeExt || 'file'}）`
                        : d.excerpt || stripHtml(d.currentContent || '').slice(0, 140) || '暂无内容'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>更新：{d.updatedAt}</span>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => nav(adminOverride ? buildAdminOverrideUrl(`/app/projects/${d.projectId}/documents/${d.id}`, '/app/documents?adminContext=content&adminReturn=/app/admin/content') : `/app/projects/${d.projectId}/documents/${d.id}`)}>
                        打开
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
