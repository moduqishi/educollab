import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  Clock,
  FileText,
  GitCommit,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectDetail, TaskRecord } from '@/lib/types';

const taskStatusLabel: Record<TaskRecord['status'], string> = {
  TODO: '待开始',
  IN_PROGRESS: '进行中',
  REVIEW: '待验收',
  DONE: '已完成',
};

export function Overview({ detail }: { detail: ProjectDetail }) {
  const nav = useNavigate();
  const isCode = detail.project.type === 'CODE';
  const completedTasks = detail.tasks.filter((task) => task.status === 'DONE').length;
  const progress = detail.project.progress;
  const recentTasks = detail.tasks.slice(0, 5);
  const recentDiscussions = detail.discussions.slice(0, 5);
  const recentCommits = detail.commits.slice(0, 5);
  const recentDocuments = detail.documents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-muted/60 md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">项目进度</CardTitle>
                <p className="text-sm text-muted-foreground">基于当前任务完成情况自动汇总。</p>
              </div>
              <Badge variant={isCode ? 'default' : 'secondary'}>{isCode ? '代码项目' : '非代码项目'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-bold">{progress}%</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  已完成 {completedTasks} / {detail.tasks.length} 项任务
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <StatItem icon={CheckSquare} label="任务" value={detail.stats.taskCount} />
                <StatItem icon={MessageSquare} label="讨论" value={detail.stats.discussionCount} />
                <StatItem icon={FileText} label="文档" value={detail.stats.documentCount} />
                <StatItem icon={isCode ? GitCommit : TrendingUp} label={isCode ? '提交' : '进度'} value={isCode ? detail.stats.commitCount : progress} />
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users size={18} /> 团队成员
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {detail.members.slice(0, 8).map((user) => (
                <Avatar key={user.id} className="border-2 border-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{(user.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">课程</p>
              <p className="mt-1 text-sm font-bold">{detail.project.courseName || '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">团队：{detail.project.teamName || '—'}</p>
              <p className="mt-1 text-xs text-muted-foreground">创建于 {detail.project.createdAt}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={cn('grid grid-cols-1 gap-6', isCode ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <Card className={cn('border-muted/60', !isCode && 'lg:col-span-1')}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">最近任务</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        task.status === 'DONE'
                          ? 'bg-green-500'
                          : task.status === 'IN_PROGRESS'
                            ? 'bg-blue-500'
                            : task.status === 'REVIEW'
                              ? 'bg-amber-500'
                              : 'bg-gray-400',
                      )}
                    />
                    <span className="line-clamp-1 text-sm font-medium">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {taskStatusLabel[task.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{task.assigneeName || '未指派'}</span>
                  <span>{task.milestoneTitle || '项目任务'}</span>
                  <span>{task.dueDate || '未设置截止日期'}</span>
                </div>
              </div>
            ))}
            {!recentTasks.length && <p className="text-sm text-muted-foreground">暂无任务。</p>}
          </CardContent>
        </Card>

        <Card className="border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">最近讨论</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => nav(`/app/projects/${detail.project.id}/discussions`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDiscussions.map((discussion) => (
              <div key={discussion.id} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{(discussion.authorName || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium leading-none">{discussion.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{discussion.content}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{discussion.authorName}</span>
                    <span>{discussion.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
            {!recentDiscussions.length && <p className="text-sm text-muted-foreground">暂无讨论。</p>}
          </CardContent>
        </Card>

        {isCode ? (
          <Card className="border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最近提交</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => nav(`/app/projects/${detail.project.id}/repository/commits`)}>
                查看全部 <ArrowRight size={12} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-0">
              {recentCommits.map((commit, idx) => (
                <div key={commit.hash} className={cn('flex items-center justify-between py-3', idx !== recentCommits.length - 1 && 'border-b')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <GitCommit size={16} className="text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{commit.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {commit.authorName} · 分支 <span className="font-mono">{commit.branch}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{commit.hash}</code>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={10} /> {commit.createdAt}
                    </span>
                  </div>
                </div>
              ))}
              {!recentCommits.length && <p className="py-3 text-sm text-muted-foreground">暂无提交。</p>}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最近文档</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => nav(`/app/projects/${detail.project.id}/documents`)}>
                查看全部 <ArrowRight size={12} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-medium">{doc.title}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{doc.excerpt || '暂无摘要'}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{doc.updatedAt}</div>
                    </div>
                  </div>
                </div>
              ))}
              {!recentDocuments.length && <p className="text-sm text-muted-foreground">暂无文档。</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={16} />
      </div>
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
