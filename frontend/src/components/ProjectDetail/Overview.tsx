import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, MessageSquare, FileText, GitCommit, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectDetail } from '@/lib/types';

export function Overview({ detail }: { detail: ProjectDetail }) {
  const nav = useNavigate();
  const isCode = detail.project.type === 'CODE';
  const completedTasks = detail.tasks.filter((t) => t.status === 'DONE').length;
  const progress = detail.tasks.length > 0 ? Math.round((completedTasks / detail.tasks.length) * 100) : detail.project.progress;

  const statusLabel = {
    TODO: '待开始',
    IN_PROGRESS: '进行中',
    REVIEW: '待验收',
    DONE: '已完成',
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">项目进度</CardTitle>
                <p className="text-sm text-muted-foreground">基于任务完成情况自动计算</p>
              </div>
              <Badge variant={isCode ? 'default' : 'secondary'}>{isCode ? '代码项目' : '非代码项目'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{progress}%</span>
              <span className="text-sm text-muted-foreground">
                已完成 {completedTasks} / {detail.tasks.length} 项任务
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-4">
              <StatItem icon={CheckSquare} label="任务" value={detail.stats.taskCount} />
              <StatItem icon={MessageSquare} label="讨论" value={detail.stats.discussionCount} />
              <StatItem icon={FileText} label="文档" value={detail.stats.documentCount} />
              {isCode && <StatItem icon={GitCommit} label="提交" value={detail.stats.commitCount} />}
            </div>
          </CardContent>
        </Card>

        {/* Team Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
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
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-dashed">
                <TrendingUp size={16} />
              </Button>
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">课程</p>
              <p className="text-sm font-bold mt-1">{detail.project.courseName || '—'}</p>
              <p className="text-xs text-muted-foreground mt-1">团队：{detail.project.teamName || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">最近任务</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => nav(`/app/projects/${detail.project.id}/tasks`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      task.status === 'DONE' ? 'bg-green-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : task.status === 'REVIEW' ? 'bg-amber-500' : 'bg-gray-400',
                    )}
                  />
                  <span className="text-sm font-medium line-clamp-1">{task.title}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {statusLabel[task.status]}
                </Badge>
              </div>
            ))}
            {!detail.tasks.length && <p className="text-sm text-muted-foreground">暂无任务。</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">最近讨论</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => nav(`/app/projects/${detail.project.id}/discussions`)}>
              查看全部 <ArrowRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.discussions.slice(0, 5).map((disc) => (
              <div key={disc.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{(disc.authorName || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none line-clamp-1">{disc.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{disc.content}</p>
                </div>
              </div>
            ))}
            {!detail.discussions.length && <p className="text-sm text-muted-foreground">暂无讨论。</p>}
          </CardContent>
        </Card>

        {isCode && (
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最近提交</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => nav(`/app/projects/${detail.project.id}/repository/commits`)}>
                查看全部 <ArrowRight size={12} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-0">
              {detail.commits.slice(0, 5).map((commit, idx) => (
                <div key={commit.hash} className={cn('flex items-center justify-between py-3', idx !== 4 && 'border-b')}>
                  <div className="flex items-center gap-3">
                    <GitCommit size={16} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{commit.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {commit.authorName} · 分支 <span className="font-mono">{commit.branch}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{commit.hash}</code>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {commit.createdAt}
                    </span>
                  </div>
                </div>
              ))}
              {!detail.commits.length && <p className="text-sm text-muted-foreground py-3">暂无提交。</p>}
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
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon size={16} />
      </div>
      <span className="text-sm font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
