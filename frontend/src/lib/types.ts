export type BackendRole = 'STUDENT' | 'TEACHER';
export type AppRole = 'student' | 'teacher';

export interface AuthSession {
  token: string;
  profile: UserProfile;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  avatar?: string;
}

export interface TeamRecord {
  id: number;
  name: string;
  courseId: number | null;
  courseName: string;
  memberCount: number;
  leaderId: number | null;
  leaderName: string;
}

export interface CourseRecord {
  id: number;
  name: string;
  teacherName?: string | null;
}

export interface ProjectRecord {
  id: number;
  name: string;
  description: string;
  type: 'CODE' | 'NON_CODE';
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  progress: number;
  courseName: string;
  teamName: string;
  dueDate?: string | null;
  memberAvatars: string[];
}

export interface TaskRecord {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  assigneeName: string;
  dueDate?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DiscussionReply {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  content: string;
  authorName: string;
  replyCount: number;
  createdAt: string;
  category: string;
  status: string;
  linkedTaskCount: number;
}

export interface DiscussionDetail {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  category: string;
  status: string;
  replies: DiscussionReply[];
  attachments: FileAssetRecord[];
  linkedTasks: TaskRecord[];
}

export interface DocumentRecord {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  collaborators: string[];
  collabKey: string;
  currentContent: string;
}

export interface DocumentVersionRecord {
  id: number;
  label: string;
  createdBy: string;
  createdAt: string;
  snapshotContent: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: string;
}

export interface DashboardSummary {
  activeProjects: number;
  pendingTasks: number;
  unreadNotifications: number;
  projects: ProjectRecord[];
  urgentTasks: TaskRecord[];
  documents: DocumentRecord[];
}

export interface ProjectStats {
  taskCount: number;
  completedTaskCount: number;
  discussionCount: number;
  documentCount: number;
  releaseCount: number;
  commitCount: number;
}

export interface CommitRecord {
  hash: string;
  message: string;
  authorName: string;
  createdAt: string;
  branch: string;
}

export interface GitTreeEntry {
  path: string;
  name: string;
  type: 'file' | 'directory';
  sizeBytes: number;
}

export interface GitBlobView {
  path: string;
  binary: boolean;
  encoding: 'utf-8' | 'base64' | string;
  content: string;
  sizeBytes: number;
}

export interface GitCloneInfo {
  slug: string;
  httpUrl: string;
  defaultBranch: string;
}

export interface GitTokenItem {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revoked: boolean;
}

export interface GitTokenCreateResponse {
  token: string;
  prefix: string;
  expiresAt?: string | null;
}

export interface ReleaseRecord {
  id: number;
  version: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface MergeRequestRecord {
  id: number;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  status: string;
}

export interface ProjectMember {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface ProjectDetail {
  project: ProjectRecord;
  stats: ProjectStats;
  tasks: TaskRecord[];
  discussions: DiscussionPost[];
  documents: DocumentRecord[];
  members: ProjectMember[];
  branches: string[];
  commits: CommitRecord[];
  releases: ReleaseRecord[];
  mergeRequests: MergeRequestRecord[];
}

export interface ContributionRow {
  studentName: string;
  projectName: string;
  tasksDone: number;
  commits: number;
  engagement: number;
}

export interface TeacherOverview {
  totalProjects: number;
  activeStudents: number;
  pendingReviews: number;
  averageProgress: number;
  projects: ProjectRecord[];
  contributionRows: ContributionRow[];
}

export interface TeacherFeedbackRecord {
  id: number;
  projectId: number;
  projectName: string;
  score: number;
  content: string;
  teacherName: string;
  createdAt: string;
}

export interface AssignmentRecord {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  summary: string;
  submissionUrl: string;
  createdAt: string;
}

export interface FileAssetRecord {
  id: number;
  fileName: string;
  ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT';
  ownerId: number;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AiReply {
  content: string;
  provider: string;
  model: string;
}

export interface AppProject {
  id: number;
  name: string;
  description: string;
  typeLabel: string;
  statusLabel: string;
  progress: number;
  courseName: string;
  teamName: string;
  dueDate: string;
  memberAvatars: string[];
  isCode: boolean;
}

export interface AppTask {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string;
  status: TaskRecord['status'];
  statusLabel: string;
  priority: TaskRecord['priority'];
  priorityLabel: string;
  assigneeName: string;
  dueDate: string;
}

export interface AppDocument extends DocumentRecord {
  preview: string;
  collabUrl: string;
}
