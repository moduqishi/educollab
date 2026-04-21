import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderKanban, Layers3, Search, X } from 'lucide-react';
import { PageHero } from '@/screens/shell/PageHero';
import { useApi } from '@/app/api';
import { useAuth } from '@/app/auth';
import { setTitle } from '@/app/title';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProjectRecord, TaskRecord } from '@/lib/types';

type CourseOption = {
  courseId: number;
  courseName: string;
  count: number;
};

type ProjectCourseSection = {
  courseId: number;
  courseName: string;
  projects: ProjectRecord[];
};

const projectStatusLabel: Record<string, string> = {
  ACTIVE: '进行中',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
};

export function ProjectsPage() {
  const api = useApi();
  const nav = useNavigate();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = React.useState(params.get('q') || '');

  React.useEffect(() => setTitle(['项目']), []);

  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });

  const isTeacher = session?.profile.role === 'TEACHER';
  const selectedCourseId = Number(params.get('courseId') || '');
  const normalizedKeyword = keyword.trim().toLowerCase();

  const allProjects = React.useMemo(
    () =>
      (projectsQ.data || []).slice().sort((left, right) => {
        const courseCompare = (left.courseName || '').localeCompare(right.courseName || '', 'zh-CN');
        if (courseCompare !== 0) return courseCompare;
        const leftGroup = extractGroupOrder(left.teamName);
        const rightGroup = extractGroupOrder(right.teamName);
        if (leftGroup !== rightGroup) return leftGroup - rightGroup;
        return (right.createdAt || '').localeCompare(left.createdAt || '');
      }),
    [projectsQ.data],
  );

  const courseOptions = React.useMemo<CourseOption[]>(() => {
    const grouped = new Map<number, CourseOption>();
    allProjects.forEach((project) => {
      const courseId = project.courseId ?? -1;
      const courseName = project.courseName || '未关联课程';
      const current = grouped.get(courseId) || { courseId, courseName, count: 0 };
      current.count += 1;
      grouped.set(courseId, current);
    });
    return Array.from(grouped.values()).sort((left, right) => left.courseName.localeCompare(right.courseName, 'zh-CN'));
  }, [allProjects]);

  const visibleProjects = React.useMemo(() => {
    return allProjects.filter((project) => {
      if (Number.isFinite(selectedCourseId) && selectedCourseId > 0 && project.courseId !== selectedCourseId) return false;
      if (!normalizedKeyword) return true;
      const haystack = `${project.name} ${project.description || ''} ${project.courseName || ''} ${project.teamName || ''}`.toLowerCase();
      return haystack.includes(normalizedKeyword);
    });
  }, [allProjects, normalizedKeyword, selectedCourseId]);

  const sections = React.useMemo<ProjectCourseSection[]>(() => {
    const grouped = new Map<string, ProjectCourseSection>();
    visibleProjects.forEach((project) => {
      const courseId = project.courseId ?? -1;
      const courseName = project.courseName || '未关联课程';
      const key = `${courseId}-${courseName}`;
      if (!grouped.has(key)) {
        grouped.set(key, { courseId, courseName, projects: [] });
      }
      grouped.get(key)!.projects.push(project);
    });
    return Array.from(grouped.values());
  }, [visibleProjects]);

  const taskMap = React.useMemo(() => summarizeTasks(tasksQ.data || []), [tasksQ.data]);

  const stats = React.useMemo(() => {
    const total = visibleProjects.length;
    const active = visibleProjects.filter((project) => project.status === 'ACTIVE').length;
    const completed = visibleProjects.filter((project) => project.status === 'COMPLETED').length;
    const openTasks = visibleProjects.reduce((sum, project) => sum + (taskMap.get(project.id)?.open || 0), 0);
    return { total, active, completed, openTasks, courseCount: sections.length };
  }, [sections.length, taskMap, visibleProjects]);

  const setCourseFilter = (courseId?: number) => {
    const next = new URLSearchParams(params);
    if (courseId && courseId > 0) next.set('courseId', String(courseId));
    else next.delete('courseId');
    setParams(next);
  };

  const setKeywordFilter = (value: string) => {
    setKeyword(value);
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('q', value);
    else next.delete('q');
    setParams(next);
  };

  return (
    <div>
      <PageHero
        title={isTeacher ? '课程项目' : '我的项目'}
        subtitle={
          isTeacher
            ? '直接按课程筛选和浏览项目，不再先点课程再跳到下一层。'
            : '这里只显示你真正参与的项目，按课程直接筛选和进入。'
        }
        actions={
          <div className="flex w-full max-w-[1120px] flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={keyword}
                onChange={setKeywordFilter}
                placeholder={isTeacher ? '搜索项目名、课程名或团队名...' : '搜索项目名或团队名...'}
              />
              <HeaderStat label="项目" value={stats.total} />
              <HeaderStat label="进行中" value={stats.active} />
              {!isTeacher ? <HeaderStat label="未完成任务" value={stats.openTasks} /> : null}
              {isTeacher ? <HeaderStat label="已完成" value={stats.completed} /> : null}
              {isTeacher ? <HeaderStat label="课程" value={stats.courseCount} /> : null}
            </div>
            <CourseFilterBar
              options={courseOptions}
              selectedCourseId={Number.isFinite(selectedCourseId) ? selectedCourseId : undefined}
              onChange={setCourseFilter}
            />
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px] space-y-8">
          {sections.map((section) => (
            <section key={`${section.courseId}-${section.courseName}`} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-display font-semibold">{section.courseName}</h2>
                    <Badge variant="outline">{section.projects.length} 个项目</Badge>
                    {!isTeacher ? (
                      <Badge variant="outline">
                        {section.projects.reduce((sum, project) => sum + (taskMap.get(project.id)?.open || 0), 0)} 个未完成任务
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isTeacher ? '同一课程项目直接平铺展示，便于横向比较各组推进情况。' : '当前课程下你参与的项目都直接列在这里。'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {section.projects.map((project) => (
                  <ProjectWorkbenchCard
                    key={project.id}
                    project={project}
                    taskSummary={taskMap.get(project.id) || { total: 0, open: 0 }}
                    onOpen={() => nav(`/app/projects/${project.id}/overview`)}
                    isTeacher={isTeacher}
                  />
                ))}
              </div>
            </section>
          ))}

          {!projectsQ.isLoading && !sections.length ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="rounded-full bg-muted/40 p-4 text-muted-foreground">
                  <FolderKanban size={24} />
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold">
                    {allProjects.length
                      ? '当前筛选下没有项目'
                      : isTeacher
                        ? '当前还没有课程项目'
                        : '你当前还没有参与项目'}
                  </div>
                  <div className="max-w-[520px] text-sm text-muted-foreground">
                    {allProjects.length
                      ? '试试切换课程筛选或清空搜索条件。'
                      : isTeacher
                        ? '先在课程团队中创建项目，项目会直接出现在这里。'
                        : '加入团队或被加入项目后，你的项目会直接出现在这里。'}
                  </div>
                </div>
                {(selectedCourseId > 0 || keyword) && allProjects.length ? (
                  <Button variant="outline" onClick={() => {
                    setKeywordFilter('');
                    setCourseFilter();
                  }}>
                    清空筛选
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-[360px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-2xl pl-9 pr-9" />
      {value ? (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-muted/70 bg-background px-3 py-1.5 text-xs text-muted-foreground">
      {label} <span className="ml-1 font-semibold text-foreground">{value}</span>
    </div>
  );
}

function CourseFilterBar({
  options,
  selectedCourseId,
  onChange,
}: {
  options: CourseOption[];
  selectedCourseId?: number;
  onChange: (courseId?: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={selectedCourseId ? 'outline' : 'default'}
        size="sm"
        className="rounded-full"
        onClick={() => onChange()}
      >
        全部课程
      </Button>
      {options.map((option) => (
        <Button
          key={`${option.courseId}-${option.courseName}`}
          type="button"
          variant={selectedCourseId === option.courseId ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => onChange(option.courseId)}
        >
          {option.courseName}
          <span className="ml-1 opacity-70">{option.count}</span>
        </Button>
      ))}
    </div>
  );
}

function ProjectWorkbenchCard({
  project,
  taskSummary,
  onOpen,
  isTeacher,
}: {
  project: ProjectRecord;
  taskSummary: { total: number; open: number };
  onOpen: () => void;
  isTeacher: boolean;
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-3xl border-muted/60 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('h-1.5', project.type === 'CODE' ? 'bg-primary' : 'bg-emerald-500')} />
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
              {project.type === 'CODE' ? '代码项目' : '非代码项目'}
            </Badge>
            <Badge variant="outline">{projectStatusLabel[project.status] || project.status}</Badge>
          </div>
          <span className="text-sm font-semibold text-foreground">{project.progress}%</span>
        </div>
        <div className="space-y-2">
          <CardTitle className="line-clamp-2 text-xl transition-colors group-hover:text-primary">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2 text-sm">{project.description || '暂无项目说明'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <InfoPill label="课程" value={project.courseName || '未关联课程'} />
          <InfoPill label="团队" value={project.teamName || '未关联团队'} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="任务总数" value={taskSummary.total} />
          <MetricCard label={isTeacher ? '未完成任务' : '待你推进'} value={taskSummary.open} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>项目进度</span>
            <span>{project.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t bg-muted/10 py-4">
        <span className="text-xs text-muted-foreground">
          {isTeacher ? `组序 ${formatGroupLabel(project.teamName)}` : project.createdAt ? `创建于 ${project.createdAt}` : '项目工作区'}
        </span>
        <Button size="sm" className="rounded-full" onClick={onOpen}>
          进入项目
          <ArrowRight size={14} className="ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
      <Layers3 size={12} />
      <span>{label}：</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function summarizeTasks(tasks: TaskRecord[]) {
  const map = new Map<number, { total: number; open: number }>();
  tasks.forEach((task) => {
    const summary = map.get(task.projectId) || { total: 0, open: 0 };
    summary.total += 1;
    if (task.status !== 'DONE') summary.open += 1;
    map.set(task.projectId, summary);
  });
  return map;
}

function extractGroupOrder(teamName?: string | null) {
  if (!teamName) return Number.MAX_SAFE_INTEGER;
  const match = teamName.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function formatGroupLabel(teamName?: string | null) {
  const order = extractGroupOrder(teamName);
  return Number.isFinite(order) && order !== Number.MAX_SAFE_INTEGER ? `第 ${order} 组` : '未标注';
}
