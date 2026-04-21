import React from 'react';
import { setTitle } from '@/app/title';
import { StorageWorkspace } from '@/components/storage/StorageWorkspace';
import { useClassDetail } from './ClassDetailLayout';

export function ClassFilesTabPage() {
  const { detail } = useClassDetail();

  React.useEffect(() => {
    setTitle([detail.classInfo.name, '课程文件']);
  }, [detail.classInfo.name]);

  return (
    <StorageWorkspace
      scopeType="COURSE"
      scopeId={detail.classInfo.id}
      title="课程文件"
      description="课程根空间仅教师/管理员可上传与管理，学生可以浏览课程共享资料。"
    />
  );
}
