import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, FolderOpen, FolderTree, GitBranch, HardDrive, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { ProjectRepositoryExplorer } from '@/components/storage/ProjectRepositoryExplorer';
import { ProjectSystemExplorer } from '@/components/storage/ProjectSystemExplorer';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { AdminBreadcrumbs, AdminInfoRow, AdminPageIntro, AdminPanel } from './admin-layout';
import type { AdminStorageTreeRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

type SpaceKind = 'FILES' | 'REPOSITORY' | 'SYSTEM';

type NavNode = {
  key: string;
  title: string;
  subtitle?: string;
  kind: 'root' | 'course' | 'team' | 'project' | 'space';
  space?: SpaceKind;
  courseId?: number | null;
  teamId?: number | null;
  projectId?: number | null;
  fileCount?: number | null;
  repoCount?: number | null;
  logCount?: number | null;
  children: NavNode[];
};

export function AdminStoragePage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = React.useState('');

  React.useEffect(() => {
    setTitle(['系统管理', '文件与存储']);
  }, []);

  const treeQ = useQuery({ queryKey: ['adminStorageTree'], queryFn: () => api.adminStorageTree() });
  const migrateM = useMutation({
    mutationFn: () => api.adminMigrateStorage(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminStorageTree'] });
    },
  });
  const scanM = useMutation({ mutationFn: () => api.adminScanStorage() });

  const explorerTree = React.useMemo(() => buildTree(treeQ.data || []), [treeQ.data]);
  const nodeMap = React.useMemo(() => flattenNodes(explorerTree), [explorerTree]);

  const selectedKey = searchParams.get('node') || explorerTree.children[0]?.key || 'root';
  const selected = nodeMap.get(selectedKey) || explorerTree;
  const filterText = keyword.trim().toLowerCase();

  if (treeQ.isLoading) return <PageLoading label="正在加载管理员 Explorer..." />;
  if (treeQ.isError) return <PageError title="管理员存储页加载失败" onRetry={() => treeQ.refetch()} />;

  const breadcrumbs = resolveBreadcrumbs(selected, nodeMap);

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1860px] space-y-6">
        <AdminPageIntro
          eyebrow="管理员后台 / 文件与存储"
          title="Storage Explorer"
          description="按课程 → 团队 → 项目进入文件空间、代码仓库与 system 目录，不再把文件、仓库、日志平铺成三张列表。"
          badges={(
            <>
              <Badge variant="outline">课程 {treeQ.data?.length || 0}</Badge>
              {scanM.data?.warnings?.length ? <Badge variant="secondary">异常提示 {scanM.data.warnings.length}</Badge> : null}
            </>
          )}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => scanM.mutate()} disabled={scanM.isPending}>
                <ShieldCheck size={14} />
                {scanM.isPending ? '扫描中...' : '扫描异常'}
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => migrateM.mutate()} disabled={migrateM.isPending}>
                <RefreshCcw size={14} />
                {migrateM.isPending ? '迁移中...' : '迁移旧文件'}
              </Button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AdminPanel title="结构树" description="先选课程，再进入团队和项目；项目下面再区分 files / repository / system。" contentClassName="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="过滤课程 / 团队 / 项目" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="max-h-[calc(100vh-260px)] overflow-auto pr-1">
              <NavTree node={explorerTree} selectedKey={selectedKey} filterText={filterText} onSelect={(node) => setSearchParams({ node: node.key })} />
            </div>
          </AdminPanel>

          <div className="space-y-6">
            <AdminPanel title="当前位置" description="Explorer 当前选中的课程 / 团队 / 项目 / 空间。" contentClassName="space-y-4">
              <AdminBreadcrumbs items={breadcrumbs.map((node) => ({ label: node.title, active: node.key === selected.key, onClick: node.key === selected.key ? undefined : () => setSearchParams({ node: node.key }) }))} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <AdminInfoRow label="节点" value={selected.title} />
                <AdminInfoRow label="文件" value={selected.fileCount ?? 0} />
                <AdminInfoRow label="仓库" value={selected.repoCount ?? 0} />
                <AdminInfoRow label="日志" value={selected.logCount ?? 0} />
              </div>
              {'subtitle' in selected && selected.subtitle ? <div className="text-sm text-muted-foreground">{selected.subtitle}</div> : null}
            </AdminPanel>

            {renderSelectedNode(selected, navigate, setSearchParams)}

            {scanM.data?.warnings?.length ? (
              <AdminPanel title="异常扫描结果" description="只有异常对象才应该进入这里，而不是默认主视图。">
                <div className="space-y-2 text-sm text-muted-foreground">{scanM.data.warnings.map((warning, index) => <div key={`${warning}-${index}`} className="rounded-2xl border px-4 py-3">{warning}</div>)}</div>
              </AdminPanel>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSelectedNode(selected: NavNode, navigate: ReturnType<typeof useNavigate>, setSearchParams: ReturnType<typeof useSearchParams>[1]) {
  if (selected.kind === 'space') {
    if (selected.space === 'FILES') {
      const scopeType = selected.projectId ? 'PROJECT' : selected.teamId ? 'TEAM' : 'COURSE';
      const scopeId = selected.projectId || selected.teamId || selected.courseId;
      if (!scopeId) return null;
      return (
        <StorageWorkspace
          scopeType={scopeType}
          scopeId={scopeId}
          title={`${selected.title} Explorer`}
          description={selected.projectId ? '项目 files 空间可管理普通文件；仓库与 system 继续在各自的只读 Explorer 中浏览。' : selected.teamId ? '团队文件空间支持像网盘一样管理共享文件夹。' : '课程文件空间只允许教师 / 管理员管理，学生只读。'}
        />
      );
    }
    if (selected.space === 'REPOSITORY' && selected.projectId) {
      return <ProjectRepositoryExplorer projectId={selected.projectId} title="项目仓库 Explorer" description="代码仓库以树状结构浏览，保持只读。" />;
    }
    if (selected.space === 'SYSTEM' && selected.projectId) {
      return <ProjectSystemExplorer projectId={selected.projectId} title="项目 system Explorer" description="system 目录只读显示 activity-logs、summary-cache 与 audit。" />;
    }
  }

  const children = selected.children || [];
  return (
    <AdminPanel title="下级结构" description="继续按层级进入下级对象或空间，而不是平铺搜索。">
      {!children.length ? (
        <PageEmpty title="当前没有下级结构" message="请返回上一层，或进入该对象的详情页维护结构。" icon={Database} />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {children.map((child) => (
            <button key={child.key} type="button" onClick={() => setSearchParams({ node: child.key })} className="rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">{iconForNode(child)}<span className="truncate">{child.title}</span></div>
                  <div className="mt-2 text-xs text-muted-foreground">{child.subtitle || summarizeNode(child)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {selected.projectId ? <Button variant="outline" size="sm" onClick={() => navigate(`/app/admin/projects/${selected.projectId}/overview`)}>打开项目详情</Button> : null}
        {selected.teamId ? <Button variant="outline" size="sm" onClick={() => navigate(`/app/admin/teams/${selected.teamId}/overview`)}>打开团队详情</Button> : null}
        {selected.courseId ? <Button variant="outline" size="sm" onClick={() => navigate(`/app/admin/courses/${selected.courseId}/overview`)}>打开课程详情</Button> : null}
      </div>
    </AdminPanel>
  );
}

function buildTree(records: AdminStorageTreeRecord[]): NavNode {
  return {
    key: 'root',
    title: '全部存储',
    kind: 'root',
    children: records.map(toNode),
  };
}

function toNode(record: AdminStorageTreeRecord): NavNode {
  const base: NavNode = {
    key: record.nodeKey,
    title: record.title,
    subtitle: record.subtitle || undefined,
    kind: record.nodeType === 'COURSE' ? 'course' : record.nodeType === 'TEAM' ? 'team' : 'project',
    courseId: record.courseId,
    teamId: record.teamId,
    projectId: record.projectId,
    fileCount: record.fileCount,
    repoCount: record.repoCount,
    logCount: record.logCount,
    children: [],
  };

  if (base.kind === 'course') {
    base.children.push(makeSpaceNode(base, 'FILES', '课程文件'));
  }
  if (base.kind === 'team') {
    base.children.push(makeSpaceNode(base, 'FILES', '团队文件'));
  }
  if (base.kind === 'project') {
    base.children.push(makeSpaceNode(base, 'FILES', '项目文件'));
    base.children.push(makeSpaceNode(base, 'REPOSITORY', 'repository'));
    base.children.push(makeSpaceNode(base, 'SYSTEM', 'system'));
  }
  base.children.push(...(record.children || []).map(toNode));
  return base;
}

function makeSpaceNode(parent: NavNode, space: SpaceKind, title: string): NavNode {
  return {
    key: `${parent.key}-${space.toLowerCase()}`,
    title,
    subtitle: space === 'FILES' ? '可管理文件空间' : space === 'REPOSITORY' ? '只读代码树' : '只读系统目录',
    kind: 'space',
    space,
    courseId: parent.courseId,
    teamId: parent.teamId,
    projectId: parent.projectId,
    fileCount: space === 'FILES' ? parent.fileCount : 0,
    repoCount: space === 'REPOSITORY' ? parent.repoCount : 0,
    logCount: space === 'SYSTEM' ? parent.logCount : 0,
    children: [],
  };
}

function flattenNodes(root: NavNode) {
  const map = new Map<string, NavNode>();
  const walk = (node: NavNode) => {
    map.set(node.key, node);
    node.children.forEach(walk);
  };
  walk(root);
  return map;
}

function resolveBreadcrumbs(node: NavNode, map: Map<string, NavNode>) {
  const items: NavNode[] = [];
  let current: NavNode | undefined = node;
  while (current) {
    items.unshift(current);
    current = findParent(current.key, map);
  }
  return items;
}

function findParent(key: string, map: Map<string, NavNode>) {
  for (const [, node] of map) {
    if (node.children.some((child) => child.key === key)) return node;
  }
  return undefined;
}

function NavTree({ node, selectedKey, filterText, onSelect, depth = 0 }: { node: NavNode; selectedKey: string; filterText: string; onSelect: (node: NavNode) => void; depth?: number }) {
  if (node.key !== 'root' && !matchesNode(node, filterText)) return null;
  const children = node.children.filter((child) => matchesNode(child, filterText));
  return (
    <div className={depth === 0 ? 'space-y-1' : 'space-y-1 border-l border-muted pl-3'}>
      {node.key !== 'root' ? (
        <button type="button" className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40', selectedKey === node.key && 'bg-primary/8 text-primary')} onClick={() => onSelect(node)}>
          {iconForNode(node)}
          <span className="truncate">{node.title}</span>
        </button>
      ) : null}
      {children.map((child) => <NavTree key={child.key} node={child} selectedKey={selectedKey} filterText={filterText} onSelect={onSelect} depth={depth + 1} />)}
    </div>
  );
}

function matchesNode(node: NavNode, filterText: string) {
  if (!filterText) return true;
  if (`${node.title} ${node.subtitle || ''}`.toLowerCase().includes(filterText)) return true;
  return node.children.some((child) => matchesNode(child, filterText));
}

function iconForNode(node: NavNode) {
  if (node.kind === 'course') return <FolderTree size={15} className="shrink-0 text-muted-foreground" />;
  if (node.kind === 'team') return <FolderOpen size={15} className="shrink-0 text-muted-foreground" />;
  if (node.kind === 'project') return <HardDrive size={15} className="shrink-0 text-muted-foreground" />;
  if (node.space === 'REPOSITORY') return <GitBranch size={15} className="shrink-0 text-muted-foreground" />;
  if (node.space === 'SYSTEM') return <Database size={15} className="shrink-0 text-muted-foreground" />;
  return <FolderOpen size={15} className="shrink-0 text-muted-foreground" />;
}

function summarizeNode(node: NavNode) {
  const parts = [node.fileCount ? `文件 ${node.fileCount}` : null, node.repoCount ? `仓库 ${node.repoCount}` : null, node.logCount ? `日志 ${node.logCount}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : '继续进入下级目录';
}
