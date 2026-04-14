import React from 'react';
import { Plus, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TeamsPage() {
  const api = useApi();
  const qc = useQueryClient();

  React.useEffect(() => setTitle(['团队']), []);

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.teams() });
  const coursesQ = useQuery({ queryKey: ['courses'], queryFn: () => api.courses() });
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => api.users() });

  const createTeamM = useMutation({
    mutationFn: (payload: { name: string; courseId: number; leaderId: number; memberIds: number[] }) => api.createTeam(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [courseId, setCourseId] = React.useState<number | null>(null);
  const [leaderId, setLeaderId] = React.useState<number | null>(null);
  const [memberIds, setMemberIds] = React.useState<number[]>([]);

  const canSubmit = !!name.trim() && !!courseId && !!leaderId;

  const reset = () => {
    setName('');
    setCourseId(null);
    setLeaderId(null);
    setMemberIds([]);
  };

  const isLoading = teamsQ.isLoading || coursesQ.isLoading || usersQ.isLoading;
  if (isLoading) return <PageLoading label="正在加载团队…" />;
  if (teamsQ.isError) return <PageError title="团队加载失败" onRetry={() => teamsQ.refetch()} />;
  if (coursesQ.isError) return <PageError title="课程加载失败" onRetry={() => coursesQ.refetch()} />;
  if (usersQ.isError) return <PageError title="用户加载失败" onRetry={() => usersQ.refetch()} />;

  const teams = teamsQ.data || [];
  const courses = coursesQ.data || [];
  const users = usersQ.data || [];

  return (
    <div>
      <PageHero
        title="团队"
        subtitle="面向课程的协作团队：成员、负责人、以及后续项目创建的归属。"
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) reset();
            }}
          >
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus size={16} /> 新建团队
            </DialogTrigger>
            <DialogContent className="max-w-[720px]">
              <DialogHeader>
                <DialogTitle>新建团队</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                <div className="space-y-2">
                  <Label>团队名称</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：第 3 组 / A 班 · 课程项目组" />
                </div>
                <div className="space-y-2">
                  <Label>所属课程</Label>
                  <Select value={courseId ? String(courseId) : ''} onValueChange={(v) => setCourseId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择课程" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>负责人</Label>
                  <Select value={leaderId ? String(leaderId) : ''} onValueChange={(v) => setLeaderId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择负责人" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}（{u.email}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>成员</Label>
                  <Card className="border-muted/70">
                    <ScrollArea className="h-[240px]">
                      <CardContent className="py-3 space-y-2">
                        {users.map((u) => {
                          const checked = memberIds.includes(u.id);
                          return (
                            <label key={u.id} className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-muted/40 cursor-pointer">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{u.name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                              </div>
                              <input
                                type="checkbox"
                                className="accent-primary"
                                checked={checked}
                                onChange={(e) => {
                                  setMemberIds((prev) => (e.target.checked ? Array.from(new Set([...prev, u.id])) : prev.filter((x) => x !== u.id)));
                                }}
                              />
                            </label>
                          );
                        })}
                      </CardContent>
                    </ScrollArea>
                  </Card>
                  <div className="text-[11px] text-muted-foreground">提示：负责人不自动加入成员，你可以手动勾选。</div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={createTeamM.isPending}>
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (!canSubmit) return;
                    await createTeamM.mutateAsync({
                      name: name.trim(),
                      courseId: courseId!,
                      leaderId: leaderId!,
                      memberIds,
                    });
                    setOpen(false);
                    reset();
                  }}
                  disabled={!canSubmit || createTeamM.isPending}
                >
                  {createTeamM.isPending ? '正在创建…' : '创建团队'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto">
          {!teams.length ? (
            <PageEmpty
              title="还没有团队"
              message="先创建团队，再基于团队创建项目。"
              icon={Users}
              action={
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus size={16} /> 新建团队
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {teams.map((t) => (
                <Card key={t.id} className="border-muted/70 hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{t.name}</CardTitle>
                        <div className="mt-1 text-sm text-muted-foreground truncate">{t.courseName || '—'}</div>
                      </div>
                      <Badge variant="outline" className="text-[11px]">
                        {t.memberCount} 人
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground">负责人</div>
                      <div className="font-medium">{t.leaderName || '—'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

