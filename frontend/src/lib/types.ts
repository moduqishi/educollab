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

export interface UpdateMyProfilePayload {
  name: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UserSettingsRecord {
  notifyInApp: boolean;
  notifyTask: boolean;
  notifyAssignment: boolean;
  notifyGroupTask: boolean;
  density: 'comfortable' | 'compact';
  defaultHome: '/app/dashboard' | '/app/classes' | '/app/teams' | '/app/teacher/dashboard';
  timeFormat: 'relative' | 'absolute';
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

export interface ClassRecord {
  id: number;
  name: string;
  classCode: string;
  teacherName?: string | null;
  memberCount: number;
  pendingInvitationCount: number;
}

export interface ClassMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  userRole: BackendRole;
  classRole: 'TEACHER' | 'STUDENT';
  joinedVia?: string | null;
  avatar?: string;
}

export interface ClassInvitation {
  id: number;
  classId: number;
  className: string;
  invitedUserId: number;
  invitedUserName: string;
  invitedUserEmail: string;
  invitedByName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface ClassDetail {
  classInfo: ClassRecord;
  members: ClassMember[];
  invitations: ClassInvitation[];
  assignments: AssignmentRecord[];
  groupTasks: GroupTaskRecord[];
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
  assigneeId?: number | null;
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
  currentContent: string | null;
  kind?: 'NOTE' | 'OFFICE' | string;
  officeExt?: 'docx' | 'xlsx' | 'pptx' | string | null;
  fileAssetId?: number | null;
}

export interface DocumentVersionRecord {
  id: number;
  label: string;
  createdBy: string;
  createdAt: string;
  snapshotContent: string | null;
  fileAssetId?: number | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: string;
  sourceType?: string | null;
  sourceId?: number | null;
  sourcePath?: string | null;
  sourceLabel?: string | null;
}

export interface NotificationDetail {
  id: number;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: string;
  sourceType?: string | null;
  sourceId?: number | null;
  sourcePath?: string | null;
  sourceLabel?: string | null;
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
  owner: boolean;
}

export interface ProjectMemberCandidate {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  fromClass: boolean;
}

export interface ProjectDetail {
  project: ProjectRecord;
  stats: ProjectStats;
  tasks: TaskRecord[];
  discussions: DiscussionPost[];
  documents: DocumentRecord[];
  members: ProjectMember[];
  currentUserCanManageMembers: boolean;
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

export type AssignmentSubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'RETURNED' | 'GRADED';

export interface AssignmentRecord {
  id: number;
  classId?: number | null;
  className?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  title: string;
  summary: string;
  submissionUrl: string;
  dueDate?: string | null;
  createdAt: string;
  currentUserSubmissionStatus?: AssignmentSubmissionStatus | null;
  currentUserSubmittedAt?: string | null;
  currentUserScore?: number | null;
  currentUserTeacherFeedback?: string | null;
  totalSubmissions?: number | null;
  gradedSubmissions?: number | null;
  pendingSubmissions?: number | null;
}

export interface AssignmentSubmissionRecord {
  id?: number | null;
  assignmentId: number;
  classId?: number | null;
  studentId: number;
  studentName: string;
  studentEmail: string;
  content: string;
  submissionUrl: string;
  status: AssignmentSubmissionStatus;
  score?: number | null;
  teacherFeedback?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  attemptCount: number;
  attachments: FileAssetRecord[];
}

export interface AssignmentSubmissionSummary {
  totalSubmissions: number;
  gradedSubmissions: number;
  pendingSubmissions: number;
}

export interface GroupTaskTeamRecord {
  id: number;
  groupTaskId: number;
  name: string;
  leaderId?: number | null;
  leaderName?: string | null;
  memberCount: number;
  status: string;
  canJoin: boolean;
  canLeave: boolean;
  canTransfer: boolean;
  projectId?: number | null;
}

export interface GroupTaskTeamMember {
  userId: number;
  name: string;
  email: string;
  avatar?: string;
  leader: boolean;
}

export interface GroupTaskTeamDetail {
  id: number;
  classId?: number | null;
  className?: string | null;
  groupTaskId?: number | null;
  groupTaskTitle?: string | null;
  name: string;
  leaderId?: number | null;
  leaderName?: string | null;
  status: string;
  projectId?: number | null;
  currentUserLeader: boolean;
  currentUserMember: boolean;
  teacherView: boolean;
  members: GroupTaskTeamMember[];
  tasks: GroupTaskSubTaskRecord[];
}

export interface GroupTaskRecord {
  id: number;
  classId: number;
  className: string;
  title: string;
  description: string;
  minMembers?: number | null;
  maxMembers?: number | null;
  dueDate?: string | null;
  createdAt: string;
  teams: GroupTaskTeamRecord[];
}

export interface GroupTaskSubTaskRecord {
  id: number;
  teamId: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | string;
  assigneeId?: number | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

export interface WeeklyReportRecord {
  id: string;
  teamId: number;
  authorId: number;
  authorName: string;
  title: string;
  weekLabel: string;
  dateRange: string;
  completed: string;
  blockers: string;
  nextPlan: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileAssetRecord {
  id: number;
  fileName: string;
  ownerType: 'PROJECT' | 'TASK' | 'DOCUMENT' | 'DISCUSSION_POST' | 'ASSIGNMENT_SUBMISSION';
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
