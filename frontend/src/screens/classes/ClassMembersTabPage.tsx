import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClassDetail } from './ClassDetailLayout';
import { MembersTab } from './ClassMembersTab';
import { useApi } from '@/app/api';

export function ClassMembersTabPage() {
  const { detail, refresh, isTeacher } = useClassDetail();
  const api = useApi();
  const qc = useQueryClient();

  const inviteM = useMutation({
    mutationFn: (email: string) => api.inviteToClass(detail.classInfo.id, email),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', detail.classInfo.id] });
    },
  });

  return (
    <MembersTab
      detail={detail}
      isTeacher={isTeacher}
      onInvite={(email) => inviteM.mutateAsync(email)}
    />
  );
}
