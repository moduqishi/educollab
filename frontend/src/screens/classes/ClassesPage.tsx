import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Copy, RefreshCcw, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreateClassDialog,
  JoinClassDialog,
  PendingInvitationCard,
} from '@/screens/classes/ClassDialogs';
import { AssignmentsTab } from '@/screens/classes/ClassAssignmentsTab';
import { GroupTasksTab } from '@/screens/classes/ClassGroupTasksTab';
import { MembersTab } from '@/screens/classes/ClassMembersTab';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { PageHero } from '@/screens/shell/PageHero';
import type { ClassDetail } from '@/lib/types';

type ClassTab = 'overview' | 'members' | 'assignments' | 'groupTasks';

function isClassTab(value: string | null): value is ClassTab {
  return value === 'overview' || value === 'members' || value === 'assignments' || value === 'groupTasks';
}

export function ClassesPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const isTeacher = session?.profile.role === 'TEACHER';

  React.useEffect(() => setTitle(['课程中心']), []);

  const classesQ = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const pendingInvitationsQ = useQuery({
    queryKey: ['classInvitations'],
    queryFn: () => api.pendingClassInvitations(),
    enabled: !isTeacher,
  });

  const requestedClassId = Number(searchParams.get('classId') || 0) || null;
  const requestedTab = searchParams.get('tab');
  const [selectedId, setSelectedId] = React.useState<number | null>(requestedClassId);
  const [activeTab, setActiveTab] = React.useState<ClassTab>(
    isClassTab(requestedTab) ? requestedTab : 'overview',
  );

  React.useEffect(() => {
    if (requestedClassId && classesQ.data?.some((item) => item.id === requestedClassId)) {
      setSelectedId(requestedClassId);
      return;
    }
    if (!selectedId && classesQ.data?.[0]?.id) {
      setSelectedId(classesQ.data[0].id);
    }
  }, [classesQ.data, requestedClassId, selectedId]);

  React.useEffect(() => {
    if (isClassTab(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

  React.useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedId) {
      next.set('classId', String(selectedId));
    } else {
      next.delete('classId');
    }
    if (activeTab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', activeTab);
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, searchParams, selectedId, setSearchParams]);

  const detailQ = useQuery({
    queryKey: ['classDetail', selectedId],
    queryFn: () => api.classDetail(selectedId!),
    enabled: !!selectedId,
  });

  const refreshAll = React.useCallback(
    async () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['classes'] }),
        qc.invalidateQueries({ queryKey: ['classDetail'] }),
        qc.invalidateQueries({ queryKey: ['classInvitations'] }),
        qc.invalidateQueries({ queryKey: ['teacherAssignments'] }),
        qc.invalidateQueries({ queryKey: ['assignmentSubmissions'] }),
        qc.invalidateQueries({ queryKey: ['assignmentSubmission'] }),
        qc.invalidateQueries({ queryKey: ['teams'] }),
      ]),
    [qc],
  );

  const createClassM = useMutation({
    mutationFn: (name: string) => api.createClass({ name }),
    onSuccess: async (created) => {
      setSelectedId(created.id);
      await refreshAll();
    },
  });
  const joinClassM = useMutation({
    mutationFn: (code: string) => api.joinClassByCode(code),
    onSuccess: async (joined) => {
      setSelectedId(joined.id);
      await refreshAll();
    },
  });
  const inviteM = useMutation({
    mutationFn: ({ classId, email }: { classId: number; email: string }) =>
      api.inviteToClass(classId, email),
    onSuccess: refreshAll,
  });
  const resetCodeM = useMutation({
    mutationFn: (classId: number) => api.resetClassCode(classId),
    onSuccess: refreshAll,
  });
  const acceptInvitationM = useMutation({
    mutationFn: (id: number) => api.acceptClassInvitation(id),
    onSuccess: refreshAll,
  });
  const rejectInvitationM = useMutation({
    mutationFn: (id: number) => api.rejectClassInvitation(id),
    onSuccess: refreshAll,
  });
  const createAssignmentM = useMutation({
    mutationFn: ({
      classId,
      payload,
    }: {
      classId: number;
      payload: { title: string; summary: string; submissionUrl?: string; dueDate?: string };
    }) => api.createAssignment(classId, payload),
    onSuccess: refreshAll,
  });
  const createGroupTaskM = useMutation({
    mutationFn: ({
      classId,
      payload,
    }: {
      classId: number;
      payload: {
        title: string;
        description: string;
        minMembers?: number;
        maxMembers?: number;
        dueDate?: string;
      };
    }) => api.createGroupTask(classId, payload),
    onSuccess: refreshAll,
  });
  const createTeamM = useMutation({
    mutationFn: ({ groupTaskId, name }: { groupTaskId: number; name: string }) =>
      api.createGroupTaskTeam(groupTaskId, { name }),
    onSuccess: refreshAll,
  });
  const joinTeamM = useMutation({
    mutationFn: (teamId: number) => api.joinGroupTaskTeam(teamId),
    onSuccess: refreshAll,
  });
  const leaveTeamM = useMutation({
    mutationFn: (teamId: number) => api.leaveGroupTaskTeam(teamId),
    onSuccess: refreshAll,
  });
  const transferLeaderM = useMutation({
    mutationFn: ({ teamId, leaderUserId }: { teamId: number; leaderUserId: number }) =>
      api.transferGroupTaskLeader(teamId, leaderUserId),
    onSuccess: refreshAll,
  });

  if (classesQ.isLoading) return <PageLoading label="正在加载课程..." />;
  if (classesQ.isError) return <PageError title="课程加载失败" onRetry={() => classesQ.refetch()} />;

  const classes = classesQ.data || [];
  const detail = detailQ.data || null;

  return (
    <div>
      <PageHero
        title="课程中心"
        subtitle={
          isTeacher
            ? '在一个地方管理课程成员、作业与组队任务。'
            : '加入课程后查看作业、组队任务与老师通知。'
        }
        actions={
          isTeacher ? (
            <CreateClassDialog
              onSubmit={(name) => createClassM.mutateAsync(name)}
              busy={createClassM.isPending}
            />
          ) : (
            <JoinClassDialog
              onSubmit={(code) => joinClassM.mutateAsync(code)}
              busy={joinClassM.isPending}
            />
          )
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-6 xl:grid-cols-[320px,1fr]">
          <div className="space-y-4">
            <Card className="border-muted/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">我的课程</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!classes.length ? (
                  <PageEmpty
                    title="还没有课程"
                    message={isTeacher ? '先创建一门课程开始管理教学内容。' : '通过课程码加入一门课程。'}
                    icon={BookOpen}
                  />
                ) : (
                  classes.map((item) => (
                    <button
                      key={item.id}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedId === item.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted/70 hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{item.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.teacherName || '未设置教师'}
                          </div>
                        </div>
                        <Badge variant="outline">{item.memberCount} 人</Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">课程码：{item.classCode}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            {!isTeacher ? (
              <PendingInvitationCard
                invitations={pendingInvitationsQ.data || []}
                onAccept={(id) => acceptInvitationM.mutateAsync(id)}
                onReject={(id) => rejectInvitationM.mutateAsync(id)}
                busy={acceptInvitationM.isPending || rejectInvitationM.isPending}
              />
            ) : null}
          </div>

          <div>
            {!selectedId ? (
              <PageEmpty
                title="请选择一门课程"
                message="从左侧选择课程后，可以查看概览、成员、作业与组队任务。"
                icon={Users}
              />
            ) : detailQ.isLoading ? (
              <PageLoading label="正在加载课程详情..." />
            ) : detailQ.isError ? (
              <PageError title="课程详情加载失败" onRetry={() => detailQ.refetch()} />
            ) : detail ? (
              <ClassDetailPanel
                detail={detail}
                isTeacher={!!isTeacher}
                currentUserId={session?.profile.id}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                onRefresh={refreshAll}
                onResetCode={() => resetCodeM.mutateAsync(detail.classInfo.id)}
                onInvite={(email) => inviteM.mutateAsync({ classId: detail.classInfo.id, email })}
                onCreateAssignment={(payload) =>
                  createAssignmentM.mutateAsync({ classId: detail.classInfo.id, payload })
                }
                onCreateGroupTask={(payload) =>
                  createGroupTaskM.mutateAsync({ classId: detail.classInfo.id, payload })
                }
                onCreateTeam={(groupTaskId, name) => createTeamM.mutateAsync({ groupTaskId, name })}
                onJoinTeam={(teamId) => joinTeamM.mutateAsync(teamId)}
                onLeaveTeam={(teamId) => leaveTeamM.mutateAsync(teamId)}
                onTransferLeader={(teamId, leaderUserId) =>
                  transferLeaderM.mutateAsync({ teamId, leaderUserId })
                }
                onOpenTeam={(teamId) => navigate(`/app/teams?teamId=${teamId}`)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassDetailPanel({
  detail,
  isTeacher,
  currentUserId,
  activeTab,
  onChangeTab,
  onRefresh,
  onResetCode,
  onInvite,
  onCreateAssignment,
  onCreateGroupTask,
  onCreateTeam,
  onJoinTeam,
  onLeaveTeam,
  onTransferLeader,
  onOpenTeam,
}: {
  detail: ClassDetail;
  isTeacher: boolean;
  currentUserId?: number;
  activeTab: ClassTab;
  onChangeTab: (tab: ClassTab) => void;
  onRefresh: () => Promise<unknown>;
  onResetCode: () => Promise<unknown>;
  onInvite: (email: string) => Promise<unknown>;
  onCreateAssignment: (payload: {
    title: string;
    summary: string;
    submissionUrl?: string;
    dueDate?: string;
  }) => Promise<unknown>;
  onCreateGroupTask: (payload: {
    title: string;
    description: string;
    minMembers?: number;
    maxMembers?: number;
    dueDate?: string;
  }) => Promise<unknown>;
  onCreateTeam: (groupTaskId: number, name: string) => Promise<unknown>;
  onJoinTeam: (teamId: number) => Promise<unknown>;
  onLeaveTeam: (teamId: number) => Promise<unknown>;
  onTransferLeader: (teamId: number, leaderUserId: number) => Promise<unknown>;
  onOpenTeam: (teamId: number) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const tabs: Array<{ key: ClassTab; label: string }> = [
    { key: 'overview', label: '概览' },
    { key: 'members', label: '成员与邀请' },
    { key: 'assignments', label: '普通作业' },
    { key: 'groupTasks', label: '组队任务' },
  ];

  const copyCode = async () => {
    await navigator.clipboard.writeText(detail.classInfo.classCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-6">
      <Card className="border-muted/70">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{detail.classInfo.name}</CardTitle>
              <div className="mt-2 text-sm text-muted-foreground">
                教师：{detail.classInfo.teacherName || '未设置'} · 成员 {detail.classInfo.memberCount} 人
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">课程码：{detail.classInfo.classCode}</Badge>
              <Button size="sm" variant="outline" className="gap-1" onClick={copyCode}>
                <Copy size={14} />
                {copied ? '已复制' : '复制'}
              </Button>
              {isTeacher ? (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onResetCode()}>
                  <RefreshCcw size={14} />
                  重置课程码
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={activeTab === tab.key ? 'default' : 'outline'}
                onClick={() => onChangeTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {activeTab === 'overview' ? <OverviewTab detail={detail} /> : null}
      {activeTab === 'members' ? (
        <MembersTab detail={detail} isTeacher={isTeacher} onInvite={onInvite} />
      ) : null}
      {activeTab === 'assignments' ? (
        <AssignmentsTab
          detail={detail}
          isTeacher={isTeacher}
          onRefresh={onRefresh}
          onCreateAssignment={onCreateAssignment}
        />
      ) : null}
      {activeTab === 'groupTasks' ? (
        <GroupTasksTab
          detail={detail}
          isTeacher={isTeacher}
          currentUserId={currentUserId}
          onCreateGroupTask={onCreateGroupTask}
          onCreateTeam={onCreateTeam}
          onJoinTeam={onJoinTeam}
          onLeaveTeam={onLeaveTeam}
          onTransferLeader={onTransferLeader}
          onOpenTeam={onOpenTeam}
        />
      ) : null}
    </div>
  );
}

function OverviewTab({ detail }: { detail: ClassDetail }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <StatCard title="成员数" value={detail.members.length} />
      <StatCard title="普通作业" value={detail.assignments.length} />
      <StatCard title="组队任务" value={detail.groupTasks.length} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  );
}
