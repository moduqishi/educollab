import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, FileText, FolderKanban, GitBranch, GraduationCap, MessageSquare, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/app/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { AdminPanel, AdminStatGrid } from './admin-layout';
import { buildAdminOverrideUrl } from '@/components/admin/AdminOverrideBanner';

export function AdminContentHubPage() {
  const api = useApi();
  const navigate = useNavigate();
  const overviewQ = useQuery({ queryKey: ['adminOverview'], queryFn: () => api.adminOverview() });
  const coursesQ = useQuery({ queryKey: ['adminCourses'], queryFn: () => api.adminCourses() });
  const teamsQ = useQuery({ queryKey: ['adminTeams'], queryFn: () => api.adminTeams() });
  const projectsQ = useQuery({ queryKey: ['adminProjects'], queryFn: () => api.adminProjects() });

  if (overviewQ.isLoading || coursesQ.isLoading || teamsQ.isLoading || projectsQ.isLoading) return <PageLoading label="正在加载内容治理入口台..." />;
  if (overviewQ.isError || coursesQ.isError || teamsQ.isError || projectsQ.isError) return <PageError title="内容治理入口加载失败" onRetry={() => { void overviewQ.refetch(); void coursesQ.refetch(); void teamsQ.refetch(); void projectsQ.refetch(); }} />;

  const overview = overviewQ.data;
  const courses = coursesQ.data || [];
  const teams = teamsQ.data || [];
  const projects = projectsQ.data || [];
  const latestCourse = courses[0];
  const latestTeam = teams[0];
  const latestProject = projects[0];

  return (
    <div className="space-y-6">
      <AdminStatGrid
        columns="xl:grid-cols-4"
        items={[
          { label: '课程入口', value: courses.length, hint: '按课程进入全部前台界面' },
          { label: '团队入口', value: teams.length, hint: '从课程继续下钻到团队' },
          { label: '项目入口', value: projects.length, hint: '直接进入项目真实业务界面' },
          { label: '待处理异常', value: overview.pendingItems.length, hint: '异常仅作为辅助入口', tone: overview.pendingItems.length ? 'danger' : 'success' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminPanel title="结构入口" description="先按课程 → 团队 → 项目定位，再进入前台真实页面处理。">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <EntryCard icon={GraduationCap} title="课程入口" description="进入课程概览、成员、团队、项目、作业、文件。" actionLabel="打开课程入口" onClick={() => navigate('/app/admin/content/courses')} />
            <EntryCard icon={Users} title="团队入口" description="按课程联动查看团队、成员、项目、任务与文件。" actionLabel="打开团队入口" onClick={() => navigate('/app/admin/content/teams')} />
            <EntryCard icon={FolderKanban} title="项目入口" description="直接进入项目概览、任务、讨论、文件、仓库、总结。" actionLabel="打开项目入口" onClick={() => navigate('/app/admin/content/projects')} />
            <EntryCard icon={Shield} title="用户入口" description="用户暂无前台业务壳，继续走后台用户管理与关系维护。" actionLabel="打开用户管理" onClick={() => navigate('/app/admin/users')} />
          </div>
        </AdminPanel>

        <AdminPanel title="内容入口" description="全局检索各类内容，再跳回所属课程、团队、项目的真实界面。">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <EntryCard icon={BookOpen} title="任务" description="全局定位任务并跳到所属项目任务页。" actionLabel="任务入口" onClick={() => navigate('/app/admin/content/tasks')} />
            <EntryCard icon={MessageSquare} title="讨论" description="全局定位讨论并回到项目讨论页。" actionLabel="讨论入口" onClick={() => navigate('/app/admin/content/discussions')} />
            <EntryCard icon={FileText} title="作业与文档" description="从课程作业页和项目文档页接管全部内容。" actionLabel="作业入口" onClick={() => navigate('/app/admin/content/assignments')} secondaryActionLabel="文档入口" onSecondaryClick={() => navigate('/app/admin/content/documents')} />
            <EntryCard icon={GitBranch} title="文件与仓库" description="按课程、团队、项目打开 Explorer 和仓库页。" actionLabel="文件入口" onClick={() => navigate('/app/admin/content/files')} secondaryActionLabel="仓库入口" onSecondaryClick={() => navigate('/app/admin/content/repositories')} />
          </div>
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <AdminPanel title="管理员快捷接管" description="直接进入前台真实界面，以管理员接管态工作。">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <QuickJump label="进入课程前台" hint={latestCourse ? latestCourse.name : '暂无课程'} href={latestCourse ? buildAdminOverrideUrl(`/app/classes/${latestCourse.id}/overview`, '/app/admin/content') : '/app/admin/content/courses'} onNavigate={navigate} />
            <QuickJump label="进入团队前台" hint={latestTeam ? latestTeam.name : '暂无团队'} href={latestTeam ? buildAdminOverrideUrl(`/app/teams/${latestTeam.id}/overview`, '/app/admin/content') : '/app/admin/content/teams'} onNavigate={navigate} />
            <QuickJump label="进入项目前台" hint={latestProject ? latestProject.name : '暂无项目'} href={latestProject ? buildAdminOverrideUrl(`/app/projects/${latestProject.id}/overview`, '/app/admin/content') : '/app/admin/content/projects'} onNavigate={navigate} />
            <QuickJump label="进入全局文档" hint="管理员直接接管前台文档页" href={buildAdminOverrideUrl('/app/documents', '/app/admin/content')} onNavigate={navigate} />
            <QuickJump label="进入全局待办" hint="管理员直接接管前台待办页" href={buildAdminOverrideUrl('/app/tasks', '/app/admin/content')} onNavigate={navigate} />
            <QuickJump label="进入管理员存储页" hint="文件、仓库、系统目录仍可从后台入口处理" href="/app/admin/storage" onNavigate={navigate} />
          </div>
        </AdminPanel>

        <AdminPanel title="异常与待处理" description="异常只作为辅区，用于发现问题后跳回结构页处理。">
          {!overview.pendingItems.length ? (
            <PageEmpty title="暂无待处理异常" message="当前没有需要优先介入的异常结构。" icon={AlertTriangle} />
          ) : (
            <div className="space-y-3">
              {overview.pendingItems.map((item) => (
                <button key={item.key} type="button" onClick={() => item.href && navigate(item.href)} className="w-full rounded-2xl border border-muted/70 px-4 py-3 text-left transition-colors hover:bg-muted/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.level ? <Badge variant={item.level === 'HIGH' ? 'destructive' : 'outline'}>{item.level}</Badge> : null}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.detail}</div>
                </button>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}

function EntryCard({ icon: Icon, title, description, actionLabel, onClick, secondaryActionLabel, onSecondaryClick }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string; actionLabel: string; onClick: () => void; secondaryActionLabel?: string; onSecondaryClick?: () => void; }) {
  return (
    <div className="rounded-2xl border border-muted/70 p-4">
      <div className="flex items-center gap-2 font-medium"><Icon size={16} className="text-muted-foreground" />{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onClick}>{actionLabel}</Button>
        {secondaryActionLabel && onSecondaryClick ? <Button size="sm" variant="ghost" onClick={onSecondaryClick}>{secondaryActionLabel}</Button> : null}
      </div>
    </div>
  );
}

function QuickJump({ label, hint, href, onNavigate }: { label: string; hint: string; href: string; onNavigate: (to: string) => void; }) {
  return (
    <button type="button" onClick={() => onNavigate(href)} className="rounded-2xl border border-muted/70 p-4 text-left transition-colors hover:bg-muted/30">
      <div className="font-medium">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
    </button>
  );
}
