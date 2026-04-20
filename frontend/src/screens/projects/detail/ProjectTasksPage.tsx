import React from 'react';
import { Tasks } from '@/components/ProjectDetail/Tasks';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';

export function ProjectTasksPage() {
  const { detail } = useProjectDetail();
  React.useEffect(() => setTitle([detail.project.name, '任务']), [detail.project.name]);
  return <Tasks detail={detail} />;
}
