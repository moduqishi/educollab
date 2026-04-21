import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  File,
  FileText,
  Folder,
  FolderOpen,
  Move,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import type { StorageEntryRecord, StorageTreeNodeRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

type ScopeType = 'COURSE' | 'TEAM' | 'PROJECT';

export function StorageWorkspace({
  scopeType,
  scopeId,
  title,
  description,
  extraActions,
}: {
  scopeType: ScopeType;
  scopeId: number;
  title: string;
  description: string;
  extraActions?: React.ReactNode;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [currentFolderPath, setCurrentFolderPath] = React.useState('');
  const [keyword, setKeyword] = React.useState('');
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');
  const [renameValue, setRenameValue] = React.useState('');
  const [targetFolderPath, setTargetFolderPath] = React.useState('');

  const workspaceQ = useQuery({
    queryKey: ['storageWorkspace', scopeType, scopeId],
    queryFn: () => api.storageWorkspace(scopeType, scopeId),
  });

  React.useEffect(() => {
    if (workspaceQ.data && currentFolderPath === '') {
      setCurrentFolderPath(workspaceQ.data.rootPath || '');
    }
  }, [currentFolderPath, workspaceQ.data]);

  const folderQ = useQuery({
    queryKey: ['storageFolder', scopeType, scopeId, currentFolderPath],
    enabled: !!workspaceQ.data,
    queryFn: () => api.storageFolder(scopeType, scopeId, currentFolderPath),
  });

  const workspace = workspaceQ.data;
  const folder = folderQ.data;
  const currentFolderReadOnly = !!folder?.readOnly;
  const rows = React.useMemo(
    () =>
      (folder?.entries || []).filter((entry) => {
        const text = keyword.trim().toLowerCase();
        if (!text) return true;
        return `${entry.name} ${entry.relativePath}`.toLowerCase().includes(text);
      }),
    [folder?.entries, keyword],
  );
  const allChecked = rows.length > 0 && rows.every((entry) => selectedPaths.includes(entry.path));
  const selectedEntries = (folder?.entries || []).filter((entry) => selectedPaths.includes(entry.path));
  const singleSelected = selectedEntries.length === 1 ? selectedEntries[0] : null;
  const flatFolders = React.useMemo(
    () => flattenFolders(workspace?.tree || [], workspace?.rootPath || '', '根目录'),
    [workspace?.rootPath, workspace?.tree],
  );

  React.useEffect(() => {
    if (renameOpen && singleSelected) {
      setRenameValue(singleSelected.name);
    }
  }, [renameOpen, singleSelected]);

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['storageWorkspace', scopeType, scopeId] }),
      qc.invalidateQueries({ queryKey: ['storageFolder', scopeType, scopeId, currentFolderPath] }),
    ]);
  };

  const createFolderM = useMutation({
    mutationFn: () => api.createStorageFolder({ scopeType, scopeId, parentPath: currentFolderPath, name: folderName.trim() }),
    onSuccess: async () => {
      setCreateOpen(false);
      setFolderName('');
      await refreshAll();
    },
  });

  const renameM = useMutation({
    mutationFn: () => api.renameStorageEntry(scopeType, scopeId, selectedPaths[0], (renameValue || singleSelected?.name || '').trim()),
    onSuccess: async () => {
      setRenameOpen(false);
      setRenameValue('');
      setSelectedPaths([]);
      await refreshAll();
    },
  });

  const moveM = useMutation({
    mutationFn: async () => {
      if (selectedPaths.length === 1) return api.moveStorageEntry(scopeType, scopeId, selectedPaths[0], targetFolderPath);
      return api.batchMoveStorageEntries(scopeType, scopeId, selectedPaths, targetFolderPath);
    },
    onSuccess: async () => {
      setMoveOpen(false);
      setTargetFolderPath('');
      setSelectedPaths([]);
      await refreshAll();
    },
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      if (selectedPaths.length === 1) return api.deleteStorageEntry(scopeType, scopeId, selectedPaths[0]);
      return api.batchDeleteStorageEntries(scopeType, scopeId, selectedPaths);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedPaths([]);
      await refreshAll();
    },
  });

  const uploadM = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await api.uploadStorageFile(scopeType, scopeId, currentFolderPath, file);
      }
    },
    onSuccess: async () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshAll();
    },
  });

  const openEntryM = useMutation({
    mutationFn: async (entry: StorageEntryRecord) => {
      if (entry.openPath) {
        return entry.openPath;
      }
      if (isDocumentEntry(entry)) {
        if (scopeType !== 'PROJECT' || !scopeId) {
          throw new Error('当前仅项目空间支持直接打开该文档');
        }
        const doc = await api.ensureDocumentFromProjectFile(scopeId, entry.path);
        return `/app/projects/${doc.projectId}/documents/${doc.id}`;
      }
      return buildFileViewerPath(scopeType, scopeId, entry);
    },
    onSuccess: (path) => {
      navigate(path);
    },
  });

  if (workspaceQ.isLoading || folderQ.isLoading) {
    return <PageLoading label="正在加载文件空间..." />;
  }
  if (workspaceQ.isError || folderQ.isError) {
    return <PageError title="文件空间加载失败" onRetry={() => { void workspaceQ.refetch(); void folderQ.refetch(); }} />;
  }
  if (!workspace || !folder) {
    return <PageEmpty title="文件空间为空" message="当前空间还没有可展示的文件结构。" icon={Folder} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <div className="rounded-3xl border bg-white p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        </div>
        <div className="space-y-2">
          <TreeNode
            path={workspace.rootPath}
            name={workspace.scopeName}
            nodes={workspace.tree}
            currentFolderPath={currentFolderPath}
            onSelect={setCurrentFolderPath}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{folder.folderName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {folder.breadcrumbs.map((crumb) => (
                  <button key={crumb.path || '__root__'} type="button" className="rounded-full border px-2 py-1 hover:bg-muted/40" onClick={() => setCurrentFolderPath(crumb.path)}>
                    {crumb.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {extraActions}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!workspace.toolbar.canCreateFolder || currentFolderReadOnly}>
                <Plus size={14} /> 新建文件夹
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={!workspace.toolbar.canUpload || currentFolderReadOnly}>
                <Upload size={14} /> 上传文件
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setRenameOpen(true)} disabled={!singleSelected || !singleSelected.editable}>
                <Pencil size={14} /> 重命名
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setTargetFolderPath(currentFolderPath); setMoveOpen(true); }} disabled={!selectedEntries.length || !selectedEntries.every((item) => item.movable)}>
                <Move size={14} /> 移动
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadSelected(api, scopeType, scopeId, selectedEntries)} disabled={!selectedEntries.length || !selectedEntries.every((item) => item.downloadable)}>
                <Download size={14} /> 下载
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setDeleteOpen(true)} disabled={!selectedEntries.length || !selectedEntries.every((item) => item.deletable)}>
                <Trash2 size={14} /> 删除
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => { void refreshAll(); }}>
                <RefreshCcw size={14} />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length) uploadM.mutate(files);
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Search size={14} className="text-muted-foreground" />
            <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索当前目录文件..." />
            <Badge variant="outline">已选 {selectedPaths.length}</Badge>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-0 overflow-hidden">
          {!rows.length ? (
            <div className="p-8">
              <PageEmpty title="当前目录为空" message={currentFolderReadOnly ? '当前聚合目录下暂时没有文档。' : '可以新建文件夹、上传文件，或切换到其他目录。'} icon={FolderOpen} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                    <th className="px-3 py-3 w-10">
                      <Checkbox checked={allChecked} onCheckedChange={(checked) => setSelectedPaths(checked ? rows.map((entry) => entry.path) : [])} />
                    </th>
                    <th className="px-3 py-3 font-medium">名称</th>
                    <th className="px-3 py-3 font-medium">类型</th>
                    <th className="px-3 py-3 font-medium">所属项目</th>
                    <th className="px-3 py-3 font-medium">大小</th>
                    <th className="px-3 py-3 font-medium">修改时间</th>
                    <th className="px-3 py-3 font-medium">修改者</th>
                    <th className="px-3 py-3 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr key={entry.path} className="border-b last:border-b-0 hover:bg-muted/10">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selectedPaths.includes(entry.path)}
                          onCheckedChange={(checked) =>
                            setSelectedPaths((current) => checked ? Array.from(new Set([...current, entry.path])) : current.filter((item) => item !== entry.path))
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left"
                          onClick={() => {
                            if (entry.nodeType !== 'FILE' && entry.entryKind !== 'DOCUMENT') {
                              setCurrentFolderPath(entry.path);
                              setSelectedPaths([]);
                              return;
                            }
                            if (entry.nodeType === 'FILE') {
                              openEntryM.mutate(entry);
                              return;
                            }
                            if (entry.openPath) navigate(entry.openPath);
                          }}
                        >
                          {entry.nodeType === 'FILE' ? (
                            entry.entryKind === 'DOCUMENT' ? <FileText size={16} className="text-primary" /> : <File size={16} className="text-muted-foreground" />
                          ) : (
                            <Folder size={16} className="text-amber-500" />
                          )}
                          <span className="font-medium">{entry.name}</span>
                          {entry.systemManaged ? <Badge variant="secondary">系统</Badge> : null}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {entry.entryKind === 'DOCUMENT'
                          ? entry.documentKind === 'OFFICE'
                            ? `Office · ${(entry.officeExt || 'file').toUpperCase()}`
                            : 'Markdown'
                          : entry.nodeType === 'FILE'
                            ? '文件'
                            : '文件夹'}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.projectName || '—'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatBytes(entry.sizeBytes || 0)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.updatedAt || '—'}</td>
                      <td className="px-3 py-3 text-muted-foreground">{entry.modifiedByName || '—'}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {entry.nodeType === 'FILE' ? (
                            <Button size="sm" variant="outline" onClick={() => openEntryM.mutate(entry)} disabled={openEntryM.isPending}>
                              {isOfficeEntry(entry) ? '编辑' : '打开'}
                            </Button>
                          ) : entry.openPath ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(entry.openPath)}>
                              打开
                            </Button>
                          ) : entry.nodeType !== 'FILE' ? (
                            <Button size="sm" variant="outline" onClick={() => setCurrentFolderPath(entry.path)}>
                              进入
                            </Button>
                          ) : null}
                          {entry.downloadable ? (
                            <Button size="sm" variant="outline" onClick={() => window.open(api.downloadStorageEntryUrl(scopeType, scopeId, entry.path), '_blank')}>
                              下载
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border bg-white p-4">
          <div className="text-sm font-semibold">属性面板</div>
          {!singleSelected ? (
            <div className="mt-3 text-sm text-muted-foreground">选择一个文件或文件夹后，可查看详细信息。</div>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <InfoRow label="名称" value={singleSelected.name} />
              <InfoRow label="类型" value={singleSelected.entryKind === 'DOCUMENT' ? (singleSelected.documentKind === 'OFFICE' ? `Office · ${(singleSelected.officeExt || 'file').toUpperCase()}` : 'Markdown') : singleSelected.nodeType === 'FILE' ? '文件' : '文件夹'} />
              <InfoRow label="路径" value={singleSelected.relativePath || '/'} />
              <InfoRow label="所属项目" value={singleSelected.projectName || '—'} />
              <InfoRow label="大小" value={formatBytes(singleSelected.sizeBytes || 0)} />
              <InfoRow label="最后更新" value={singleSelected.updatedAt || '—'} />
              <InfoRow label="修改者" value={singleSelected.modifiedByName || '—'} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建文件夹</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>文件夹名称</Label>
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={() => createFolderM.mutate()} disabled={!folderName.trim() || createFolderM.isPending}>{createFolderM.isPending ? '创建中...' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>重命名</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>新名称</Label>
            <Input value={renameValue || singleSelected?.name || ''} onChange={(event) => setRenameValue(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>取消</Button>
            <Button onClick={() => renameM.mutate()} disabled={!singleSelected || !(renameValue || singleSelected.name).trim() || renameM.isPending}>{renameM.isPending ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>移动到目录</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>目标目录</Label>
            <div className="max-h-72 overflow-auto rounded-2xl border p-3">
              {flatFolders.map((item) => (
                <button key={item.path || '__root__'} type="button" className={cn('mb-2 flex w-full items-center rounded-xl border px-3 py-2 text-left text-sm', targetFolderPath === item.path && 'border-primary bg-primary/5')} onClick={() => setTargetFolderPath(item.path)}>
                  <Folder size={14} className="mr-2 text-amber-500" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>取消</Button>
            <Button onClick={() => moveM.mutate()} disabled={moveM.isPending}>{moveM.isPending ? '移动中...' : '确认移动'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>删除所选条目</DialogTitle></DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            将删除 {selectedPaths.length} 个条目。此操作不可恢复。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteM.mutate()} disabled={!selectedPaths.length || deleteM.isPending}>{deleteM.isPending ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TreeNode({
  path,
  name,
  nodes,
  currentFolderPath,
  onSelect,
  depth = 0,
}: {
  path: string;
  name: string;
  nodes: StorageTreeNodeRecord[];
  currentFolderPath: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className={cn(depth > 0 && 'ml-4 border-l pl-3')}>
      <button type="button" className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/40', currentFolderPath === path && 'bg-primary/5 text-primary')} onClick={() => onSelect(path)}>
        {path === '@documents' ? <FileText size={14} className="text-primary" /> : <Folder size={14} className="text-amber-500" />}
        <span>{name}</span>
      </button>
      {nodes.map((child) => (
        <TreeNode key={child.path || `${child.name}-${depth + 1}`} path={child.path} name={child.name} nodes={child.children} currentFolderPath={currentFolderPath} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function flattenFolders(nodes: StorageTreeNodeRecord[], rootPath: string, rootName: string, depth = 0) {
  const items: { path: string; label: string }[] = depth === 0 ? [{ path: rootPath, label: rootName }] : [];
  for (const node of nodes) {
    if (node.readOnly || node.entryKind === 'VIRTUAL_FOLDER') continue;
    items.push({ path: node.path, label: `${'　'.repeat(depth)}${node.name}` });
    items.push(...flattenFolders(node.children, rootPath, rootName, depth + 1));
  }
  return items;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border px-3 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value}</div>
    </div>
  );
}

function downloadSelected(api: ReturnType<typeof useApi>, scopeType: ScopeType, scopeId: number, entries: StorageEntryRecord[]) {
  entries.forEach((entry) => {
    if (entry.downloadable) {
      window.open(api.downloadStorageEntryUrl(scopeType, scopeId, entry.path), '_blank');
    }
  });
}

function formatBytes(size: number) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function isDocumentEntry(entry: StorageEntryRecord) {
  return entry.entryKind === 'DOCUMENT';
}

function isOfficeEntry(entry: StorageEntryRecord) {
  return isDocumentEntry(entry) && entry.documentKind === 'OFFICE';
}

function buildFileViewerPath(scopeType: ScopeType, scopeId: number, entry: StorageEntryRecord) {
  const params = new URLSearchParams({
    scopeType,
    scopeId: String(scopeId),
    path: entry.path,
    name: entry.name,
  });
  if (entry.mimeType) params.set('mimeType', entry.mimeType);
  if (entry.updatedAt) params.set('updatedAt', entry.updatedAt);
  if (entry.sizeBytes != null) params.set('sizeBytes', String(entry.sizeBytes));
  if (entry.fileAssetId != null) params.set('fileAssetId', String(entry.fileAssetId));
  if (entry.projectId != null) params.set('projectId', String(entry.projectId));
  if (entry.projectName) params.set('projectName', entry.projectName);
  return `/app/files/view?${params.toString()}`;
}
