import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClassDetail } from './ClassDetailLayout';
import { AssignmentsTab } from './ClassAssignmentsTab';
import { useApi } from '@/app/api';

export function ClassAssignmentsTabPage() {
  const { detail, refresh, isTeacher } = useClassDetail();
  const api = useApi();
  const qc = useQueryClient();

  const createAssignmentM = useMutation({
    mutationFn: (payload: {
      title: string;
      summary: string;
      submissionUrl?: string;
      dueDate?: string;
    }) => api.createAssignment(detail.classInfo.id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  const updateAssignmentM = useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: number; payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string } }) =>
      api.updateAssignment(detail.classInfo.id, assignmentId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  const deleteAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.deleteClassAssignment(detail.classInfo.id, assignmentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  const closeAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.closeAssignment(detail.classInfo.id, assignmentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  const reopenAssignmentM = useMutation({
    mutationFn: (assignmentId: number) => api.reopenAssignment(detail.classInfo.id, assignmentId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  return (
    <AssignmentsTab
      detail={detail}
      isTeacher={isTeacher}
      onCreateAssignment={(payload) => createAssignmentM.mutateAsync(payload)}
      onUpdateAssignment={(assignmentId, payload) => updateAssignmentM.mutateAsync({ assignmentId, payload })}
      onDeleteAssignment={(assignmentId) => deleteAssignmentM.mutateAsync(assignmentId)}
      onCloseAssignment={(assignmentId) => closeAssignmentM.mutateAsync(assignmentId)}
      onReopenAssignment={(assignmentId) => reopenAssignmentM.mutateAsync(assignmentId)}
    />
  );
}
