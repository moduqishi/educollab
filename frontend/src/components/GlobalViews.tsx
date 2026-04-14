import React from 'react';
import {
  FolderKanban,
  CheckSquare,
  FileText,
  MessageSquare,
  Users,
  Plus,
  Search,
  Bell,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { createApiClient } from '@/lib/api';
import type {
  AuthSession,
  CourseRecord,
  DashboardSummary,
  DiscussionPost,
  NotificationItem,
  ProjectRecord,
  TaskRecord,
  TeamRecord,
  DocumentRecord,
  UserProfile,
} from '@/lib/types';

type Api = ReturnType<typeof createApiClient>;

// --- Dashboard View ---
export function DashboardView({
  summary,
  onProjectClick,
  onCreateProject,
}: {
  summary: DashboardSummary | null;
  onProjectClick: (id: number) => void;
  onCreateProject: () => void;
}) {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
        </div>
        <Button className="rounded-full px-6 gap-2" onClick={onCreateProject}>
          <Plus size={18} /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-xl shadow-primary/20 border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium opacity-90">Active Projects</CardTitle>
            <div className="text-4xl font-bold">{summary?.activeProjects ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm opacity-80">Across your workspace</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Pending Tasks</CardTitle>
            <div className="text-4xl font-bold">{summary?.pendingTasks ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">To keep things moving</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Unread Notifications</CardTitle>
            <div className="text-4xl font-bold">{summary?.unreadNotifications ?? '—'}</div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Stay in the loop</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-bold">Recent Projects</h3>
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5" onClick={() => {}}>
              View All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(summary?.projects || []).map((project) => (
              <ProjectCard key={project.id} project={project} onClick={() => onProjectClick(project.id)} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Urgent Tasks</CardTitle>
              <CardDescription>Tasks needing attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.urgentTasks || []).map((t) => (
                <div key={t.id} className="p-3 rounded-xl border bg-muted/20">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.projectName}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {t.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {t.dueDate || '未设置'}
                    </span>
                  </div>
                </div>
              ))}
              {!summary?.urgentTasks?.length && <p className="text-sm text-muted-foreground">No urgent tasks.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Docs</CardTitle>
              <CardDescription>Latest updated documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.documents || []).map((d) => (
                <div key={d.id} className="p-3 rounded-xl border bg-muted/20">
                  <p className="text-sm font-semibold">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.projectName}</p>
                  <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} /> {d.updatedAt}
                  </div>
                </div>
              ))}
              {!summary?.documents?.length && <p className="text-sm text-muted-foreground">No documents yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: ProjectRecord; onClick: () => void }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-muted/60 overflow-hidden" onClick={onClick}>
      <div className={cn('h-2 w-full', project.type === 'CODE' ? 'bg-blue-500' : 'bg-green-500')} />
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge
            variant="secondary"
            className={cn('rounded-md', project.type === 'CODE' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600')}
          >
            {project.type === 'CODE' ? 'Code' : 'Non-Code'}
          </Badge>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{project.courseName || ''}</span>
        </div>
        <CardTitle className="text-xl group-hover:text-primary transition-colors">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2">{project.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-bold">{project.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="flex items-center -space-x-2">
            {(project.memberAvatars || []).slice(0, 5).map((avatar, i) => (
              <Avatar key={i} className="w-7 h-7 border-2 border-white">
                <AvatarImage src={avatar} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3 flex justify-between items-center text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckSquare size={12} /> {project.progress}% done
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={12} /> {project.teamName}
          </span>
        </div>
        <span>Due {project.dueDate || '未设置'}</span>
      </CardFooter>
    </Card>
  );
}

// --- Projects View ---
export function ProjectsView({
  projects,
  onProjectClick,
  onCreateProject,
}: {
  projects: ProjectRecord[];
  onProjectClick: (id: number) => void;
  onCreateProject: () => void;
}) {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">All Projects</h1>
          <p className="text-muted-foreground">Browse and open your projects.</p>
        </div>
        <Button className="gap-2" onClick={onCreateProject}>
          <Plus size={18} /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onClick={() => onProjectClick(p.id)} />
        ))}
      </div>
    </div>
  );
}

// --- Global Tasks View ---
export function GlobalTasksView({
  api,
  tasks,
  projects,
  onRefresh,
}: {
  api: Api;
  tasks: TaskRecord[];
  projects: ProjectRecord[];
  onRefresh: () => Promise<void>;
}) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [projectId, setProjectId] = React.useState<string>(projects[0]?.id ? String(projects[0].id) : '');
  const [priority, setPriority] = React.useState<TaskRecord['priority']>('MEDIUM');
  const [dueDate, setDueDate] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);

  const addTask = async () => {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    try {
      await api.saveTask(
        {
          projectId: Number(projectId),
          title: title.trim(),
          description: description.trim(),
          status: 'TODO',
          priority,
          dueDate: dueDate || undefined,
        },
        undefined,
      );
      setIsAdding(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">My Tasks</h1>
          <p className="text-muted-foreground">Your task queue across all projects.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={18} /> Add Task
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>Add a new task to your project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdding(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={addTask} disabled={!title.trim() || !projectId || saving}>
                {saving ? 'Creating…' : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-all border-muted/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>{t.projectName}</CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {t.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.description ? <p className="text-sm text-muted-foreground">{t.description}</p> : <p className="text-sm text-muted-foreground italic">No description.</p>}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {t.assigneeName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {t.dueDate || '未设置'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3 flex justify-between">
              <Badge className={cn('capitalize', t.priority === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' : t.priority === 'LOW' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
                {t.priority}
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const next: TaskRecord['status'] = t.status === 'DONE' ? 'TODO' : t.status === 'TODO' ? 'IN_PROGRESS' : t.status === 'IN_PROGRESS' ? 'REVIEW' : 'DONE';
                    await api.saveTask(
                      { projectId: t.projectId, title: t.title, description: t.description || '', status: next, priority: t.priority, dueDate: t.dueDate || undefined },
                      t.id,
                    );
                    await onRefresh();
                  }}
                >
                  Advance
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Global Documents View ---
export function GlobalDocumentsView({
  api,
  documents,
  projects,
  onRefresh,
  onOpenProject,
}: {
  api: Api;
  documents: DocumentRecord[];
  projects: ProjectRecord[];
  onRefresh: () => Promise<void>;
  onOpenProject: (projectId: number) => void;
}) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [projectId, setProjectId] = React.useState<string>(projects[0]?.id ? String(projects[0].id) : '');
  const [saving, setSaving] = React.useState(false);

  const addDoc = async () => {
    if (!title.trim() || !projectId) return;
    setSaving(true);
    try {
      await api.createDocument({ projectId: Number(projectId), title: title.trim(), currentContent: '' });
      setIsAdding(false);
      setTitle('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Shared Documents</h1>
          <p className="text-muted-foreground">Documents across all projects.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={18} /> New Document
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
              <DialogDescription>Create a new collaborative document.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdding(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={addDoc} disabled={!title.trim() || !projectId || saving}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <Card key={doc.id} className="hover:shadow-md transition-all border-muted/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{doc.title}</CardTitle>
              <CardDescription>{doc.projectName}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{doc.excerpt || '—'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {doc.collaborators?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {doc.updatedAt}
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3">
              <Button variant="ghost" className="w-full text-xs gap-2" onClick={() => onOpenProject(doc.projectId)}>
                Open Project <ExternalLink size={14} />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Global Discussions View ---
export function GlobalDiscussionsView({
  api,
  discussions,
  projects,
  onRefresh,
}: {
  api: Api;
  discussions: DiscussionPost[];
  projects: ProjectRecord[];
  onRefresh: () => Promise<void>;
}) {
  const [isPosting, setIsPosting] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string>(projects[0]?.id ? String(projects[0].id) : '');
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [category, setCategory] = React.useState('GENERAL');
  const [saving, setSaving] = React.useState(false);

  const create = async () => {
    if (!projectId || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.createDiscussion({ projectId: Number(projectId), title: title.trim(), content: content.trim(), category });
      setIsPosting(false);
      setTitle('');
      setContent('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Forum Discussions</h1>
          <p className="text-muted-foreground">Posts across all projects.</p>
        </div>
        <Dialog open={isPosting} onOpenChange={setIsPosting}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus size={18} /> New Post
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discussion</DialogTitle>
              <DialogDescription>Start a new thread for your team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Discussion title…" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="HELP_NEEDED">Help needed</SelectItem>
                    <SelectItem value="TASK_ASSIGNMENT">Task assignment</SelectItem>
                    <SelectItem value="BUG_REPORT">Bug report</SelectItem>
                    <SelectItem value="RESOURCES">Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post…" className="min-h-[140px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPosting(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={create} disabled={saving || !title.trim() || !content.trim() || !projectId}>
                {saving ? 'Posting…' : 'Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {discussions.map((d) => (
          <Card key={d.id} className="border-muted/60 hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{d.title}</CardTitle>
                  <CardDescription>
                    {d.projectName} • {d.authorName} • {d.createdAt}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {d.replyCount} replies
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{d.content}</p>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 py-3 flex justify-end">
              <ReplyButton api={api} postId={d.id} onDone={onRefresh} />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReplyButton({ api, postId, onDone }: { api: Api; postId: number; onDone: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <MessageSquare size={14} /> Reply
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reply</DialogTitle>
          <DialogDescription>Write a reply to this discussion.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Content</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[160px]" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!text.trim()) return;
              setSaving(true);
              try {
                await api.replyDiscussion(postId, text.trim());
                setText('');
                setOpen(false);
                await onDone();
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || !text.trim()}
          >
            {saving ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Teams View ---
export function TeamsView({
  api,
  teams,
  onRefresh,
}: {
  api: Api;
  teams: TeamRecord[];
  onRefresh: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [courses, setCourses] = React.useState<CourseRecord[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [courseId, setCourseId] = React.useState<string>('');
  const [leaderId, setLeaderId] = React.useState<string>('');
  const [memberIds, setMemberIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open) return;
      try {
        const [cs, us] = await Promise.all([api.courses(), api.users()]);
        if (cancelled) return;
        setCourses(cs);
        setUsers(us);
        setCourseId(cs[0]?.id ? String(cs[0].id) : '');
        setLeaderId(us[0]?.id ? String(us[0].id) : '');
        setMemberIds(us.slice(0, 3).map((u) => String(u.id)));
      } catch (e: any) {
        setError(e?.message || '加载数据失败');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, api]);

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!name.trim() || !courseId) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTeam({
        name: name.trim(),
        courseId: Number(courseId),
        leaderId: leaderId ? Number(leaderId) : Number(memberIds[0]),
        memberIds: (memberIds.length ? memberIds : leaderId ? [leaderId] : []).map((x) => Number(x)),
      });
      setOpen(false);
      setName('');
      await onRefresh();
    } catch (e: any) {
      setError(e?.message || '创建团队失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">My Teams</h1>
          <p className="text-muted-foreground">Collaborate with your classmates and colleagues.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="rounded-full px-6 gap-2" />}>
            <Plus size={18} /> Create Team
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>Set up a new team under a course.</DialogDescription>
            </DialogHeader>
            {error && <div className="p-3 rounded-xl border bg-destructive/5 border-destructive/20 text-destructive text-sm">{error}</div>}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 云码工坊" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leader</Label>
                  <Select value={leaderId} onValueChange={setLeaderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leader" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Members</Label>
                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-auto border rounded-xl p-3 bg-muted/10">
                  {users.map((u) => {
                    const active = memberIds.includes(String(u.id));
                    return (
                      <button
                        key={u.id}
                        className={cn('flex items-center justify-between p-2 rounded-lg border transition-colors', active ? 'bg-primary/5 border-primary/30' : 'bg-white hover:bg-muted/30')}
                        onClick={() => toggleMember(String(u.id))}
                        type="button"
                      >
                        <span className="text-sm font-medium">{u.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {active ? 'Selected' : 'Tap to add'}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving || !name.trim() || !courseId}>
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-all border-muted/60">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users size={24} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <CardDescription>
                    {t.memberCount} Members • {t.courseName}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Leader: <span className="font-semibold text-foreground">{t.leaderName || '—'}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/5 py-3">
              <Button variant="ghost" className="w-full text-xs gap-2">
                Manage Team <ExternalLink size={14} />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Notifications View ---
export function NotificationsView({
  items,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
}: {
  items: NotificationItem[];
  onRefresh: () => Promise<void>;
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}) {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your team's activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onMarkAllRead}>
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((n) => (
          <button
            key={n.id}
            className={cn(
              'w-full text-left p-4 flex gap-4 hover:bg-muted/30 transition-colors cursor-pointer rounded-xl',
              !n.read ? 'bg-primary/5 border-l-4 border-primary' : '',
            )}
            onClick={() => onMarkRead(n.id)}
          >
            <Avatar className="w-10 h-10">
              <AvatarFallback>
                <Bell size={16} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{n.content}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {n.createdAt} • {n.type}
              </p>
            </div>
            {!n.read && <div className="w-2 h-2 bg-primary rounded-full mt-2" />}
          </button>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No notifications.</p>}
      </div>
    </div>
  );
}

// --- Settings View ---
export function SettingsView({ profile }: { profile: AuthSession['profile'] }) {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform preferences.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Read-only profile info from backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border-4 border-primary/10">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <Badge variant="outline" className="mt-1">
                  {profile.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
            <CardDescription>UI-only toggles for now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your projects via email.</p>
              </div>
              <Button variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Enabled
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
              </div>
              <Button variant="outline">Disabled</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
