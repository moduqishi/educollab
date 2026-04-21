import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, Trash2, UserCog, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminUserSummary } from '@/lib/types';

const roleLabels: Record<string, string> = {
  STUDENT: '学生',
  TEACHER: '教师',
  ADMIN: '管理员',
};

export function AdminUsersPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUserSummary | null>(null);

  React.useEffect(() => {
    setTitle(['系统管理', '用户管理']);
  }, []);

  const q = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.adminUsers(),
  });

  const updateRoleM = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'STUDENT' | 'TEACHER' | 'ADMIN' }) =>
      api.updateUserRole(userId, role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  const deleteM = useMutation({
    mutationFn: (userId: number) => api.deleteUser(userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['adminUsers'] });
      setDeleteTarget(null);
    },
  });

  if (q.isLoading) return <PageLoading label="正在加载用户管理数据..." />;
  if (q.isError) return <PageError onRetry={() => q.refetch()} title="用户列表加载失败" />;

  const rows = (q.data || []).filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword);
    const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
    const active = item.active !== false;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? active : !active);
    return matchesKeyword && matchesRole && matchesStatus;
  });

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              统一查看账户、课程/团队/项目归属与活跃状态，支持直接进入用户详情做进一步维护。
            </p>
          </div>
          <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
            共 {q.data?.length || 0} 名用户
          </Badge>
        </div>

        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">筛选与检索</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="搜索姓名或邮箱..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter} itemToStringLabel={(value) => (value === 'ALL' ? '全部角色' : roleLabels[value] || value)}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                <SelectItem value="STUDENT">学生</SelectItem>
                <SelectItem value="TEACHER">教师</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)} itemToStringLabel={(value) => ({ ALL: '全部状态', ACTIVE: '正常', INACTIVE: '停用' }[value] || value)}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="ACTIVE">正常</SelectItem>
                <SelectItem value="INACTIVE">停用</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-muted/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">用户列表</CardTitle>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <PageEmpty title="没有匹配用户" message="请调整检索条件后再试。" icon={UserCog} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-3 font-medium">用户</th>
                      <th className="px-3 py-3 font-medium">角色</th>
                      <th className="px-3 py-3 font-medium">状态</th>
                      <th className="px-3 py-3 font-medium">课程</th>
                      <th className="px-3 py-3 font-medium">团队</th>
                      <th className="px-3 py-3 font-medium">项目</th>
                      <th className="px-3 py-3 font-medium">最近活跃</th>
                      <th className="px-3 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((user) => {
                      const active = user.active !== false;
                      return (
                        <tr key={user.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="px-3 py-3">
                            <Select
                              value={user.role}
                              onValueChange={(value) => updateRoleM.mutate({ userId: user.id, role: value as 'STUDENT' | 'TEACHER' | 'ADMIN' })}
                              disabled={updateRoleM.isPending}
                              itemToStringLabel={(value) => roleLabels[value] ?? value}
                            >
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STUDENT">学生</SelectItem>
                                <SelectItem value="TEACHER">教师</SelectItem>
                                <SelectItem value="ADMIN">管理员</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={active ? 'default' : 'secondary'}>{active ? '正常' : '停用'}</Badge>
                          </td>
                          <td className="px-3 py-3">{user.courseCount || 0}</td>
                          <td className="px-3 py-3">{user.teamCount || 0}</td>
                          <td className="px-3 py-3">{user.projectCount || 0}</td>
                          <td className="px-3 py-3 text-muted-foreground">{user.lastActiveAt || '暂无记录'}</td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/app/admin/users/${user.id}`)}>
                                详情
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            确定删除 <strong>{deleteTarget?.name}</strong>（{deleteTarget?.email}）吗？该操作不可恢复。
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteM.mutate(deleteTarget.id)} disabled={deleteM.isPending}>
              {deleteM.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
