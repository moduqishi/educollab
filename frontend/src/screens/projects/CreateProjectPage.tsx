import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreateProjectView } from '@/components/CreateProjectView';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';

export function CreateProjectPage() {
  const api = useApi();
  const nav = useNavigate();
  const qc = useQueryClient();

  React.useEffect(() => setTitle(['新建项目']), []);

  return (
    <CreateProjectView
      api={api}
      onBack={() => nav(-1)}
      onCreated={async (project) => {
        await qc.invalidateQueries({ queryKey: ['projects'] });
        nav(`/app/projects/${project.id}/overview`);
      }}
    />
  );
}

