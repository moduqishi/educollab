import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectRepositoryExplorer } from '@/components/storage/ProjectRepositoryExplorer';
import { ProjectSystemExplorer } from '@/components/storage/ProjectSystemExplorer';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';

export function ProjectFilesPage() {
  const api = useApi();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { detail, refresh } = useProjectDetail();
  const [space, setSpace] = React.useState<'FILES' | 'REPOSITORY' | 'SYSTEM'>('FILES');
  const canViewSystem = session?.profile.role === 'ADMIN';

  React.useEffect(() => setTitle([detail.project.name, '文件']), [detail.project.name]);

  const createNoteM = useMutation({
    mutationFn: () => api.createDocument({ projectId: detail.project.id, title: '未命名协作文档', currentContent: '' }),
    onSuccess: async (doc) => {
      await refresh();
      navigate(`/app/projects/${detail.project.id}/documents/${doc.id}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">项目文件工作台</div>
            <div className="mt-1 text-sm text-muted-foreground">统一浏览项目 files、repository 与 system（仅管理员）的 Explorer 工作台。</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={space === 'FILES' ? 'default' : 'outline'} size="sm" onClick={() => setSpace('FILES')}>文件</Button>
            <Button variant={space === 'REPOSITORY' ? 'default' : 'outline'} size="sm" onClick={() => setSpace('REPOSITORY')}>仓库</Button>
            {canViewSystem ? <Button variant={space === 'SYSTEM' ? 'default' : 'outline'} size="sm" onClick={() => setSpace('SYSTEM')}>系统</Button> : null}
            {detail.project && detail.currentUserCanEdit && space === 'FILES' ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => createNoteM.mutate()} disabled={createNoteM.isPending}>
                <Plus size={14} />
                <FileText size={14} />
                {createNoteM.isPending ? '新建中...' : '新建协作文档'}
              </Button>
            ) : null}
            {detail.currentUserCanEdit ? <Badge variant="outline">项目成员可管理 files</Badge> : <Badge variant="secondary">当前为只读</Badge>}
          </div>
        </div>
        {!canViewSystem ? (
          <div className="mt-3 text-xs text-muted-foreground">仓库为只读代码树；system 原始目录默认仅管理员可见。</div>
        ) : null}
      </div>

      {space === 'FILES' ? (
        <StorageWorkspace
          scopeType="PROJECT"
          scopeId={detail.project.id}
          title="项目文件"
          description="统一管理普通文件、协作文档与 Office 文件，像资源管理器一样在项目目录中进行操作。"
        />
      ) : space === 'REPOSITORY' ? (
        <ProjectRepositoryExplorer projectId={detail.project.id} />
      ) : canViewSystem ? (
        <ProjectSystemExplorer projectId={detail.project.id} />
      ) : (
        <StorageWorkspace
          scopeType="PROJECT"
          scopeId={detail.project.id}
          title="项目文件"
          description="统一管理普通文件、协作文档与 Office 文件，像资源管理器一样在项目目录中进行操作。"
        />
      )}
    </div>
  );
}
