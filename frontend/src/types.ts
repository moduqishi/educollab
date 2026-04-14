export type ProjectType = 'code' | 'non-code';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  status: 'active' | 'completed' | 'archived';
  members: User[];
  leaderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  assigneeId?: string;
  dueDate?: string;
  linkedDiscussionId?: string;
  linkedDocId?: string;
  linkedCommitId?: string;
}

export interface Discussion {
  id: string;
  projectId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  updatedAt: string;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  timestamp: string;
  authorId: string;
  note: string;
}

export interface Commit {
  id: string;
  projectId: string;
  message: string;
  authorId: string;
  timestamp: string;
  branch: string;
  hash: string;
}

export interface Branch {
  name: string;
  isDefault: boolean;
}

export interface MergeRequest {
  id: string;
  projectId: string;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed';
  authorId: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  title: string;
  description: string;
  timestamp: string;
}
