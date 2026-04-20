import React from 'react';
import { ArrowRight, Calendar, Plus, Search, UserCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageEmpty, PageError, PageLoading } from '@/screens/common/States';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { taskPriorityLabel, taskStatusLabel } from '@/components/tasks/TaskFormPage';

export function TasksPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  React.useEffect(() => setTitle(['任务']), []);

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: () => api.tasks() });

  if (tasksQ.isLoading) return <PageLoading label="正在加载任务..." />;
  if (tasksQ.isError) return <PageError title="任务加载失败" onRetry={() => tasksQ.refetch()} />;

  const tasks = (tasksQ.data || []).filter(t =>
    !search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase()) || (t.projectName || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div>
      <PageHero
        title="任务"
        subtitle="点击任务卡片会进入独立编辑页，不再使用小弹窗。"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* 搜索栏 */}
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索任务标题..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{tasks.length} 个任务</span>
            <Button className="gap-2 ml-auto" onClick={() => navigate('/app/tasks/new')}>
              <Plus size={16} />
              新建任务
            </Button>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px]">
          {!tasks.length ? (
            <PageEmpty
              title="还没有任务"
              message="先创建一条任务，或者进入项目把工作拆分出来。"
              action={
                <Button className="gap-2" onClick={() => navigate('/app/tasks/new')}>
                  <Plus size={16} />
                  新建任务
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="cursor-pointer text-left"
                  onClick={() => navigate(`/app/tasks/${task.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/app/tasks/${task.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Card className="h-full border-muted/70 transition hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{task.title}</CardTitle>
                          <div className="mt-1 truncate text-sm text-muted-foreground">
                            {task.projectName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{taskStatusLabel[task.status]}</Badge>
                          <Badge variant={task.priority === 'HIGH' ? 'default' : 'secondary'}>
                            {taskPriorityLabel[task.priority]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="line-clamp-3 text-muted-foreground">
                        {task.description || '暂无描述'}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserCircle2 size={12} />
                          {task.assigneeName || '未指派'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {task.dueDate || '未设置截止日期'}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/app/projects/${task.projectId}/tasks/${task.id}`);
                          }}
                        >
                          进入项目任务页
                          <ArrowRight size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
