export type BackendRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
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
  settings?: UserSettingsRecord;
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
  defaultHome: '/app/dashboard' | '/app/classes' | '/app/teams' | '/app/teacher/dashboard' | '/app/admin';
  timeFormat: 'relative' | 'absolute';
}

export interface TeamRecord {
  id: number;
  name: string;
  courseId: number | null;
  courseName: string;
  groupOrder?: number | null;
  memberCount: number;
  leaderId: number | null;
  leaderName: string;
  inviteCode: string | null;
  groupTaskId: number | null;
  source: 'STANDALONE' | 'COURSE';
  status?: string | null;
  groupTaskTitle?: string | null;
  projectId?: number | null;
  projectName?: string | null;
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

export interface TeamMemberRecord {
  userId: number;
  name: string;
  email: string;
  avatar?: string;
  leader: boolean;
}

export interface TeamTaskRecord {
  id: number;
  teamId: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | string;
  assigneeId?: number | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
}

export interface TeamLinkedProjectRecord {
  projectId: number;
  projectName: string;
  description?: string | null;
  projectType?: 'CODE' | 'NON_CODE' | string | null;
  projectStatus?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | string | null;
  projectProgress?: number | null;
  taskCount?: number | null;
  completedTaskCount?: number | null;
}

export interface TeamDetailRecord {
  id: number;
  name: string;
  source: 'STANDALONE' | 'COURSE';
  courseId?: number | null;
  courseName?: string | null;
  groupOrder?: number | null;
  leaderId?: number | null;
  leaderName?: string | null;
  status?: string | null;
  inviteCode?: string | null;
  currentUserLeader: boolean;
  currentUserMember: boolean;
  teacherView: boolean;
  members: TeamMemberRecord[];
  project?: TeamLinkedProjectRecord | null;
  tasks: TeamTaskRecord[];
}

export interface ClassProjectRecord {
  teamId: number;
  teamName: string;
  groupOrder?: number | null;
  teamStatus?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  projectType?: 'CODE' | 'NON_CODE' | string | null;
  projectStatus?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | string | null;
  progress: number;
  totalTaskCount: number;
  completedTaskCount: number;
}

export interface ProjectRecord {
  id: number;
  name: string;
  description: string;
  type: 'CODE' | 'NON_CODE';
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  progress: number;
  courseId?: number | null;
  courseName: string;
  teamId?: number | null;
  teamName: string;
  dueDate?: string | null;
  createdAt: string;
  memberAvatars: string[];
}

export interface ProjectMilestoneRecord {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  sortOrder: number;
  weight: number;
  status: 'LOCKED' | 'ACTIVE' | 'DONE' | string;
  activatedAt?: string | null;
  completedAt?: string | null;
  progressPercent: number;
  taskCount: number;
  completedTaskCount: number;
  canMarkDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: number;
  projectId: number;
  projectName: string;
  milestoneId?: number | null;
  milestoneTitle?: string | null;
  parentTaskId?: number | null;
  sortOrder?: number | null;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  assigneeId?: number | null;
  assigneeName: string;
  dueDate?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  completedAt?: string | null;
  hasChildren: boolean;
  childCount: number;
  derivedProgressPercent: number;
  canMarkDone: boolean;
  canCreateChild: boolean;
  blockedByMilestone: boolean;
  depth: number;
}

export interface TaskTreeRecord {
  task: TaskRecord;
  children: TaskTreeRecord[];
}

export interface ProjectMilestoneTaskGroupRecord {
  milestone: ProjectMilestoneRecord;
  rootTasks: TaskTreeRecord[];
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
  milestones: ProjectMilestoneRecord[];
  tasks: TaskRecord[];
  milestoneTaskGroups: ProjectMilestoneTaskGroupRecord[];
  discussions: DiscussionPost[];
  documents: DocumentRecord[];
  members: ProjectMember[];
  currentUserCanEdit: boolean;
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

export interface ProjectActivityEventRecord {
  id: number;
  projectId: number;
  projectName: string;
  courseId?: number | null;
  courseName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  userId?: number | null;
  userName?: string | null;
  eventType: string;
  targetType?: string | null;
  targetId?: number | null;
  targetTitle?: string | null;
  eventCount?: number | null;
  linesAdded?: number | null;
  linesDeleted?: number | null;
  contributionScore: number;
  detailJson?: string | null;
  occurredAt: string;
}

export interface ContributionBreakdownRecord {
  key: string;
  label: string;
  eventCount: number;
  metricValue: number;
  contributionScore: number;
}

export interface UserContributionRecord {
  userId: number;
  userName: string;
  projectId: number;
  projectName: string;
  courseId?: number | null;
  courseName?: string | null;
  teamName?: string | null;
  contributionScore: number;
  eventCount: number;
  lastActiveAt?: string | null;
  breakdowns: ContributionBreakdownRecord[];
}

export interface ProjectContributionSummaryRecord {
  projectId: number;
  projectName: string;
  courseId?: number | null;
  courseName?: string | null;
  teamName?: string | null;
  contributionScore: number;
  activeUserCount: number;
  eventCount: number;
}

export interface ProjectWeeklyReportRecord {
  projectId: number;
  projectName: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  totalContributionScore: number;
  activeUserCount: number;
  eventCount: number;
  breakdowns: ContributionBreakdownRecord[];
  memberRankings: UserContributionRecord[];
  timeline: ProjectActivityEventRecord[];
  rawEvents: ProjectActivityEventRecord[];
}

export interface CourseFilterRecord {
  id: number;
  name: string;
}

export interface TeacherContributionReportRecord {
  selectedCourseId?: number | null;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  courses: CourseFilterRecord[];
  overallBreakdowns: ContributionBreakdownRecord[];
  projectRows: ProjectContributionSummaryRecord[];
  userRows: UserContributionRecord[];
}

export interface SummaryKpiRecord {
  key: string;
  label: string;
  value: string;
  hint: string;
}

export interface SummaryLeaderboardEntry {
  subjectId: number;
  title: string;
  subtitle?: string | null;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
  highlighted: boolean;
}

export interface SummaryTrendBucket {
  bucketKey: string;
  label: string;
  startDate: string;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
}

export interface SummaryHeatmapCell {
  date: string;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
  level: number;
}

export interface MemberSummaryRecord {
  userId: number;
  userName: string;
  teamName?: string | null;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
  lastActiveAt?: string | null;
  breakdowns: ContributionBreakdownRecord[];
}

export interface SummaryWeeklyDigestRecord {
  weekStart: string;
  weekEnd: string;
  contributionScore: number;
  activeUserCount: number;
  rawCount: number;
  effectiveCount: number;
  breakdowns: ContributionBreakdownRecord[];
}

export interface ProjectSummaryRecord {
  projectId: number;
  projectName: string;
  rangeType: 'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM' | string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  selectedMemberId?: number | null;
  selectedMemberName?: string | null;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
  activeUserCount: number;
  kpis: SummaryKpiRecord[];
  breakdowns: ContributionBreakdownRecord[];
  trendBuckets: SummaryTrendBucket[];
  heatmap: SummaryHeatmapCell[];
  leaderboard: SummaryLeaderboardEntry[];
  members: MemberSummaryRecord[];
  weeklyDigest: SummaryWeeklyDigestRecord;
  timeline: ProjectActivityEventRecord[];
  rawEvents: ProjectActivityEventRecord[];
}

export interface TeacherSummaryRecord {
  selectedCourseId?: number | null;
  rangeType: 'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM' | string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  courseCount: number;
  contributionScore: number;
  rawCount: number;
  effectiveCount: number;
  activeUserCount: number;
  courses: CourseFilterRecord[];
  kpis: SummaryKpiRecord[];
  breakdowns: ContributionBreakdownRecord[];
  trendBuckets: SummaryTrendBucket[];
  heatmap: SummaryHeatmapCell[];
  projectLeaderboard: SummaryLeaderboardEntry[];
  userLeaderboard: SummaryLeaderboardEntry[];
  weeklyDigest: SummaryWeeklyDigestRecord;
  timeline: ProjectActivityEventRecord[];
}

export interface TeacherAssignmentCourseRecord {
  classId: number;
  className: string;
  assignmentCount: number;
  openAssignmentCount: number;
  closedAssignmentCount: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  gradedSubmissions: number;
  latestDueDate?: string | null;
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

export type AssignmentSubmissionStatus = 'NOT_SUBMITTED' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'GRADED';

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
  status: 'OPEN' | 'CLOSED';
  allowSubmission: boolean;
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
  linkedProjectId?: number | null;
  linkedProjectName?: string | null;
  linkedDocumentId?: number | null;
  linkedDocumentTitle?: string | null;
  linkedRepositoryName?: string | null;
  linkedRepositoryUrl?: string | null;
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

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalProjects: number;
  totalTasks: number;
  totalDiscussions: number;
  totalAssignments: number;
}

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  avatar?: string;
  createdAt: string;
}

export interface AdminCourseSummary {
  id: number;
  name: string;
  classCode: string;
  teacherName: string | null;
  memberCount: number;
  createdAt: string;
}

export interface AdminProjectSummary {
  id: number;
  name: string;
  type: 'CODE' | 'NON_CODE';
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  progress: number;
  courseName: string | null;
  teamName: string | null;
  createdAt: string;
}

export interface AdminTaskSummary {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  projectName: string | null;
  assigneeName: string | null;
  dueDate: string | null;
}

export interface AdminDiscussionSummary {
  id: number;
  title: string;
  category: string;
  status: string;
  projectName: string | null;
  authorName: string | null;
  replyCount: number;
  createdAt: string;
}

export interface AdminAssignmentSummary {
  id: number;
  title: string;
  courseName: string | null;
  dueDate: string | null;
  totalSubmissions: number;
  gradedSubmissions: number;
  createdAt: string;
}
