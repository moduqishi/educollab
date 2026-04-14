import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, File, FileText, Folder, GitCommit, GitBranch, GitMerge, KeyRound, Plus, RefreshCcw } from 'lucide-react';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type RepoTab = 'files' | 'commits' | 'branches' | 'merge-requests';

export function ProjectRepositoryPage() {
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { tab } = useParams();
  const currentTab: RepoTab = (tab as RepoTab) || 'files';

  const { detail, refresh } = useProjectDetail();
  const projectId = detail.project.id;

  React.useEffect(() => setTitle([detail.project.name, '仓库']), [detail.project.name]);

  const initM = useMutation({
    mutationFn: () => api.initRepository(projectId),
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries({ queryKey: ['gitTree', projectId] });
    },
  });

  const tabs: Array<{ key: RepoTab; label: string; icon: any }> = [
    { key: 'files', label: '文件', icon: Folder },
    { key: 'commits', label: '提交', icon: GitCommit },
    { key: 'branches', label: '分支', icon: GitBranch },
    { key: 'merge-requests', label: '合并请求', icon: GitMerge },
  ];

  const branches = detail.branches || [];
  const hasRepo = branches.length > 0 || detail.stats.commitCount > 0;
  const [branch, setBranch] = React.useState<string>(branches[0] || 'main');
  React.useEffect(() => {
    if (branches.length && !branches.includes(branch)) setBranch(branches[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.join('|')]);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[160px] rounded-full bg-white">
              <GitBranch size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(branches.length ? branches : ['main']).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="min-w-0 text-sm text-muted-foreground truncate">
            <code className="bg-muted px-2 py-1 rounded font-mono">EduCollab / {detail.project.name.toLowerCase().replace(/\s+/g, '-')}</code>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full" disabled title="请在本地创建文件后 git commit & push">
            + New File
          </Button>
          <CloneRepoButton projectId={projectId} projectName={detail.project.name} />
          <Button variant="outline" className="rounded-full gap-2" onClick={() => refresh()}>
            <RefreshCcw size={14} /> Refresh
          </Button>
          {!hasRepo ? (
            <Button className="rounded-full gap-2" onClick={() => initM.mutate()} disabled={initM.isPending}>
              <Plus size={16} /> {initM.isPending ? '初始化中…' : '初始化仓库'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabs row */}
      <div className="flex items-center gap-2">
        {tabs.map((t) => {
          const active = currentTab === t.key;
          return (
            <button
              key={t.key}
              className={cn(
                'px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors',
                active ? 'bg-muted text-foreground shadow-sm' : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
              )}
              onClick={() => nav(`/app/projects/${projectId}/repository/${t.key}`)}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <Badge variant="outline" className="rounded-full">
            {detail.stats.commitCount} commits
          </Badge>
        </div>
      </div>

      {!hasRepo ? (
        <Card className="border-muted/60">
          <CardContent className="p-8">
            <PageEmpty
              title="仓库尚未初始化"
              message="初始化后，你可以浏览文件、查看提交、创建分支/合并请求。"
              icon={GitBranch}
              action={
                <Button className="rounded-full gap-2" onClick={() => initM.mutate()} disabled={initM.isPending}>
                  <Plus size={16} /> {initM.isPending ? '初始化中…' : '初始化仓库'}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : currentTab === 'files' ? (
        <RepoFiles projectId={projectId} />
      ) : currentTab === 'commits' ? (
        <RepoCommits />
      ) : currentTab === 'branches' ? (
        <RepoBranches projectId={projectId} branches={branches} onDone={refresh} />
      ) : (
        <RepoMergeRequests projectId={projectId} branches={branches} onDone={refresh} />
      )}
    </div>
  );
}

function RepoFiles({ projectId }: { projectId: number }) {
  const api = useApi();
  const { detail } = useProjectDetail();
  const [path, setPath] = React.useState<string>('');
  const [selected, setSelected] = React.useState<string | null>(null);

  const treeQ = useQuery({
    queryKey: ['gitTree', projectId, path],
    queryFn: () => api.gitTree(projectId, path || undefined),
  });

  const blobQ = useQuery({
    queryKey: ['gitBlob', projectId, selected],
    enabled: !!selected,
    queryFn: () => api.gitBlob(projectId, selected!),
  });

  if (treeQ.isLoading) return <PageLoading label="正在加载文件列表…" />;
  if (treeQ.isError) return <PageError title="文件列表加载失败" onRetry={() => treeQ.refetch()} />;

  const entries = (treeQ.data || []).slice().sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));

  const breadcrumb = path ? path.split('/').filter(Boolean) : [];
  const latest = (detail.commits || [])[0];
  const latestMsg = latest?.message || '—';
  const latestAuthor = latest?.authorName || '—';
  const latestAt = latest?.createdAt || '—';
  const latestHash = latest?.hash || '';

  return (
    <div className="space-y-4">
      {/* Latest commit bar */}
      <Card className="border-muted/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b bg-muted/10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{latestMsg}</div>
              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                {latestAuthor} · {latestAt}
              </div>
            </div>
            {latestHash ? <code className="text-[11px] bg-muted px-2 py-1 rounded shrink-0">{latestHash.slice(0, 10)}</code> : null}
          </div>

          {/* Breadcrumb */}
          <div className="px-4 py-3 border-b bg-white flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full"
              onClick={() => {
                setPath('');
                setSelected(null);
              }}
            >
              root
            </Button>
            {breadcrumb.map((seg, idx) => {
              const p = breadcrumb.slice(0, idx + 1).join('/');
              return (
                <Button
                  key={p}
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full"
                  onClick={() => {
                    setPath(p);
                    setSelected(null);
                  }}
                >
                  {seg}
                </Button>
              );
            })}
            <div className="ml-auto text-xs text-muted-foreground">
              Path: <code className="bg-muted px-1 py-0.5 rounded">{path || '/'}</code>
            </div>
          </div>

          {/* Files table */}
          <div className="bg-white">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/10">
                <tr className="[&>th]:font-medium [&>th]:px-4 [&>th]:py-2">
                  <th className="text-left">Name</th>
                  <th className="text-left hidden md:table-cell">Message</th>
                  <th className="text-right w-[180px] hidden lg:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => {
                  const isDir = e.type === 'directory';
                  return (
                    <tr key={e.path} className={cn('hover:bg-muted/20 transition-colors', selected === e.path ? 'bg-primary/5' : '')}>
                      <td className="px-4 py-2">
                        <button
                          className="flex items-center gap-2 min-w-0 w-full text-left"
                          onClick={() => {
                            if (isDir) {
                              setPath(e.path);
                              setSelected(null);
                            } else {
                              setSelected(e.path);
                            }
                          }}
                        >
                          {isDir ? <Folder size={16} className="text-muted-foreground shrink-0" /> : <File size={16} className="text-muted-foreground shrink-0" />}
                          <span className={cn('truncate', isDir ? 'font-semibold text-foreground' : 'text-foreground')}>{e.name}</span>
                          {!isDir ? <span className="ml-auto text-[11px] text-muted-foreground shrink-0 md:hidden">{Math.round((e.sizeBytes || 0) / 1024)} KB</span> : null}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
                        <span className="line-clamp-1">{latestMsg}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground hidden lg:table-cell">{latestAt}</td>
                    </tr>
                  );
                })}
                {!entries.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      此目录为空。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-muted/60 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} /> Preview
            </CardTitle>
            {selected ? <Badge variant="outline" className="rounded-full">{selected}</Badge> : <Badge variant="outline" className="rounded-full opacity-60">未选择文件</Badge>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!selected ? (
            <PageEmpty title="请选择一个文件" message="点击上方文件列表中的文件即可预览内容；点击目录进入子路径。" icon={FileText} />
          ) : blobQ.isLoading ? (
            <PageLoading label="正在加载文件内容…" />
          ) : blobQ.isError ? (
            <PageError title="文件预览失败" onRetry={() => blobQ.refetch()} />
          ) : blobQ.data?.binary ? (
            <div className="text-sm text-muted-foreground">
              该文件为二进制内容（{Math.round((blobQ.data.sizeBytes || 0) / 1024)} KB），当前不支持在线预览。
            </div>
          ) : (
            <pre className="text-xs leading-relaxed bg-muted/20 border rounded-2xl p-4 overflow-auto">
              <code>{blobQ.data?.content || ''}</code>
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CloneRepoButton({ projectId, projectName }: { projectId: number; projectName: string }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [tokenPlain, setTokenPlain] = React.useState<string | null>(null);
  const [showTokens, setShowTokens] = React.useState(false);
  const [tokenName, setTokenName] = React.useState('local-dev');
  const [expiresDays, setExpiresDays] = React.useState<number | ''>(30);

  const cloneInfoQ = useQuery({
    queryKey: ['gitCloneInfo', projectId],
    enabled: open,
    queryFn: () => api.gitCloneInfo(projectId),
  });

  const tokensQ = useQuery({
    queryKey: ['gitTokens'],
    enabled: open,
    queryFn: () => api.gitTokens(),
  });

  const createTokenM = useMutation({
    mutationFn: () => api.createGitToken({ name: tokenName.trim(), expiresInDays: expiresDays === '' ? undefined : Number(expiresDays) }),
    onSuccess: async (res) => {
      setTokenPlain(res.token);
      await tokensQ.refetch();
    },
  });

  const revokeTokenM = useMutation({
    mutationFn: (id: number) => api.revokeGitToken(id),
    onSuccess: async () => {
      await tokensQ.refetch();
    },
  });

  const cloneUrl = cloneInfoQ.data?.httpUrl || '';

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) setTokenPlain(null);
    }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <ExternalLink size={14} /> Clone
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} /> Clone / Push（HTTPS）
          </DialogTitle>
        </DialogHeader>

        {cloneInfoQ.isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">正在生成仓库链接…</div>
        ) : cloneInfoQ.isError ? (
          <div className="py-6 text-sm text-destructive">获取仓库链接失败，请稍后重试。</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>仓库地址</Label>
              <div className="flex items-start gap-2">
                <pre className="flex-1 text-xs leading-relaxed bg-muted/40 border rounded-xl p-3 overflow-x-auto">
                  <code className="font-mono">{cloneUrl || '—'}</code>
                </pre>
                <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={() => copy(cloneUrl)} disabled={!cloneUrl}>
                  <Copy size={14} /> 复制
                </Button>
              </div>
              <div className="text-[12px] text-muted-foreground">
                项目：<span className="font-medium text-foreground">{projectName}</span>（默认分支：<code className="bg-muted px-1 py-0.5 rounded">{cloneInfoQ.data?.defaultBranch || 'main'}</code>）
              </div>
            </div>

            <Card className="border-muted/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">本地使用方式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>1) 执行：</div>
                <pre className="text-xs leading-relaxed bg-muted/40 border rounded-xl p-3 overflow-auto">
                  <code>{cloneUrl ? `git clone ${cloneUrl}` : 'git clone <repo-url>'}</code>
                </pre>
                <div>2) clone/push 时按提示输入账号与密码（更方便）：</div>
                <ul className="list-disc pl-5">
                  <li>Username：你的登录邮箱</li>
                  <li>Password：你的登录密码（例如 Password123!）</li>
                </ul>
                <div className="text-[12px]">
                  备注：如果你不想暴露登录密码，也可以用下方的 <span className="font-medium text-foreground">Git Access Token</span>（可随时撤销）。
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted/70">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm">Git Access Tokens（可选）</CardTitle>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowTokens((v) => !v)}>
                    {showTokens ? '收起' : '展开'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn('space-y-3', showTokens ? '' : 'hidden')}>
                {tokenPlain ? (
                  <div className="rounded-xl border bg-primary/5 border-primary/20 p-3">
                    <div className="text-sm font-semibold text-primary">已创建 Token（仅展示一次，请保存）</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input readOnly value={tokenPlain} className="font-mono" />
                      <Button type="button" variant="outline" className="gap-2" onClick={() => copy(tokenPlain)}>
                        <Copy size={14} /> 复制
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_160px] gap-2 items-end">
                  <div className="space-y-2">
                    <Label>名称</Label>
                    <Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="例如：my-macbook / ci" />
                  </div>
                  <div className="space-y-2">
                    <Label>有效期（天）</Label>
                    <Input
                      value={expiresDays}
                      onChange={(e) => setExpiresDays(e.target.value ? Number(e.target.value) : '')}
                      placeholder="例如：30"
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    type="button"
                    className="rounded-full gap-2"
                    onClick={() => createTokenM.mutate()}
                    disabled={!tokenName.trim() || createTokenM.isPending}
                  >
                    <Plus size={16} /> {createTokenM.isPending ? '创建中…' : '创建 Token'}
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground">已创建的 tokens（不会显示明文）</div>
                  <div className="divide-y">
                    {tokensQ.isLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">加载中…</div>
                    ) : (tokensQ.data || []).length ? (
                      (tokensQ.data || []).map((t) => (
                        <div key={t.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{t.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              prefix <code className="bg-muted px-1 py-0.5 rounded">{t.prefix}</code>
                              {t.lastUsedAt ? ` · last used ${t.lastUsedAt}` : ''}
                              {t.expiresAt ? ` · expires ${t.expiresAt}` : ''}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => revokeTokenM.mutate(t.id)}
                            disabled={revokeTokenM.isPending}
                          >
                            撤销
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground">暂无 token。先创建一个用于 git clone/push。</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RepoCommits() {
  const { detail } = useProjectDetail();
  const commits = detail.commits || [];
  return (
    <div className="p-6">
      {!commits.length ? (
        <PageEmpty title="暂无提交" message="当仓库有提交记录后，这里会展示提交历史。" icon={GitCommit} />
      ) : (
        <div className="space-y-3">
          {commits.map((c) => (
            <Card key={c.hash} className="border-muted/70">
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold line-clamp-1">{c.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.authorName} · {c.createdAt} · 分支 <code className="bg-muted px-1 py-0.5 rounded">{c.branch}</code>
                  </div>
                </div>
                <code className="text-[11px] bg-muted px-2 py-1 rounded shrink-0">{c.hash}</code>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RepoBranches({ projectId, branches, onDone }: { projectId: number; branches: string[]; onDone: () => Promise<void> }) {
  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <CreateBranchButton projectId={projectId} branches={branches} onDone={onDone} />
      </div>
      {!branches.length ? (
        <PageEmpty title="暂无分支" message="初始化仓库后会出现默认分支。" icon={GitBranch} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b} className="border-muted/70">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="text-sm font-semibold">{b}</div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                  分支
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RepoMergeRequests({ projectId, branches, onDone }: { projectId: number; branches: string[]; onDone: () => Promise<void> }) {
  const { detail } = useProjectDetail();
  const mrs = detail.mergeRequests || [];
  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <CreateMrButton projectId={projectId} branches={branches} onDone={onDone} />
      </div>
      {!mrs.length ? (
        <PageEmpty title="暂无合并请求" message="在分支开发完成后，创建合并请求以便评审与合并。" icon={GitMerge} />
      ) : (
        <div className="space-y-3">
          {mrs.map((m) => (
            <Card key={m.id} className="border-muted/70">
              <CardContent className="py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{m.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.sourceBranch} → {m.targetBranch}
                  </div>
                </div>
                <Badge variant="outline">{m.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBranchButton({ projectId, branches, onDone }: { projectId: number; branches: string[]; onDone: () => Promise<void> }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');

  const m = useMutation({
    mutationFn: () => api.createBranch(projectId, name.trim()),
    onSuccess: async () => {
      setOpen(false);
      setName('');
      await onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Plus size={14} /> 新建分支
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建分支</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>分支名</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：feature/login-ui" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={m.isPending}>
            取消
          </Button>
          <Button disabled={!name.trim() || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? '创建中…' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMrButton({ projectId, branches, onDone }: { projectId: number; branches: string[]; onDone: () => Promise<void> }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [source, setSource] = React.useState(branches[0] || 'main');
  const [target, setTarget] = React.useState(branches[0] || 'main');

  React.useEffect(() => {
    if (branches.length) {
      setSource(branches[0]);
      setTarget(branches[0]);
    }
  }, [branches.join('|')]);

  const m = useMutation({
    mutationFn: () => api.createMergeRequest({ projectId, title: title.trim(), sourceBranch: source, targetBranch: target }),
    onSuccess: async () => {
      setOpen(false);
      setTitle('');
      await onDone();
    },
  });

  const can = !!title.trim() && !!source && !!target && source !== target;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Plus size={14} /> 新建 MR
      </DialogTrigger>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>新建合并请求</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2 md:col-span-2">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：完成登录页中文化与路由重构" />
          </div>
          <div className="space-y-2">
            <Label>源分支</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>目标分支</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!can ? <div className="md:col-span-2 text-[11px] text-muted-foreground">提示：源分支与目标分支不能相同。</div> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={m.isPending}>
            取消
          </Button>
          <Button disabled={!can || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? '创建中…' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
