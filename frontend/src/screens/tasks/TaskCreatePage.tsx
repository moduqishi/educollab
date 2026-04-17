import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { TaskFormPage } from '@/components/tasks/TaskFormPage';
import { PageError, PageLoading } from '@/screens/common/States';

export function TaskCreatePage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['新建任务']), []);

  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => api.users() });

  const saveM = useMutation({
    mutationFn: (payload: any) => api.saveTask(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await qc.invalidateQueries({ queryKey: ['projectDetail'] });
    },
  });

  if (projectsQ.isLoading || usersQ.isLoading) {
    return <PageLoading label="正在加载任务编辑器..." />;
  }
  if (projectsQ.isError) {
    return <PageError title="项目加载失败" onRetry={() => projectsQ.refetch()} />;
  }
  if (usersQ.isError) {
    return <PageError title="用户加载失败" onRetry={() => usersQ.refetch()} />;
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-[1500px]">
        <TaskFormPage
          heading="新建任务"
          description="创建一条新的跨项目任务，保存后会回到任务列表。"
          projects={projectsQ.data || []}
          users={usersQ.data || []}
          saving={saveM.isPending}
          onBack={() => navigate('/app/tasks')}
          onSave={async (form) => {
            await saveM.mutateAsync({
              projectId: form.projectId!,
              title: form.title.trim(),
              description: form.description.trim(),
              status: form.status,
              priority: form.priority,
              assigneeId: form.assigneeId || undefined,
              dueDate: form.dueDate || undefined,
            });
            navigate('/app/tasks');
          }}
        />
      </div>
    </div>
  );
}
