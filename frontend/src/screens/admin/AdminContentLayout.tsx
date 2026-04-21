import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, FileText, FolderKanban, GitBranch, GraduationCap, LayoutDashboard, MessageSquare, ShieldAlert, Users } from 'lucide-react';
import { setTitle } from '@/app/title';
import { cn } from '@/lib/utils';
import { AdminPageIntro, AdminPanel, AdminStatGrid } from './admin-layout';

const tabs = [
  { to: '/app/admin/content', exact: true, label: '入口总览', icon: LayoutDashboard, description: '课程、团队、项目、内容和管理员接管入口总览。' },
  { to: '/app/admin/content/courses', label: '课程入口', icon: GraduationCap, description: '从课程进入成员、团队、项目、作业、文件。' },
  { to: '/app/admin/content/teams', label: '团队入口', icon: Users, description: '按课程下钻团队并进入团队前台界面。' },
  { to: '/app/admin/content/projects', label: '项目入口', icon: FolderKanban, description: '直接进入项目概览、任务、讨论、文件、仓库。' },
  { to: '/app/admin/content/tasks', label: '任务入口', icon: BookOpen, description: '全局定位任务并回到所属项目任务页。' },
  { to: '/app/admin/content/discussions', label: '讨论入口', icon: MessageSquare, description: '全局定位讨论并回到项目讨论页。' },
  { to: '/app/admin/content/assignments', label: '作业入口', icon: BookOpen, description: '从全局作业列表直接进入课程作业页。' },
  { to: '/app/admin/content/documents', label: '文档入口', icon: FileText, description: '全局定位文档并回到项目文档工作台。' },
  { to: '/app/admin/content/files', label: '文件入口', icon: FileText, description: '打开课程、团队、项目的前台 Explorer。' },
  { to: '/app/admin/content/repositories', label: '仓库入口', icon: GitBranch, description: '从代码项目直接进入真实仓库页。' },
];

export function AdminContentLayout() {
  const location = useLocation();

  React.useEffect(() => {
    setTitle(['系统管理', '内容治理']);
  }, []);

  const activePath = location.pathname;

  return (
    <div className="px-8 py-8 pb-10">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <AdminPageIntro
          eyebrow="系统管理员 / 内容治理"
          title="管理员业务入口与全局治理台"
          description="这里不再只是任务、讨论、作业、文档的异常清理页，而是管理员进入课程、团队、项目以及全部前台真实业务界面的中枢。"
        />

        <AdminStatGrid
          columns="xl:grid-cols-4"
          items={[
            { label: '主结构', value: '课程 → 团队 → 项目', hint: '所有内容入口都应挂回结构链路。', tone: 'success' },
            { label: '工作方式', value: '入口台 + 前台接管', hint: '在这里定位，在真实业务界面中处理。' },
            { label: '管理员权限', value: '最高权限', hint: '可查看并编辑全部课程、团队、项目与内容。', tone: 'success' },
            { label: '异常定位', value: '辅区保留', hint: '异常仍展示，但不再作为主叙事。', tone: 'danger' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <AdminPanel title="业务入口导航" description="先按结构和内容入口定位，再进入前台真实界面。">
            <div className="space-y-3">
              {tabs.map((tab) => {
                const active = tab.exact ? activePath === tab.to : activePath === tab.to || activePath.startsWith(`${tab.to}/`);
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.exact}
                    className={cn('block rounded-2xl border p-4 transition-colors hover:bg-muted/30', active && 'border-primary bg-primary/5')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 rounded-xl border p-2', active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-muted text-muted-foreground')}>
                        <tab.icon size={16} />
                      </div>
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{tab.description}</div>
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </AdminPanel>

          <div className="space-y-6">
            <AdminPanel title="治理原则" description="管理员内容治理以结构定位、前台接管和全局检索为核心。">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <RuleCard title="先看结构再看内容" description="课程、团队、项目仍是主轴，任务、讨论、作业、文档只是入口切面。" />
                <RuleCard title="直接进入前台" description="管理员从这里直接打开真实课程、团队、项目界面，而不是停留在后台摘要壳。" />
                <RuleCard title="管理员接管态" description="前台界面保持不变，但管理员条幅、返回链路和最高权限必须明确可见。" />
                <RuleCard title="异常作为辅区" description="孤儿内容、缺归属、状态异常仍可展示，但不再主导页面结构。" icon={ShieldAlert} />
              </div>
            </AdminPanel>

            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleCard({ title, description, icon: Icon }: { title: string; description: string; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  const FinalIcon = Icon || LayoutDashboard;
  return (
    <div className="rounded-2xl border border-muted/70 p-4">
      <div className="flex items-center gap-2 font-medium">
        <FinalIcon size={16} className="text-muted-foreground" />
        {title}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
