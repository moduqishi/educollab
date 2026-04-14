import React from 'react';
import { MessagesSquare, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setTitle } from '@/app/title';
import { useApi } from '@/app/api';
import { PageHero } from '@/screens/shell/PageHero';
import { PageError, PageLoading, PageEmpty } from '@/screens/common/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function TeacherFeedbackPage() {
  const api = useApi();
  const qc = useQueryClient();
  React.useEffect(() => setTitle(['评分反馈']), []);

  const feedbackQ = useQuery({ queryKey: ['teacherFeedback'], queryFn: () => api.feedbacks() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => api.projects() });

  const createM = useMutation({
    mutationFn: (payload: { projectId: number; score: number; content: string }) => api.createFeedback(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['teacherFeedback'] });
    },
  });

  const isLoading = feedbackQ.isLoading || projectsQ.isLoading;
  if (isLoading) return <PageLoading label="正在加载反馈…" />;
  if (feedbackQ.isError) return <PageError title="反馈加载失败" onRetry={() => feedbackQ.refetch()} />;
  if (projectsQ.isError) return <PageError title="项目加载失败" onRetry={() => projectsQ.refetch()} />;

  const items = feedbackQ.data || [];
  const projects = projectsQ.data || [];

  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<number | null>(null);
  const [score, setScore] = React.useState('90');
  const [content, setContent] = React.useState('');

  const canSubmit = !!projectId && !!content.trim() && Number(score) >= 0 && Number(score) <= 100;

  return (
    <div>
      <PageHero
        title="评分反馈"
        subtitle="用“清晰、可执行”的反馈帮助学生迭代：结论 → 证据 → 改进建议 → 下一步。"
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setProjectId(null);
                setScore('90');
                setContent('');
              }
            }}
          >
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus size={16} /> 新建反馈
            </DialogTrigger>
            <DialogContent className="max-w-[760px]">
              <DialogHeader>
                <DialogTitle>新建反馈</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>项目</Label>
                  <Select value={projectId ? String(projectId) : ''} onValueChange={(v) => setProjectId(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>分数（0-100）</Label>
                  <Input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label>反馈内容</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[140px]" placeholder="建议结构：亮点 / 问题 / 建议 / 下一步（负责人+时间）" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={createM.isPending}>
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (!canSubmit) return;
                    await createM.mutateAsync({ projectId: projectId!, score: Number(score), content: content.trim() });
                    setOpen(false);
                  }}
                  disabled={!canSubmit || createM.isPending}
                >
                  {createM.isPending ? '正在提交…' : '提交反馈'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-8 pb-10">
        <div className="max-w-[1200px] mx-auto space-y-4">
          {!items.length ? (
            <PageEmpty title="暂无反馈" message="你创建的反馈会沉淀在这里，便于回看与复盘。" icon={MessagesSquare} />
          ) : (
            items.map((f) => (
              <Card key={f.id} className="border-muted/70">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{f.projectName}</CardTitle>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {f.teacherName} · {f.createdAt}
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{f.score}</div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{f.content}</CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

