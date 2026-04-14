import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus, ArrowRight } from 'lucide-react';
import { PageHero } from '@/screens/shell/PageHero';
import { useApi } from '@/app/api';
import { setTitle } from '@/app/title';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ProjectsPage() {
  const api = useApi();
  const nav = useNavigate();

  React.useEffect(() => setTitle(['项目']), []);

  const q = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const projects = q.data || [];

  return (
    <div>
      <PageHero
        title="项目"
        subtitle="进入项目工作区，管理任务、讨论、文档与仓库。"
        actions={
          <Button className="gap-2" onClick={() => nav('/app/projects/new')}>
            <Plus size={14} /> 新建项目
          </Button>
        }
        right={
          <div className="hidden md:flex items-center gap-3 p-3 rounded-2xl bg-white border shadow-sm">
            <FolderKanban size={16} className="text-primary" />
            <div className="text-xs text-muted-foreground">每个项目都是一个完整工作台。</div>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1500px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((p) => (
              <Card key={p.id} className="group hover:shadow-md transition-all border-muted/60 overflow-hidden cursor-pointer" onClick={() => nav(`/app/projects/${p.id}/overview`)}>
                <div className={cn('h-1.5', p.type === 'CODE' ? 'bg-primary' : 'bg-emerald-500')} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15">
                      {p.type === 'CODE' ? '代码项目' : '非代码项目'}
                    </Badge>
                    <span className="text-[10px] font-semibold text-muted-foreground">{p.courseName}</span>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{p.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-bold">{p.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/10 py-3 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span className="truncate">{p.teamName}</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    打开 <ArrowRight size={12} />
                  </span>
                </CardFooter>
              </Card>
            ))}

            {!q.isLoading && !projects.length && (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="p-10 text-center text-muted-foreground">
                  还没有项目。点击「新建项目」创建你的第一个项目工作区。
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

