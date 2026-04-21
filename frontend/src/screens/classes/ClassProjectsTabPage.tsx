import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, Users } from 'lucide-react';
import { useApi } from '@/app/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageError, PageLoading } from '@/screens/common/States';
import { useClassDetail } from './ClassDetailLayout';

export function ClassProjectsTabPage() {
  const { classId } = useClassDetail();
  const api = useApi();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['classProjects', classId],
    queryFn: () => api.classProjects(classId),
  });

  if (q.isLoading) return <PageLoading label="正在加载课程项目..." />;
  if (q.isError) return <PageError title="课程项目加载失败" onRetry={() => q.refetch()} />;

  const rows = q.data || [];
  const withProjectCount = rows.filter((item) => item.projectId).length;

  return (
    <Card className="border-muted/70">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban size={16} />
              课程项目看板
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">按组序号查看当前课程下所有团队项目与任务完成情况，没有项目的团队也会保留在列表里。</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">共 {rows.length} 组</Badge>
            <Badge variant="outline">已建项目 {withProjectCount}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">当前课程还没有团队项目。请先在课程团队中创建团队并继续推进项目。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">组序号</th>
                  <th className="px-4 py-3 font-medium">团队名</th>
                  <th className="px-4 py-3 font-medium">项目名</th>
                  <th className="px-4 py-3 font-medium">项目类型</th>
                  <th className="px-4 py-3 font-medium">项目状态</th>
                  <th className="px-4 py-3 font-medium min-w-[260px]">任务进度</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const groupLabel = `第 ${row.groupOrder || index + 1} 组`;
                  return (
                    <tr key={row.teamId} className="border-b last:border-b-0 align-top">
                      <td className="px-4 py-4 font-medium">{groupLabel}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{row.teamName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">团队状态：{row.teamStatus === 'LOCKED' ? '已锁定' : '组建中'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {row.projectId ? (
                          <div>
                            <div className="font-medium">{row.projectName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">当前课程项目</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">未创建项目</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.projectId ? <Badge variant="outline">{row.projectType === 'CODE' ? '代码项目' : '非代码项目'}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        {row.projectId ? <Badge variant={row.projectStatus === 'COMPLETED' ? 'secondary' : 'outline'}>{row.projectStatus === 'COMPLETED' ? '已完成' : row.projectStatus === 'ARCHIVED' ? '已归档' : '进行中'}</Badge> : <Badge variant="secondary">待创建</Badge>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{row.completedTaskCount} / {row.totalTaskCount} 已完成</span>
                            <span className="font-medium text-foreground">{row.progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${row.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/app/teams/${row.teamId}/overview`)}>
                            <Users size={14} className="mr-1" />
                            团队
                          </Button>
                          <Button size="sm" disabled={!row.projectId} onClick={() => row.projectId && navigate(`/app/projects/${row.projectId}/overview`)}>
                            项目
                            <ArrowRight size={14} className="ml-1" />
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
  );
}
