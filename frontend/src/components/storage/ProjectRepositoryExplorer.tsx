import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { File, FileCode2, Folder, GitBranch } from 'lucide-react';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { cn } from '@/lib/utils';

export function ProjectRepositoryExplorer({
  projectId,
  title = '仓库浏览器',
  description = '按代码树浏览项目仓库，仓库在文件工作台中默认只读。',
}: {
  projectId: number;
  title?: string;
  description?: string;
}) {
  const api = useApi();
  const [path, setPath] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const cloneInfoQuery = useQuery({ queryKey: ['gitCloneInfo', projectId], queryFn: () => api.gitCloneInfo(projectId) });
  const branchesQuery = useQuery({ queryKey: ['gitBranches', projectId], queryFn: () => api.branches(projectId) });
  const [branch, setBranch] = React.useState<string>('');

  React.useEffect(() => {
    if (!branch && cloneInfoQuery.data?.defaultBranch) {
      setBranch(cloneInfoQuery.data.defaultBranch);
    }
  }, [branch, cloneInfoQuery.data?.defaultBranch]);

  const effectiveBranch = branch || cloneInfoQuery.data?.defaultBranch;
  const treeQuery = useQuery({ queryKey: ['gitTree', projectId, effectiveBranch, path], enabled: !!effectiveBranch, queryFn: () => api.gitTree(projectId, path || undefined, effectiveBranch || undefined) });
  const blobQuery = useQuery({ queryKey: ['gitBlob', projectId, effectiveBranch, selected], enabled: !!selected && !!effectiveBranch, queryFn: () => api.gitBlob(projectId, selected!, effectiveBranch || undefined) });

  if (cloneInfoQuery.isLoading || branchesQuery.isLoading || treeQuery.isLoading) return <PageLoading label="正在加载仓库结构..." />;
  if (cloneInfoQuery.isError || branchesQuery.isError || treeQuery.isError) return <PageError title="仓库结构加载失败" onRetry={() => { void cloneInfoQuery.refetch(); void branchesQuery.refetch(); void treeQuery.refetch(); }} />;

  const entries = (treeQuery.data || []).slice().sort((left, right) => (left.type === right.type ? left.name.localeCompare(right.name) : left.type === 'directory' ? -1 : 1));
  const breadcrumb = path ? path.split('/').filter(Boolean) : [];
  const branches = branchesQuery.data || [];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="text-sm text-muted-foreground">{description}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><GitBranch size={14} /> 当前分支</div>
            <div className="flex flex-wrap gap-2">
              {branches.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={effectiveBranch === item ? 'default' : 'outline'}
                  onClick={() => {
                    setBranch(item);
                    setPath('');
                    setSelected(null);
                  }}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <button type="button" className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted/30', path === '' && 'border-primary bg-primary/5')} onClick={() => { setPath(''); setSelected(null); }}>
            <Folder size={15} className="text-amber-500" /> 根目录
          </button>
          {breadcrumb.map((segment, index) => {
            const nextPath = breadcrumb.slice(0, index + 1).join('/');
            return (
              <button key={nextPath} type="button" className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted/30', path === nextPath && 'border-primary bg-primary/5')} onClick={() => { setPath(nextPath); setSelected(null); }}>
                <Folder size={15} className="text-amber-500" />
                <span className="truncate">{segment}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-muted/70 overflow-hidden">
        <CardHeader className="border-b bg-muted/10 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">当前路径</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">真实 Git 仓库视图，按所选分支读取 tree / blob / commit。</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline"><code>{path || '/'}</code></Badge>
              {effectiveBranch ? <Badge variant="secondary">{effectiveBranch}</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!entries.length ? (
            <div className="p-8"><PageEmpty title="当前目录为空" message="当前仓库目录还没有文件。" icon={Folder} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/10 text-muted-foreground">
                  <tr className="border-b [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
                    <th>名称</th>
                    <th>类型</th>
                    <th>大小</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const isDirectory = entry.type === 'directory';
                    return (
                      <tr key={`${effectiveBranch}:${entry.path}`} className={cn('border-b last:border-b-0 hover:bg-muted/20', selected === entry.path && 'bg-primary/5')}>
                        <td className="px-4 py-3">
                          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => {
                            if (isDirectory) {
                              setPath(entry.path);
                              setSelected(null);
                            } else {
                              setSelected(entry.path);
                            }
                          }}>
                            {isDirectory ? <Folder size={16} className="text-amber-500" /> : <File size={16} className="text-muted-foreground" />}
                            <span className="truncate font-medium">{entry.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{isDirectory ? '目录' : '文件'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatBytes(entry.sizeBytes)}</td>
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
          <CardTitle className="flex items-center gap-2 text-base"><FileCode2 size={16} /> 文件预览</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!selected ? (
            <PageEmpty title="请选择一个文件" message="点击中间列表中的文件即可查看内容。" icon={FileCode2} />
          ) : blobQuery.isLoading ? (
            <PageLoading label="正在加载文件内容..." />
          ) : blobQuery.isError ? (
            <PageError title="文件预览失败" onRetry={() => blobQuery.refetch()} />
          ) : blobQuery.data?.binary ? (
            <div className="text-sm text-muted-foreground">当前文件为二进制文件，暂不支持在线预览。</div>
          ) : (
            <pre className="max-h-[760px] overflow-auto rounded-2xl border bg-muted/20 p-4 text-xs leading-relaxed"><code>{blobQuery.data?.content || ''}</code></pre>
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
