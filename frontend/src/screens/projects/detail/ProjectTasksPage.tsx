import React from 'react';
import { Tasks } from '@/components/ProjectDetail/Tasks';
import { useApi } from '@/app/api';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';

export function ProjectTasksPage() {
  const api = useApi();
  const { detail, refresh } = useProjectDetail();
  React.useEffect(() => setTitle([detail.project.name, '任务']), [detail.project.name]);
  return <Tasks api={api} detail={detail} onRefresh={refresh} />;
}

