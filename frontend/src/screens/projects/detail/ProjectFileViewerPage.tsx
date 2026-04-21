import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, FileType2, Image as ImageIcon, Info, Package, RefreshCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading } from '@/screens/common/States';

type ScopeType = 'COURSE' | 'TEAM' | 'PROJECT';

const TEXT_EXTENSIONS = new Set(['txt', 'text', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'yml', 'yaml', 'log', 'csv', 'md', 'markdown']);

export function ProjectFileViewerPage() {
  const api = useApi();
  const nav = useNavigate();
  const location = useLocation();
  const search = new URLSearchParams(location.search);

  const scopeType = (search.get('scopeType') || '') as ScopeType;
  const scopeId = Number(search.get('scopeId') || 0);
  const path = search.get('path') || '';
  const name = search.get('name') || path.split('/').pop() || '文件';
  const mimeType = search.get('mimeType') || '';
  const updatedAt = search.get('updatedAt') || '';
  const sizeBytes = Number(search.get('sizeBytes') || 0);
  const projectName = search.get('projectName') || '';
  const downloadUrl = scopeType && scopeId && path ? api.downloadStorageEntryUrl(scopeType, scopeId, path) : '';

  React.useEffect(() => {
    setTitle([name, '文件查看']);
  }, [name]);

  const ext = getFileExtension(name, mimeType);
  const isImage = mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = mimeType.includes('pdf') || ext === 'pdf';
  const isText = mimeType.startsWith('text/') || TEXT_EXTENSIONS.has(ext);

  const textQ = useQuery({
    queryKey: ['fileViewerText', scopeType, scopeId, path],
    enabled: !!downloadUrl && isText,
    queryFn: async () => {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`读取文件失败: ${res.status}`);
      return res.text();
    },
  });

  if (!scopeType || !scopeId || !path) {
    return <PageError title="文件参数不完整" message="请返回文件列表后重新打开。" onRetry={() => nav(-1)} />;
  }

  return (
    <div className="px-8 pb-10">
      <div className="mx-auto max-w-[1320px] space-y-4">
        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon-sm" onClick={() => nav(-1)}>
                  <ArrowLeft size={16} />
                </Button>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  {isImage ? <ImageIcon size={18} /> : isPdf ? <FileText size={18} /> : <FileType2 size={18} />}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold">{name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{scopeType} 空间</span>
                    {projectName ? <><span>·</span><span>{projectName}</span></> : null}
                    {updatedAt ? <><span>·</span><span>{updatedAt}</span></> : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{mimeType || ext.toUpperCase() || 'FILE'}</Badge>
              <Badge variant="outline">{formatBytes(sizeBytes)}</Badge>
              <a href={downloadUrl} target="_blank" rel="noreferrer">
                <Button className="gap-2">
                  <Download size={14} /> 下载
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border bg-white p-4 shadow-sm">
            {isImage ? (
              <div className="flex min-h-[60vh] items-center justify-center rounded-2xl bg-muted/20 p-6">
                <img src={downloadUrl} alt={name} className="max-h-[72vh] max-w-full rounded-2xl object-contain" />
              </div>
            ) : isPdf ? (
              <iframe title={name} src={downloadUrl} className="h-[72vh] w-full rounded-2xl border bg-muted/10" />
            ) : isText ? (
              textQ.isLoading ? (
                <PageLoading label="正在读取文本内容..." />
              ) : textQ.isError ? (
                <PageError title="文本预览失败" message="该文件仍可下载。" onRetry={() => textQ.refetch()} />
              ) : (
                <pre className="min-h-[72vh] overflow-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{textQ.data || ''}</pre>
              )
            ) : (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/20 px-8 text-center">
                <Package size={36} className="text-muted-foreground" />
                <div>
                  <div className="font-medium">当前类型暂不支持在线预览</div>
                  <div className="mt-1 text-sm text-muted-foreground">你仍然可以下载到本地后使用系统默认应用打开。</div>
                </div>
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Download size={14} /> 下载文件
                  </Button>
                </a>
              </div>
            )}
          </div>

          <Card className="rounded-3xl border-muted/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Info size={14} /> 文件信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="文件名" value={name} />
              <InfoRow label="路径" value={path} />
              <InfoRow label="类型" value={mimeType || ext.toUpperCase() || '未知'} />
              <InfoRow label="大小" value={formatBytes(sizeBytes)} />
              <InfoRow label="更新时间" value={updatedAt || '—'} />
              <InfoRow label="空间" value={`${scopeType} #${scopeId}`} />
              <Button variant="outline" className="mt-2 w-full gap-2" onClick={() => window.location.reload()}>
                <RefreshCcw size={14} /> 刷新预览
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border px-3 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value || '—'}</div>
    </div>
  );
}

function getFileExtension(name: string, mimeType?: string) {
  const clean = name.toLowerCase();
  const idx = clean.lastIndexOf('.');
  if (idx >= 0) return clean.slice(idx + 1);
  if (mimeType?.includes('pdf')) return 'pdf';
  return '';
}

function formatBytes(size: number) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
