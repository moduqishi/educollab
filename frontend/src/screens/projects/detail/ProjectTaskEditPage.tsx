import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { TaskFormPage } from '@/components/tasks/TaskFormPage';
import { PageError } from '@/screens/common/States';
import { useProjectDetail } from '@/screens/projects/ProjectLayout';

export function ProjectTaskEditPage() {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { taskId, projectId } = useParams();
  const { detail, refresh } = useProjectDetail();
  const id = Number(taskId);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);

  React.useEffect(() => setTitle([detail.project.name, '编辑任务']), [detail.project.name]);

  const task = detail.tasks.find((item) => item.id === id);
  const attachmentsQ = useQuery({
    queryKey: ['taskFiles', id],
    queryFn: () => api.files('TASK', id),
    enabled: !!id,
  });

  const saveM = useMutation({
    mutationFn: (payload: any) => api.saveTask(payload, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      await qc.invalidateQueries({ queryKey: ['taskFiles', id] });
      await refresh();
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

  if (!task) {
    return (
      <PageError
        title="任务不存在"
        message="没有在当前项目里找到这条任务。"
        onRetry={() => navigate(`/app/projects/${projectId}/tasks`)}
      />
    );
  }

  return (
    <TaskFormPage
      heading={task.title}
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
      initialValue={{
        projectId: detail.project.id,
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
      onUploadAttachment={async (file) => {
        await uploadM.mutateAsync(file);
      }}
      onDeleteAttachment={async (fileId) => {
        await deleteAttachmentM.mutateAsync(fileId);
      }}
    />
  );
}
