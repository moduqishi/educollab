import React from 'react';
import { LayoutDashboard, FolderKanban, Users, TrendingUp, Target, Plus, FileText, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AssignmentRecord, TeacherFeedbackRecord, TeacherOverview } from '@/lib/types';

export function TeacherDashboardView({ overview }: { overview: TeacherOverview | null }) {
  const projects = overview?.projects || [];
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Monitor class progress and project contributions.</p>
        </div>
        <Button className="rounded-full px-6 gap-2">
          <Star size={18} /> Export Reports
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Projects</CardTitle>
            <div className="text-3xl font-bold">{overview?.totalProjects ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-xs opacity-80">Across your courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
            <div className="text-3xl font-bold">{overview?.activeStudents ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Estimated by contributions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
            <div className="text-3xl font-bold">{overview?.pendingReviews ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Feedback items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Progress</CardTitle>
            <div className="text-3xl font-bold">{overview?.averageProgress ?? '—'}%</div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Class Progress Overview</CardTitle>
            <CardDescription>Completion status of all visible projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {projects.map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full', project.type === 'CODE' ? 'bg-blue-500' : 'bg-green-500')} />
                    <span className="font-medium text-sm">{project.name}</span>
                  </div>
                  <span className="text-xs font-bold">{project.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-700" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            ))}
            {!projects.length && <p className="text-sm text-muted-foreground">No projects visible.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Quick signals from contribution rows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <p className="text-sm font-bold">Engagement</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Track tasks done and commit activity.</p>
            </div>
            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary" />
                <p className="text-sm font-bold">Intervention</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use Feedback page to score and guide teams.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SupervisionView({
  overview,
  onProjectClick,
}: {
  overview: TeacherOverview | null;
  onProjectClick: (id: number) => void;
}) {
  const projects = overview?.projects || [];
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Project Supervision</h1>
          <p className="text-muted-foreground">Open a project to review details.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-lg transition-all border-muted/60 overflow-hidden" onClick={() => onProjectClick(p.id)}>
            <div className={cn('h-2', p.type === 'CODE' ? 'bg-blue-500' : 'bg-green-500')} />
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className={cn('rounded-md', p.type === 'CODE' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600')}>
                  {p.type === 'CODE' ? 'Code' : 'Non-Code'}
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{p.courseName}</span>
              </div>
              <CardTitle className="text-xl">{p.name}</CardTitle>
              <CardDescription className="line-clamp-2">{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold">{p.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-3 text-[10px] text-muted-foreground flex justify-between">
              <span>{p.teamName}</span>
              <span>Due {p.dueDate || '未设置'}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ContributionsView({ overview }: { overview: TeacherOverview | null }) {
  const rows = overview?.contributionRows || [];
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Member Contributions</h1>
        <p className="text-muted-foreground">Signals computed from tasks and (code projects) git commits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contribution Table</CardTitle>
          <CardDescription>Student engagement rows.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-5 text-xs font-semibold text-muted-foreground px-6 py-3 border-b bg-muted/20">
            <span>Student</span>
            <span className="col-span-2">Project</span>
            <span>Tasks Done</span>
            <span>Engagement</span>
          </div>
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-5 px-6 py-4 border-b last:border-b-0 items-center">
              <span className="text-sm font-semibold">{r.studentName}</span>
              <span className="col-span-2 text-sm text-muted-foreground">{r.projectName}</span>
              <Badge variant="outline" className="w-fit">{r.tasksDone}</Badge>
              <div className="flex items-center gap-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, r.engagement)}%` }} />
                </div>
                <span className="text-xs font-bold w-10 text-right">{r.engagement}</span>
              </div>
            </div>
          ))}
          {!rows.length && <div className="p-6 text-sm text-muted-foreground">No contribution rows.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

export function AssignmentsView({ rows }: { rows: AssignmentRecord[] }) {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Assignments</h1>
          <p className="text-muted-foreground">Review student submissions.</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} /> Create Assignment
        </Button>
      </div>

      <div className="space-y-4">
        {rows.map((a) => (
          <Card key={a.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{a.title}</h4>
                  <p className="text-sm text-muted-foreground">{a.projectName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (a.submissionUrl) window.open(a.submissionUrl, '_blank', 'noopener,noreferrer');
                  }}
                  disabled={!a.submissionUrl}
                >
                  {a.submissionUrl ? 'Open Link' : 'No Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No assignments.</p>}
      </div>
    </div>
  );
}

export function FeedbackView({
  rows,
  onCreate,
}: {
  rows: TeacherFeedbackRecord[];
  onCreate: (payload: { projectId: number; score: number; content: string }) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState('');
  const [score, setScore] = React.useState('90');
  const [content, setContent] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Feedback & Grading</h1>
          <p className="text-muted-foreground">Score and mentor project teams.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={18} /> New Feedback
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Feedback</DialogTitle>
              <DialogDescription>Send a score and message to a project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project ID</Label>
                <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="e.g. 1" />
                <p className="text-xs text-muted-foreground">（最小实现：这里先用项目 ID；可从 Supervision 打开项目查看 ID）</p>
              </div>
              <div className="space-y-2">
                <Label>Score</Label>
                <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="0-100" />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!projectId.trim() || !content.trim()) return;
                  setSaving(true);
                  try {
                    await onCreate({ projectId: Number(projectId), score: Number(score || '0'), content: content.trim() });
                    setOpen(false);
                    setProjectId('');
                    setScore('90');
                    setContent('');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !projectId.trim() || !content.trim()}
              >
                {saving ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {rows.map((f) => (
          <Card key={f.id} className="hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">{f.projectName}</CardTitle>
                  <CardDescription>{f.teacherName} • {f.createdAt}</CardDescription>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">{f.score}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.content}</p>
            </CardContent>
          </Card>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
      </div>
    </div>
  );
}
