import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, File, FileText, Folder, GitBranch, GitCommit, GitMerge, KeyRound, Plus, RefreshCcw } from 'lucide-react';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  React.useEffect(() => setTitle([detail.project.name, '代码仓库']), [detail.project.name]);

  const initMutation = useMutation({
    mutationFn: () => api.initRepository(projectId),
    onSuccess: async () => {
      await refresh();
      await qc.invalidateQueries({ queryKey: ['gitTree', projectId] });
    },
  });

  const tabs = [
    { key: 'files' as const, label: '文件', icon: Folder },
    { key: 'commits' as const, label: '提交记录', icon: GitCommit },
    { key: 'branches' as const, label: '分支', icon: GitBranch },
    { key: 'merge-requests' as const, label: '合并请求', icon: GitMerge },
  ];

  const branches = detail.branches || [];
  const hasRepo = branches.length > 0 || detail.stats.commitCount > 0;
  const [branch, setBranch] = React.useState<string>(branches[0] || 'main');

  React.useEffect(() => {
    if (branches.length && !branches.includes(branch)) setBranch(branches[0]);
  }, [branch, branches]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[180px] rounded-full bg-white">
              <GitBranch size={14} className="mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(branches.length ? branches : ['main']).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <code className="truncate rounded bg-muted px-2 py-1 text-sm text-muted-foreground">EduCollab / {detail.project.name.toLowerCase().replace(/\s+/g, '-')}</code>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-full" disabled title="请在本地创建文件后再提交并推送">
            新建文件
          </Button>
          <CloneRepoButton projectId={projectId} projectName={detail.project.name} />
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => refresh()}>
            <RefreshCcw size={14} />
            刷新
          </Button>
          {!hasRepo ? (
            <Button className="gap-2 rounded-full" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              <Plus size={16} />
              {initMutation.isPending ? '初始化中...' : '初始化仓库'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              currentTab === item.key ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            onClick={() => nav(`/app/projects/${projectId}/repository/${item.key}`)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
        <Badge variant="outline" className="ml-auto rounded-full">
          {detail.stats.commitCount} 次提交
        </Badge>
      </div>

      {!hasRepo ? (
        <Card className="border-muted/60">
          <CardContent className="p-8">
            <PageEmpty
              title="仓库尚未初始化"
              message="初始化后就可以浏览文件、查看提交、创建分支和合并请求。"
              icon={GitBranch}
              action={
                <Button className="gap-2 rounded-full" onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
                  <Plus size={16} />
                  {initMutation.isPending ? '初始化中...' : '初始化仓库'}
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
  const [path, setPath] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);

  const treeQuery = useQuery({ queryKey: ['gitTree', projectId, path], queryFn: () => api.gitTree(projectId, path || undefined) });
  const blobQuery = useQuery({ queryKey: ['gitBlob', projectId, selected], enabled: !!selected, queryFn: () => api.gitBlob(projectId, selected!) });

  if (treeQuery.isLoading) return <PageLoading label="正在加载文件列表..." />;
  if (treeQuery.isError) return <PageError title="文件列表加载失败" onRetry={() => treeQuery.refetch()} />;

  const entries = (treeQuery.data || []).slice().sort((left, right) => (left.type === right.type ? left.name.localeCompare(right.name) : left.type === 'directory' ? -1 : 1));
  const breadcrumb = path ? path.split('/').filter(Boolean) : [];
  const latest = detail.commits?.[0];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-muted/60">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4 border-b bg-muted/10 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{latest?.message || '暂无提交说明'}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {latest?.authorName || '未知成员'} · {latest?.createdAt || '未知时间'}
              </div>
            </div>
            {latest?.hash ? <code className="shrink-0 rounded bg-muted px-2 py-1 text-[11px]">{latest.hash.slice(0, 10)}</code> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b bg-white px-4 py-3">
            <Button size="sm" variant="outline" className="h-7 rounded-full" onClick={() => { setPath(''); setSelected(null); }}>
              根目录
            </Button>
            {breadcrumb.map((segment, index) => {
              const nextPath = breadcrumb.slice(0, index + 1).join('/');
              return (
                <Button key={nextPath} size="sm" variant="outline" className="h-7 rounded-full" onClick={() => { setPath(nextPath); setSelected(null); }}>
                  {segment}
                </Button>
              );
            })}
            <div className="ml-auto text-xs text-muted-foreground">
              当前路径：<code className="rounded bg-muted px-1 py-0.5">{path || '/'}</code>
            </div>
          </div>

          <div className="bg-white">
            <table className="w-full text-sm">
              <thead className="bg-muted/10 text-xs text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:font-medium">
                  <th className="text-left">名称</th>
                  <th className="hidden text-left md:table-cell">最近说明</th>
                  <th className="hidden w-[180px] text-right lg:table-cell">更新时间</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry) => {
                  const isDirectory = entry.type === 'directory';
                  return (
                    <tr key={entry.path} className={cn('transition-colors hover:bg-muted/20', selected === entry.path ? 'bg-primary/5' : '')}>
                      <td className="px-4 py-2">
                        <button
                          className="flex w-full min-w-0 items-center gap-2 text-left"
                          onClick={() => {
                            if (isDirectory) {
                              setPath(entry.path);
                              setSelected(null);
                              return;
                            }
                            setSelected(entry.path);
                          }}
                        >
                          {isDirectory ? <Folder size={16} className="shrink-0 text-muted-foreground" /> : <File size={16} className="shrink-0 text-muted-foreground" />}
                          <span className={cn('truncate', isDirectory ? 'font-semibold text-foreground' : 'text-foreground')}>{entry.name}</span>
                        </button>
                      </td>
                      <td className="hidden px-4 py-2 text-muted-foreground md:table-cell">{latest?.message || '暂无提交说明'}</td>
                      <td className="hidden px-4 py-2 text-right text-muted-foreground lg:table-cell">{latest?.createdAt || '未知时间'}</td>
                    </tr>
                  );
                })}
                {!entries.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      当前目录为空。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-muted/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText size={16} />
              文件预览
            </CardTitle>
            <Badge variant="outline" className="rounded-full opacity-80">
              {selected || '尚未选择文件'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!selected ? (
            <PageEmpty title="请选择一个文件" message="点击上方文件列表即可预览内容，点击目录可继续进入子目录。" icon={FileText} />
          ) : blobQuery.isLoading ? (
            <PageLoading label="正在加载文件内容..." />
          ) : blobQuery.isError ? (
            <PageError title="文件预览失败" onRetry={() => blobQuery.refetch()} />
          ) : blobQuery.data?.binary ? (
            <div className="text-sm text-muted-foreground">当前文件为二进制文件，暂不支持在线预览。</div>
          ) : (
            <pre className="overflow-auto rounded-2xl border bg-muted/20 p-4 text-xs leading-relaxed">
              <code>{blobQuery.data?.content || ''}</code>
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
  const [tokenName, setTokenName] = React.useState('我的电脑');
  const [expiresDays, setExpiresDays] = React.useState<number | ''>(30);

  const cloneInfoQuery = useQuery({ queryKey: ['gitCloneInfo', projectId], enabled: open, queryFn: () => api.gitCloneInfo(projectId) });
  const tokensQuery = useQuery({ queryKey: ['gitTokens'], enabled: open && showTokens, queryFn: () => api.gitTokens() });

  const createTokenMutation = useMutation({
    mutationFn: () => api.createGitToken({ name: tokenName.trim(), expiresInDays: expiresDays === '' ? undefined : Number(expiresDays) }),
    onSuccess: async (result) => {
      setTokenPlain(result.token);
      await tokensQuery.refetch();
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: (id: number) => api.revokeGitToken(id),
    onSuccess: async () => {
      await tokensQuery.refetch();
    },
  });

  const cloneUrl = cloneInfoQuery.data?.httpUrl || '';

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setTokenPlain(null);
          setShowTokens(false);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 rounded-full" />}>
        <ExternalLink size={14} />
        获取克隆地址
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[720px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} />
            仓库克隆与推送
          </DialogTitle>
        </DialogHeader>

        {cloneInfoQuery.isLoading ? (
          <div className="py-8 text-sm text-muted-foreground">正在生成仓库地址...</div>
        ) : cloneInfoQuery.isError ? (
          <div className="py-8 text-sm text-destructive">获取仓库地址失败，请稍后重试。</div>
        ) : (
          <div className="space-y-5 py-2">
            <section className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <div>
                <div className="text-sm font-semibold">仓库地址</div>
                <div className="mt-1 text-xs text-muted-foreground">复制下面的 HTTPS 地址，在本地终端执行克隆或推送。</div>
              </div>
              <div className="space-y-2">
                <div className="rounded-2xl border bg-background px-4 py-3 font-mono text-sm break-all">{cloneUrl || '暂无仓库地址'}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>当前项目：{projectName}</span>
                  <span>·</span>
                  <span>默认分支：{cloneInfoQuery.data?.defaultBranch || 'main'}</span>
                </div>
              </div>
              <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => copy(cloneUrl)} disabled={!cloneUrl}>
                <Copy size={14} />
                复制地址
              </Button>
            </section>

            <section className="space-y-3 rounded-2xl border p-4">
              <div className="text-sm font-semibold">本地使用方式</div>
              <div className="rounded-2xl border bg-muted/10 px-4 py-3 font-mono text-sm break-all">{cloneUrl ? `git clone ${cloneUrl}` : 'git clone <仓库地址>'}</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>1. 首次克隆时直接使用上面的地址。</div>
                <div>2. 如果 Git 提示输入认证信息，用户名填写你的登录邮箱。</div>
                <div>3. 密码可以填写登录密码，或者使用下方创建的 Git 访问令牌。</div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Git 访问令牌</div>
                  <div className="mt-1 text-xs text-muted-foreground">如果不想直接暴露登录密码，可以创建一个专用令牌用于 clone 和 push。</div>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowTokens((value) => !value)}>
                  {showTokens ? '收起令牌管理' : '展开令牌管理'}
                </Button>
              </div>

              {showTokens ? (
                <div className="space-y-4">
                  {tokenPlain ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="text-sm font-semibold text-primary">新令牌已生成，仅展示一次，请及时保存。</div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input readOnly value={tokenPlain} className="font-mono" />
                        <Button type="button" variant="outline" className="rounded-full sm:shrink-0" onClick={() => copy(tokenPlain)}>
                          <Copy size={14} />
                          复制令牌
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
                    <div className="space-y-2">
                      <Label>令牌名称</Label>
                      <Input value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="例如：我的电脑 / CI 环境" />
                    </div>
                    <div className="space-y-2">
                      <Label>有效天数</Label>
                      <Input value={expiresDays} onChange={(event) => setExpiresDays(event.target.value ? Number(event.target.value) : '')} placeholder="例如：30" inputMode="numeric" />
                    </div>
                  </div>

                  <Button type="button" className="w-full rounded-full" onClick={() => createTokenMutation.mutate()} disabled={!tokenName.trim() || createTokenMutation.isPending}>
                    <Plus size={16} />
                    {createTokenMutation.isPending ? '创建中...' : '创建令牌'}
                  </Button>

                  <div className="overflow-hidden rounded-2xl border">
                    <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">已创建令牌列表</div>
                    <div className="divide-y">
                      {tokensQuery.isLoading ? <div className="p-4 text-sm text-muted-foreground">正在加载令牌...</div> : null}
                      {!tokensQuery.isLoading && !(tokensQuery.data || []).length ? <div className="p-4 text-sm text-muted-foreground">还没有创建过令牌，按需创建即可。</div> : null}
                      {(tokensQuery.data || []).map((token) => (
                        <div key={token.id} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{token.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              前缀 <code className="rounded bg-muted px-1 py-0.5">{token.prefix}</code>
                              {token.lastUsedAt ? ` · 最近使用 ${token.lastUsedAt}` : ''}
                              {token.expiresAt ? ` · 到期 ${token.expiresAt}` : ''}
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => revokeTokenMutation.mutate(token.id)} disabled={revokeTokenMutation.isPending}>
                            撤销
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
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
        <PageEmpty title="暂无提交记录" message="仓库产生提交后，这里会展示完整的提交历史。" icon={GitCommit} />
      ) : (
        <div className="space-y-3">
          {commits.map((commit) => (
            <Card key={commit.hash} className="border-muted/70">
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold">{commit.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {commit.authorName} · {commit.createdAt} · 分支 <code className="rounded bg-muted px-1 py-0.5">{commit.branch}</code>
                  </div>
                </div>
                <code className="shrink-0 rounded bg-muted px-2 py-1 text-[11px]">{commit.hash}</code>
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
      <div className="mb-4 flex justify-end">
        <CreateBranchButton projectId={projectId} onDone={onDone} />
      </div>
      {!branches.length ? (
        <PageEmpty title="暂无分支" message="初始化仓库后会先出现默认分支。" icon={GitBranch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch} className="border-muted/70">
              <CardContent className="flex items-center justify-between py-4">
                <div className="text-sm font-semibold">{branch}</div>
                <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
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
  const mergeRequests = detail.mergeRequests || [];
  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <CreateMrButton projectId={projectId} branches={branches} onDone={onDone} />
      </div>
      {!mergeRequests.length ? (
        <PageEmpty title="暂无合并请求" message="在分支开发完成后，可以创建合并请求发起评审与合并。" icon={GitMerge} />
      ) : (
        <div className="space-y-3">
          {mergeRequests.map((item) => (
            <Card key={item.id} className="border-muted/70">
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.sourceBranch} → {item.targetBranch}
                  </div>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBranchButton({ projectId, onDone }: { projectId: number; onDone: () => Promise<void> }) {
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const mutation = useMutation({
    mutationFn: () => api.createBranch(projectId, name.trim()),
    onSuccess: async () => {
      setOpen(false);
      setName('');
      await onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 rounded-full" />}>
        <Plus size={14} />
        新建分支
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建分支</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>分支名称</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：feature/login-ui" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>取消</Button>
          <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? '创建中...' : '创建'}</Button>
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
  }, [branches]);

  const mutation = useMutation({
    mutationFn: () => api.createMergeRequest({ projectId, title: title.trim(), sourceBranch: source, targetBranch: target }),
    onSuccess: async () => {
      setOpen(false);
      setTitle('');
      await onDone();
    },
  });

  const canSubmit = !!title.trim() && !!source && !!target && source !== target;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 rounded-full" />}>
        <Plus size={14} />
        新建合并请求
      </DialogTrigger>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>新建合并请求</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>标题</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：完成登录页中文化与路由整理" />
          </div>
          <div className="space-y-2">
            <Label>源分支</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>目标分支</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!canSubmit ? <div className="text-[11px] text-muted-foreground md:col-span-2">源分支和目标分支不能相同。</div> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>取消</Button>
          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? '创建中...' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
