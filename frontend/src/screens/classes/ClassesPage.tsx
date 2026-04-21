import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Search, Users, X } from 'lucide-react';
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
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Input } from '@/components/ui/input';

export function ClassesPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isTeacher = session?.profile.role === 'TEACHER';
  const [search, setSearch] = React.useState('');

  React.useEffect(() => setTitle(['课程中心']), []);

  const classesQ = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const pendingInvitationsQ = useQuery({
    queryKey: ['classInvitations'],
    queryFn: () => api.pendingClassInvitations(),
    enabled: !isTeacher,
  });

  const createClassM = useMutation({
    mutationFn: (name: string) => api.createClass({ name }),
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['classes'] });
      navigate(`/app/classes/${created.id}/overview`);
    },
  });

  const joinClassM = useMutation({
    mutationFn: (code: string) => api.joinClassByCode(code),
    onSuccess: async (joined) => {
      await qc.invalidateQueries({ queryKey: ['classes'] });
      navigate(`/app/classes/${joined.id}/overview`);
    },
  });

  const acceptInvitationM = useMutation({
    mutationFn: (id: number) => api.acceptClassInvitation(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classes'] });
      await qc.invalidateQueries({ queryKey: ['classInvitations'] });
    },
  });

  const rejectInvitationM = useMutation({
    mutationFn: (id: number) => api.rejectClassInvitation(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['classInvitations'] });
    },
  });

  if (classesQ.isLoading) return <PageLoading label="正在加载课程..." />;
  if (classesQ.isError) return <PageError title="课程加载失败" onRetry={() => classesQ.refetch()} />;

  const classes = classesQ.data || [];
  const filtered = classes.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.classCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(16,185,129,0.05) 0%, transparent 50%), #fafafa'
    }}>
      {/* Header */}
      <div className="border-b border-muted/40 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'PingFang SC', 'Inter', sans-serif" }}>
                {isTeacher ? '我的课程' : '已加入课程'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isTeacher ? '管理课程内容，查看学生作业与团队协作' : '查看作业、课程团队与老师通知'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isTeacher ? (
                <CreateClassDialog
                  onSubmit={(name) => createClassM.mutateAsync(name)}
                  busy={createClassM.isPending}
                />
              ) : (
                <JoinClassDialog
                  onSubmit={(code) => joinClassM.mutateAsync(code)}
                  busy={joinClassM.isPending}
                />
              )}
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex-1 max-w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索课程名称或班级码..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-11 rounded-2xl border-muted/60 bg-white pl-11 pr-10 shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} 门课程</span>
          </div>
        </div>
      </div>

      {/* 待处理邀请（非教师） */}
      {!isTeacher ? (
        <div className="mx-auto max-w-[1400px] px-8 pt-6">
          <PendingInvitationCard
            invitations={pendingInvitationsQ.data || []}
            onAccept={(id) => acceptInvitationM.mutateAsync(id)}
            onReject={(id) => rejectInvitationM.mutateAsync(id)}
            busy={acceptInvitationM.isPending || rejectInvitationM.isPending}
          />
        </div>
      ) : null}

      {/* 课程网格 */}
      <div className="mx-auto max-w-[1400px] px-8 py-6">
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50">
              <BookOpen size={32} className="text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">
              {search ? '没有找到匹配的课程' : '还没有课程'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? '请尝试其他搜索关键词' : (isTeacher ? '先创建一门课程开始管理教学内容' : '通过课程码加入一门课程')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item, idx) => {
              const accentColors = [
                'from-indigo-500/20 to-indigo-500/5 border-indigo-200/60 hover:border-indigo-400',
                'from-emerald-500/20 to-emerald-500/5 border-emerald-200/60 hover:border-emerald-400',
                'from-orange-500/20 to-orange-500/5 border-orange-200/60 hover:border-orange-400',
                'from-pink-500/20 to-pink-500/5 border-pink-200/60 hover:border-pink-400',
                'from-cyan-500/20 to-cyan-500/5 border-cyan-200/60 hover:border-cyan-400',
                'from-purple-500/20 to-purple-500/5 border-purple-200/60 hover:border-purple-400',
              ];
              const accent = accentColors[idx % accentColors.length];
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/app/classes/${item.id}/overview`)}
                  className={`group cursor-pointer rounded-2xl border bg-gradient-to-br ${accent} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
                >
                  {/* 顶部装饰条 */}
                  <div className={`h-1 w-12 rounded-full bg-gradient-to-r mb-4 ${
                    idx % 6 === 0 ? 'from-indigo-500 to-indigo-400' :
                    idx % 6 === 1 ? 'from-emerald-500 to-emerald-400' :
                    idx % 6 === 2 ? 'from-orange-500 to-orange-400' :
                    idx % 6 === 3 ? 'from-pink-500 to-pink-400' :
                    idx % 6 === 4 ? 'from-cyan-500 to-cyan-400' :
                    'from-purple-500 to-purple-400'
                  }`} />

                  {/* 标题区 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-foreground leading-snug" style={{ fontFamily: "'PingFang SC', 'Inter', sans-serif" }}>
                        {item.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <GraduationCap size={12} />
                        <span>{item.teacherName || '未分配教师'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs font-medium bg-white/60">{item.memberCount} 人</Badge>
                  </div>

                  {/* 底部 */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-md bg-white/70 px-2 py-0.5 font-mono text-xs text-muted-foreground border border-muted/30">
                      {item.classCode}
                    </span>
                    <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      进入 →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
