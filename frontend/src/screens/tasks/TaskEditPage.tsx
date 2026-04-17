import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { TaskFormPage } from '@/components/tasks/TaskFormPage';
import { PageError, PageLoading } from '@/screens/common/States';

export function TaskEditPage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { taskId } = useParams();
  const id = Number(taskId);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);

  React.useEffect(() => setTitle(['编辑任务']), []);

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => api.users() });
  const attachmentsQ = useQuery({
    queryKey: ['taskFiles', id],
    queryFn: () => api.files('TASK', id),
    enabled: !!id,
  });

  const saveM = useMutation({
    mutationFn: (payload: any) => api.saveTask(payload, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await qc.invalidateQueries({ queryKey: ['projectDetail'] });
      await qc.invalidateQueries({ queryKey: ['taskFiles', id] });
    },
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => api.uploadFile('TASK', id, file),
    onSuccess: async () => {
      setAttachmentError(null);
      await qc.invalidateQueries({ queryKey: ['taskFiles', id] });
    },
    onError: (error: Error) => {
      setAttachmentError(error.message || '附件上传失败，请稍后重试。');
    },
  });

  const deleteAttachmentM = useMutation({
    mutationFn: (fileId: number) => api.deleteTaskAttachment(id, fileId),
    onSuccess: async () => {
      setAttachmentError(null);
      await qc.invalidateQueries({ queryKey: ['taskFiles', id] });
    },
    onError: (error: Error) => {
      setAttachmentError(error.message || '附件删除失败，请稍后重试。');
    },
  });

  if (!id) {
    return (
      <PageError
        title="任务不存在"
        message="任务编号无效。"
        onRetry={() => navigate('/app/tasks')}
      />
    );
  }

  if (tasksQ.isLoading || projectsQ.isLoading || usersQ.isLoading) {
    return <PageLoading label="正在加载任务..." />;
  }

  if (tasksQ.isError) {
    return <PageError title="任务加载失败" onRetry={() => tasksQ.refetch()} />;
  }

  if (projectsQ.isError) {
    return <PageError title="项目加载失败" onRetry={() => projectsQ.refetch()} />;
  }

  if (usersQ.isError) {
    return <PageError title="用户加载失败" onRetry={() => usersQ.refetch()} />;
  }

  const task = (tasksQ.data || []).find((item) => item.id === id);
  if (!task) {
    return (
      <PageError
        title="任务不存在"
        message="没有找到这条任务，可能已经被删除。"
        onRetry={() => navigate('/app/tasks')}
      />
    );
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-[1500px]">
        <TaskFormPage
          heading={task.title}
          description={`所属项目：${task.projectName}`}
          projects={projectsQ.data || []}
          users={usersQ.data || []}
          fixedProjectId={task.projectId}
          initialValue={{
            projectId: task.projectId,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assigneeId ?? null,
            dueDate: task.dueDate || '',
          }}
          saving={saveM.isPending}
          attachments={attachmentsQ.data || []}
          loadingAttachments={attachmentsQ.isLoading}
          uploadingAttachment={uploadM.isPending}
          deletingAttachmentId={deleteAttachmentM.isPending ? deleteAttachmentM.variables : null}
          attachmentError={attachmentError}
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
          onUploadAttachment={async (file) => {
            await uploadM.mutateAsync(file);
          }}
          onDeleteAttachment={async (fileId) => {
            await deleteAttachmentM.mutateAsync(fileId);
          }}
        />
      </div>
    </div>
  );
}
