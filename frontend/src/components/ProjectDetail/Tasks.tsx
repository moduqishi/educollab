import React from 'react';
import { Calendar, Plus, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectDetail } from '@/lib/types';
import { taskPriorityLabel, taskStatusLabel } from '@/components/tasks/TaskFormPage';

export function Tasks({ detail }: { detail: ProjectDetail }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display font-bold">项目任务</h3>
          <p className="text-muted-foreground">
            这里的任务卡片会直接跳转到任务编辑页，不再使用弹窗。
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate(`/app/projects/${detail.project.id}/tasks/new`)}
        >
          <Plus size={16} />
          新建任务
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {detail.tasks.map((task) => (
          <div
            key={task.id}
            className="cursor-pointer text-left"
            onClick={() => navigate(`/app/projects/${detail.project.id}/tasks/${task.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/app/projects/${detail.project.id}/tasks/${task.id}`);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Card className="h-full border-muted/60 transition hover:border-primary/40 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {task.assigneeName || '未指派负责人'}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {taskStatusLabel[task.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {task.description || '暂无描述'}
                </p>
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
              </CardContent>
              <CardFooter className="border-t bg-muted/10 py-3">
                <Badge variant={task.priority === 'HIGH' ? 'default' : 'secondary'}>
                  {taskPriorityLabel[task.priority]}
                </Badge>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>

      {!detail.tasks.length ? (
        <p className="text-sm text-muted-foreground">
          当前还没有任务。点击右上角“新建任务”开始拆分工作。
        </p>
      ) : null}
    </div>
  );
}
