import React from 'react';
import { setTitle } from '@/app/title';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { useTeamDetail } from './TeamDetailLayout';

export function TeamFilesTabPage() {
  const { detail } = useTeamDetail();

  React.useEffect(() => {
    setTitle([detail.name, '团队文件']);
  }, [detail.name]);

  return (
    <StorageWorkspace
      scopeType="TEAM"
      scopeId={detail.id}
      title="团队文件"
      description="团队成员可以像使用网盘一样管理共享文件，并从这里继续进入下游项目目录。"
    />
  );
}
