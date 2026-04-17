import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [params] = useSearchParams();

  React.useEffect(() => setTitle(['项目']), []);

  const q = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });
  const keyword = params.get('q')?.trim().toLowerCase() || '';
  const projects = (q.data || []).filter((project) => {
    if (!keyword) return true;
    return project.name.toLowerCase().includes(keyword);
  });

  return (
    <div>
      <PageHero
        title="项目"
        subtitle="进入项目工作区，统一管理任务、讨论、文档与代码仓库。"
        actions={
          <Button className="gap-2" onClick={() => nav('/app/classes')}>
            <Plus size={14} /> 从课程团队创建项目
          </Button>
        }
        right={
          <div className="hidden items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm md:flex">
            <FolderKanban size={16} className="text-primary" />
            <div className="text-xs text-muted-foreground">顶部搜索只会按项目名称检索，不再匹配描述内容。</div>
          </div>
        }
      />

      <div className="px-8 pb-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="group cursor-pointer overflow-hidden border-muted/60 transition-all hover:shadow-md" onClick={() => nav(`/app/projects/${p.id}/overview`)}>
                <div className={cn('h-1.5', p.type === 'CODE' ? 'bg-primary' : 'bg-emerald-500')} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
                      {p.type === 'CODE' ? '代码项目' : '非代码项目'}
                    </Badge>
                    <span className="text-[10px] font-semibold text-muted-foreground">{p.courseName || '未分类'}</span>
                  </div>
                  <CardTitle className="text-lg transition-colors group-hover:text-primary">{p.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{p.description || '暂无描述'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-bold">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t bg-muted/10 py-3 text-[11px] text-muted-foreground">
                  <span className="truncate">{p.teamName || '未关联团队'}</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    打开 <ArrowRight size={12} />
                  </span>
                </CardFooter>
              </Card>
            ))}

            {!q.isLoading && !projects.length ? (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="p-10 text-center text-muted-foreground">
                  {keyword ? '没有找到项目名称匹配的结果，请换个项目名关键词试试。' : '还没有项目。请先在课程的组队任务中创建队伍，再由队长创建项目工作区。'}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
