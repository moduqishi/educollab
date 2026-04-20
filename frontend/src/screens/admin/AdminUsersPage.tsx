import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Search, Trash2, Users, X } from 'lucide-react';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AdminUserSummary } from '@/lib/types';

const roleLabels: Record<string, string> = { STUDENT: '学生', TEACHER: '教师', ADMIN: '管理员' };

export function AdminUsersPage() {
  const api = useApi();
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserSummary | null>(null);
  React.useEffect(() => { setTitle(['系统管理', '用户管理']); }, []);

  const q = useQuery({ queryKey: ['adminUsers'], queryFn: () => api.adminUsers() });

  const updateRoleM = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'STUDENT' | 'TEACHER' | 'ADMIN' }) =>
      api.updateUserRole(userId, role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminUsers'] });
      setFeedback({ type: 'success', msg: '角色更新成功' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '角色更新失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const deleteM = useMutation({
    mutationFn: (userId: number) => api.deleteUser(userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminUsers'] });
      setDeleteTarget(null);
      setFeedback({ type: 'success', msg: '用户已删除' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: () => {
      setFeedback({ type: 'error', msg: '删除失败' });
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载用户列表..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} />;

  const all = q.data || [];
  const filtered = all.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div>
      <PageHero
        title="用户管理"
        subtitle={`共 ${all.length} 名用户，可修改角色或删除账号。`}
        right={<Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">管理员</Badge>}
      />
      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {/* Search + Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或邮箱..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'STUDENT', 'TEACHER', 'ADMIN'].map(r => (
                <Button key={r} size="sm" variant={roleFilter === r ? 'default' : 'outline'}
                  onClick={() => setRoleFilter(r)} className="h-8">
                  {r === 'ALL' ? '全部' : roleLabels[r]}
                </Button>
              ))}
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <CheckCircle size={14} />
              {feedback.msg}
            </div>
          )}

          <Card className="border-muted/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users size={16} />
                用户列表（{filtered.length}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!filtered.length ? (
                <PageEmpty title="无匹配用户" message="请尝试调整搜索条件或角色筛选。" icon={Users} />
              ) : (
                <div className="space-y-3">
                  {filtered.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onUpdateRole={(role) => updateRoleM.mutate({ userId: user.id, role })}
                      onDelete={() => setDeleteTarget(user)}
                      isUpdating={updateRoleM.isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定要删除用户 <strong>{deleteTarget?.name}</strong>（{deleteTarget?.email}）吗？此操作不可恢复。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)}
              disabled={deleteM.isPending}>
              {deleteM.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserRow({ user, onUpdateRole, onDelete, isUpdating }: {
  user: AdminUserSummary;
  onUpdateRole: (role: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border p-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-primary/10">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name?.slice(0, 1) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{user.name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
        <Select value={user.role} onValueChange={(v) => onUpdateRole(v as 'STUDENT' | 'TEACHER' | 'ADMIN')} disabled={isUpdating} itemToStringLabel={v => roleLabels[v] ?? v}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="STUDENT">学生</SelectItem>
            <SelectItem value="TEACHER">教师</SelectItem>
            <SelectItem value="ADMIN">管理员</SelectItem>
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} title="删除用户">
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}
