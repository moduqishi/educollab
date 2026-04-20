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

  return (
    <AssignmentsTab
      detail={detail}
      isTeacher={isTeacher}
      onRefresh={refresh}
      onCreateAssignment={(payload) => createAssignmentM.mutateAsync(payload)}
    />
  );
}
