import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { TaskFormPage } from '@/components/tasks/TaskFormPage';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';

export function ProjectTaskCreatePage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { detail, refresh } = useProjectDetail();
  React.useEffect(() => setTitle([detail.project.name, '新建任务']), [detail.project.name]);

  const saveM = useMutation({
    mutationFn: (payload: any) => api.saveTask(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await refresh();
    },
  });

  return (
    <TaskFormPage
      heading="新建项目任务"
      description={`项目：${detail.project.name}`}
      fixedProjectId={detail.project.id}
      projects={[detail.project]}
      users={detail.members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
        avatar: member.avatar,
      }))}
      saving={saveM.isPending}
      onBack={() => navigate(`/app/projects/${detail.project.id}/tasks`)}
      onSave={async (form) => {
        await saveM.mutateAsync({
          projectId: detail.project.id,
          title: form.title.trim(),
          description: form.description.trim(),
          status: form.status,
          priority: form.priority,
          assigneeId: form.assigneeId || undefined,
          dueDate: form.dueDate || undefined,
        });
        navigate(`/app/projects/${detail.project.id}/tasks`);
      }}
    />
  );
}
