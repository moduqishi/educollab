import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Code2, FileText, Calendar, Settings2, BookOpen, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';
import type { CourseRecord, ProjectRecord, TeamRecord } from '@/lib/types';

type Api = ReturnType<typeof createApiClient>;

const STEPS = [
  { id: 1, title: '基础信息', icon: BookOpen },
  { id: 2, title: '项目类型', icon: Settings2 },
  { id: 3, title: '能力开关', icon: GitBranch },
  { id: 4, title: '团队与课程', icon: Calendar },
];

export function CreateProjectView({
  api,
  onBack,
  onCreated,
}: {
  api: Api;
  onBack: () => void;
  onCreated: (project: ProjectRecord) => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);

  const [form, setForm] = useState({
    name: '',
    description: '',
    dueDate: '',
    type: 'CODE' as 'CODE' | 'NON_CODE',
    initRepository: true,
    teamId: '' as string,
    courseId: '' as string,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cs, ts] = await Promise.all([api.courses(), api.teams()]);
        if (cancelled) return;
        setCourses(cs);
        setTeams(ts);
        // defaults
        if (!form.teamId && ts[0]?.id) {
          const t = ts[0];
          setForm((prev) => ({
            ...prev,
            teamId: String(t.id),
            courseId: t.courseId != null ? String(t.courseId) : prev.courseId || (cs[0]?.id ? String(cs[0].id) : ''),
          }));
        } else if (!form.courseId && cs[0]?.id) {
          setForm((prev) => ({ ...prev, courseId: String(cs[0].id) }));
        }
      } catch (e: any) {
        setError(e?.message || '加载课程/团队失败');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTeam = useMemo(() => teams.find((t) => String(t.id) === form.teamId) || null, [teams, form.teamId]);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const canNext = () => {
    if (currentStep === 1) return !!form.name.trim();
    if (currentStep === 4) return !!form.teamId && !!form.courseId;
    return true;
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) return setError('请填写项目名称。');
    if (!form.teamId) return setError('请选择一个团队。');
    if (!form.courseId) return setError('请选择一个课程。');

    setIsSubmitting(true);
    try {
      const project = await api.createProject({
        teamId: Number(form.teamId),
        courseId: Number(form.courseId),
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        dueDate: form.dueDate || undefined,
        initRepository: form.type === 'CODE' ? !!form.initRepository : false,
      });
      onCreated(project);
    } catch (e: any) {
      setError(e?.message || '创建项目失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepIcon = STEPS.find((s) => s.id === currentStep)?.icon || BookOpen;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold">新建项目</h1>
              <p className="text-muted-foreground">为团队创建一个可追踪的协作工作区。</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <StepIcon size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                步骤 {currentStep} / {STEPS.length}
              </p>
              <p className="text-sm font-bold">{STEPS.find((s) => s.id === currentStep)?.title}</p>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isActive ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : isCompleted ? 'bg-primary text-white' : 'bg-white border-2 border-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>
                <span className={cn('text-xs font-semibold whitespace-nowrap', isActive ? 'text-primary' : 'text-muted-foreground')}>{step.title}</span>
              </div>
            );
          })}
        </div>

        <Card className="shadow-xl border-muted/60">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg">项目配置</CardTitle>
            <CardDescription>按步骤完成配置：清晰的信息结构能提升协作效率。</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {error && <div className="mb-6 p-3 rounded-xl border bg-destructive/5 border-destructive/20 text-destructive text-sm">{error}</div>}

            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">项目名称</Label>
                    <Input id="name" placeholder="例如：EduCollab 前后端联调与体验升级" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due">截止日期（可选）</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input id="due" type="date" className="pl-10" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">项目描述</Label>
                  <Textarea
                    id="desc"
                    placeholder="建议包含：目标 / 里程碑 / 验收标准 / 风险与依赖…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="min-h-[120px]"
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card
                  className={cn('cursor-pointer transition-all duration-200 border-2', form.type === 'CODE' ? 'border-primary bg-primary/5' : 'hover:border-primary/30')}
                  onClick={() => setForm({ ...form, type: 'CODE' })}
                >
                  <CardHeader>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', form.type === 'CODE' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                      <Code2 size={24} />
                    </div>
                    <CardTitle>代码项目</CardTitle>
                    <CardDescription>包含 Git 仓库、分支、合并请求与发布流程。</CardDescription>
                  </CardHeader>
                </Card>
                <Card
                  className={cn('cursor-pointer transition-all duration-200 border-2', form.type === 'NON_CODE' ? 'border-primary bg-primary/5' : 'hover:border-primary/30')}
                  onClick={() => setForm({ ...form, type: 'NON_CODE' })}
                >
                  <CardHeader>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', form.type === 'NON_CODE' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                      <FileText size={24} />
                    </div>
                    <CardTitle>非代码项目</CardTitle>
                    <CardDescription>聚焦文档、讨论、任务推进与反馈闭环。</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h3 className="text-lg font-semibold">能力开关</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start justify-between p-4 rounded-2xl border bg-muted/20">
                    <div className="space-y-1">
                      <p className="font-bold">初始化 Git 仓库</p>
                      <p className="text-sm text-muted-foreground">为代码项目创建仓库基础结构（可在仓库页再次初始化）。</p>
                    </div>
                    <Checkbox
                      checked={form.type === 'CODE' ? form.initRepository : false}
                      disabled={form.type !== 'CODE'}
                      onCheckedChange={(v) => setForm({ ...form, initRepository: !!v })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>团队</Label>
                    <Select
                      value={form.teamId}
                      onValueChange={(v) => {
                        const t = teams.find((x) => String(x.id) === v);
                        setForm((prev) => ({
                          ...prev,
                          teamId: v,
                          courseId: t?.courseId != null ? String(t.courseId) : prev.courseId,
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={teams.length ? '请选择团队' : '暂无可用团队'} />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name} · {t.memberCount} 人
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTeam && (
                      <p className="text-xs text-muted-foreground">
                        负责人：<span className="font-medium text-foreground">{selectedTeam.leaderName || '—'}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>课程</Label>
                    <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={courses.length ? '请选择课程' : '暂无可用课程'} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                            {c.teacherName ? ` • ${c.teacherName}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTeam?.courseId != null && form.courseId && String(selectedTeam.courseId) !== form.courseId && (
                      <p className="text-xs text-amber-600">
                        当前选择的课程与团队绑定课程不一致（团队绑定：{selectedTeam.courseName}）。
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>

          <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
            <Button variant="outline" onClick={currentStep === 1 ? onBack : prevStep} disabled={isSubmitting}>
              <ArrowLeft size={16} className="mr-2" /> {currentStep === 1 ? '返回' : '上一步'}
            </Button>
            {currentStep < STEPS.length ? (
              <Button onClick={nextStep} disabled={!canNext() || isSubmitting}>
                下一步 <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={!canNext() || isSubmitting} className="shadow-lg shadow-primary/20">
                {isSubmitting ? '创建中…' : '创建项目'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
