import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useClassDetail } from './ClassDetailLayout';
import { GroupTasksTab } from './ClassGroupTasksTab';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';

export function ClassGroupTasksTabPage() {
  const { detail, refresh, isTeacher, classId } = useClassDetail();
  const api = useApi();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { session } = useAuth();

  const createGroupTaskM = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      minMembers?: number;
      maxMembers?: number;
      dueDate?: string;
    }) => api.createGroupTask(classId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', classId] });
    },
  });

  const createTeamM = useMutation({
    mutationFn: ({ groupTaskId, name }: { groupTaskId: number; name: string }) =>
      api.createGroupTaskTeam(groupTaskId, { name }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', classId] });
    },
  });

  const joinTeamM = useMutation({
    mutationFn: (teamId: number) => api.joinGroupTaskTeam(teamId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', classId] });
    },
  });

  const leaveTeamM = useMutation({
    mutationFn: (teamId: number) => api.leaveGroupTaskTeam(teamId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', classId] });
    },
  });

  const transferLeaderM = useMutation({
    mutationFn: ({ teamId, leaderUserId }: { teamId: number; leaderUserId: number }) =>
      api.transferGroupTaskLeader(teamId, leaderUserId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classDetail', classId] });
    },
  });

  return (
    <GroupTasksTab
      detail={detail}
      isTeacher={isTeacher}
      currentUserId={session?.profile.id}
      onCreateGroupTask={(payload) => createGroupTaskM.mutateAsync(payload)}
      onCreateTeam={(groupTaskId, name) => createTeamM.mutateAsync({ groupTaskId, name })}
      onJoinTeam={(teamId) => joinTeamM.mutateAsync(teamId)}
      onLeaveTeam={(teamId) => leaveTeamM.mutateAsync(teamId)}
      onTransferLeader={(teamId, leaderUserId) => transferLeaderM.mutateAsync({ teamId, leaderUserId })}
      onOpenTeam={(teamId) => nav(`/app/teams?teamId=${teamId}`)}
    />
  );
}
