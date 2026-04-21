import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderInput, GraduationCap, RefreshCcw, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';

const operationCards = [
  {
    title: '课程批量导入学生',
    description: '以课程为入口下载模板、预校验 CSV/XLSX、自动建号并批量入课。',
    href: '/app/admin/courses',
    icon: GraduationCap,
    action: '进入课程管理',
  },
  {
    title: '批量维护团队与组序',
    description: '统一进入团队管理做队长调整、成员迁移、组序修复与异常团队排查。',
    href: '/app/admin/teams',
    icon: Users,
    action: '进入团队管理',
  },
  {
    title: '批量项目归档 / 恢复',
    description: '从项目后台按课程、团队、状态做筛选后执行归档、恢复与重算。',
    href: '/app/admin/projects',
    icon: RefreshCcw,
    action: '进入项目管理',
  },
  {
    title: '系统维护与失败审计',
    description: '查看最近导入失败、系统健康、存储扫描结果，并执行维护动作。',
    href: '/app/admin/system',
    icon: Shield,
    action: '打开系统控制',
  },
];

export function AdminImportsPage() {
  const api = useApi();
  const nav = useNavigate();
  React.useEffect(() => { setTitle(['系统管理', '导入与批量维护']); }, []);

  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const systemQ = useQuery({ queryKey: ['adminSystemOverview'], queryFn: () => api.adminSystemOverview() });
  const healthQ = useQuery({ queryKey: ['adminSystemHealth'], queryFn: () => api.adminSystemHealth() });

  if (coursesQ.isLoading || systemQ.isLoading || healthQ.isLoading) return <PageLoading label="正在加载导入与维护中心..." />;
  if (coursesQ.isError || systemQ.isError || healthQ.isError || !systemQ.data) {
    return <PageError onRetry={() => { void coursesQ.refetch(); void systemQ.refetch(); void healthQ.refetch(); }} title="导入与维护中心加载失败" />;
  }

  const imports = systemQ.data.recentImports || [];
  const health = healthQ.data || [];
  const importReady = health.filter((item) => ['mysql', 'uploads'].includes(item.serviceKey)).every((item) => item.status === 'UP');

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1650px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">导入与批量维护</h1>
            <p className="mt-1 text-sm text-muted-foreground">这里处理课程导入、批量调整入口与维护记录；真正的业务对象编辑仍回到课程 / 团队 / 项目后台执行。</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={importReady ? 'default' : 'secondary'}>{importReady ? '导入环境就绪' : '导入环境待处理'}</Badge>
            <Badge variant="outline">课程 {coursesQ.data?.length || 0}</Badge>
            <Badge variant="outline">最近导入 {imports.length}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operationCards.map((item) => (
            <Card key={item.title} className="border-muted/70">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 font-medium"><item.icon size={16} />{item.title}</div>
                <div className="mt-3 text-sm text-muted-foreground">{item.description}</div>
                <Button variant="outline" className="mt-4 w-full" onClick={() => nav(item.href)}>{item.action}</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FolderInput size={16} />课程导入入口</CardTitle></CardHeader>
            <CardContent>
              {!coursesQ.data?.length ? (
                <PageEmpty title="暂无课程" message="请先在课程管理中新建课程，再进行学生批量导入。" icon={GraduationCap} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">课程</th>
                        <th className="px-3 py-2 font-medium">班级码</th>
                        <th className="px-3 py-2 font-medium">教师</th>
                        <th className="px-3 py-2 font-medium">学生</th>
                        <th className="px-3 py-2 font-medium">团队 / 项目</th>
                        <th className="px-3 py-2 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursesQ.data.map((course) => (
                        <tr key={course.id} className="border-b last:border-b-0">
                          <td className="px-3 py-3 font-medium">{course.name}</td>
                          <td className="px-3 py-3 text-muted-foreground">{course.classCode}</td>
                          <td className="px-3 py-3 text-muted-foreground">{course.teacherName || '未分配'}</td>
                          <td className="px-3 py-3">{course.memberCount}</td>
                          <td className="px-3 py-3 text-muted-foreground">团队 {course.teamCount || 0} · 项目 {course.projectCount || 0}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => nav(`/app/admin/courses/${course.id}/overview`)}>课程详情</Button>
                              <Button size="sm" onClick={() => nav(`/app/admin/courses/${course.id}/import`)}>进入导入</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/70">
            <CardHeader className="pb-3"><CardTitle className="text-base">导入前置检查</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {health.filter((item) => ['mysql', 'uploads', 'backend'].includes(item.serviceKey)).map((item) => (
                <div key={item.serviceKey} className="rounded-2xl border px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{item.label}</div>
                    <Badge variant={item.status === 'UP' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">{item.detail}</div>
                </div>
              ))}
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                导入失败、文件权限或数据库问题，请直接跳转 <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => nav('/app/admin/system')}>系统控制</button> 查看真实状态与维护动作。
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-muted/70">
          <CardHeader className="pb-3"><CardTitle className="text-base">最近导入记录</CardTitle></CardHeader>
          <CardContent>
            {!imports.length ? (
              <PageEmpty title="暂无导入历史" message="执行过课程导入后，这里会显示结果与失败信息。" icon={FolderInput} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">课程</th>
                      <th className="px-3 py-2 font-medium">文件</th>
                      <th className="px-3 py-2 font-medium">状态</th>
                      <th className="px-3 py-2 font-medium">结果</th>
                      <th className="px-3 py-2 font-medium">操作者</th>
                      <th className="px-3 py-2 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((job) => (
                      <tr key={job.id} className="border-b last:border-b-0">
                        <td className="px-3 py-3 font-medium">{job.courseName || '未关联课程'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{job.fileName || '导入文件'}</td>
                        <td className="px-3 py-3"><Badge variant="outline">{job.status}</Badge></td>
                        <td className="px-3 py-3 text-muted-foreground">导入 {job.importedRows || 0} · 跳过 {job.skippedRows || 0} · 创建 {job.createdUsersCount || 0}</td>
                        <td className="px-3 py-3 text-muted-foreground">{job.createdByName || '管理员'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{job.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
