import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Folder, Shield } from 'lucide-react';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { cn } from '@/lib/utils';

export function ProjectSystemExplorer({
  projectId,
  title = '系统目录',
  description = '管理员只读浏览项目 system 目录中的 activity-logs、summary-cache 与 audit 归档。',
}: {
  projectId: number;
  title?: string;
  description?: string;
}) {
  const api = useApi();
  const [path, setPath] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);

  const dirQuery = useQuery({ queryKey: ['adminProjectSystemEntries', projectId, path], queryFn: () => api.adminProjectSystemEntries(projectId, path || undefined) });
  const fileQuery = useQuery({ queryKey: ['adminProjectSystemFile', projectId, selected], enabled: !!selected, queryFn: () => api.adminProjectSystemFile(projectId, selected!) });

  if (dirQuery.isLoading) return <PageLoading label="正在加载系统目录..." />;
  if (dirQuery.isError || !dirQuery.data) return <PageError title="系统目录加载失败" onRetry={() => dirQuery.refetch()} />;

  const directory = dirQuery.data;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="text-sm text-muted-foreground">{description}</div>
        </CardHeader>
        <CardContent className="space-y-2">
          {directory.breadcrumbs.map((crumb, index) => (
            <button key={`${crumb.path}-${index}`} type="button" className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted/30', crumb.path === directory.currentPath && 'border-primary bg-primary/5')} onClick={() => { setPath(crumb.path); setSelected(null); }}>
              <Folder size={15} className="text-amber-500" />
              <span className="truncate">{crumb.name}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-muted/70 overflow-hidden">
        <CardHeader className="border-b bg-muted/10 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">当前目录</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">system 目录默认只读，日志现按周归档。</div>
            </div>
            <Badge variant="outline"><code>{directory.currentPath || '/'}</code></Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!directory.entries.length ? (
            <div className="p-8"><PageEmpty title="当前目录为空" message="该系统目录下暂时没有归档内容。" icon={Shield} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/10 text-muted-foreground">
                  <tr className="border-b [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
                    <th>名称</th>
                    <th>类型</th>
                    <th>大小</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {directory.entries.map((entry) => {
                    const isDirectory = entry.itemType === 'directory';
                    return (
                      <tr key={entry.path} className={cn('border-b last:border-b-0 hover:bg-muted/20', selected === entry.path && 'bg-primary/5')}>
                        <td className="px-4 py-3">
                          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => {
                            if (isDirectory) {
                              setPath(entry.path);
                              setSelected(null);
                            } else {
                              setSelected(entry.path);
                            }
                          }}>
                            {isDirectory ? <Folder size={16} className="text-amber-500" /> : <FileText size={16} className="text-muted-foreground" />}
                            <span className="truncate font-medium">{entry.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{isDirectory ? '目录' : '文件'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatBytes(entry.sizeBytes)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.updatedAt || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted/70 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><FileText size={16} /> 文件预览</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!selected ? (
            <PageEmpty title="请选择一个文件" message="点击系统目录中的文件即可查看内容。" icon={FileText} />
          ) : fileQuery.isLoading ? (
            <PageLoading label="正在加载系统文件..." />
          ) : fileQuery.isError ? (
            <PageError title="系统文件预览失败" onRetry={() => fileQuery.refetch()} />
          ) : fileQuery.data?.binary ? (
            <div className="text-sm text-muted-foreground">当前系统文件为二进制文件，暂不支持在线预览。</div>
          ) : (
            <pre className="max-h-[760px] overflow-auto rounded-2xl border bg-muted/20 p-4 text-xs leading-relaxed"><code>{fileQuery.data?.content || ''}</code></pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatBytes(size?: number | null) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
