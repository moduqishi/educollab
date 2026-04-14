import React from 'react';
import { Overview } from '@/components/ProjectDetail/Overview';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';
import { setTitle } from '@/app/title';

export function ProjectOverviewPage() {
  const { detail } = useProjectDetail();
  React.useEffect(() => setTitle([detail.project.name, '概览']), [detail.project.name]);
  return <Overview detail={detail} />;
}

