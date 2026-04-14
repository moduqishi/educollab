import { Project, User, Task, Discussion, Document, Commit, MergeRequest, Release } from './types';

export const currentUser: User = {
  id: 'u1',
  name: 'Alex Rivera',
  email: 'alex.rivera@university.edu',
  role: 'student',
  avatar: 'https://picsum.photos/seed/alex/100/100'
};

export const mockUsers: User[] = [
  currentUser,
  { id: 'u2', name: 'Sarah Chen', email: 'sarah.c@university.edu', role: 'student', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: 'u3', name: 'Dr. James Wilson', email: 'j.wilson@university.edu', role: 'teacher', avatar: 'https://picsum.photos/seed/james/100/100' },
  { id: 'u4', name: 'Liam Smith', email: 'liam.s@university.edu', role: 'student', avatar: 'https://picsum.photos/seed/liam/100/100' },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'AI Research Assistant',
    description: 'Developing a RAG-based assistant for academic papers.',
    type: 'code',
    status: 'active',
    members: [mockUsers[0], mockUsers[1], mockUsers[3]],
    leaderId: 'u1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-20T15:30:00Z'
  },
  {
    id: 'p2',
    name: 'Sustainable Campus Initiative',
    description: 'A policy proposal and implementation plan for zero-waste campus.',
    type: 'non-code',
    status: 'active',
    members: [mockUsers[0], mockUsers[2], mockUsers[3]],
    leaderId: 'u4',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-22T11:00:00Z'
  }
];

export const mockTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Implement Vector Database',
    description: 'Set up Pinecone or Weaviate for document embeddings.',
    status: 'in-progress',
    assigneeId: 'u1',
    dueDate: '2024-03-01'
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'UI Design for Chat',
    description: 'Create a clean chat interface using Tailwind.',
    status: 'todo',
    assigneeId: 'u2',
    dueDate: '2024-03-05'
  },
  {
    id: 't3',
    projectId: 'p2',
    title: 'Draft Waste Audit Report',
    description: 'Analyze data from the last 3 months of waste collection.',
    status: 'review',
    assigneeId: 'u4',
    dueDate: '2024-02-28'
  },
  {
    id: 't4',
    projectId: 'p1',
    title: 'API Authentication',
    description: 'Implement JWT based auth for the backend.',
    status: 'done',
    assigneeId: 'u1',
    dueDate: '2024-02-15'
  },
  {
    id: 't5',
    projectId: 'p1',
    title: 'Data Scraping Script',
    description: 'Write a script to pull papers from ArXiv.',
    status: 'todo',
    assigneeId: 'u4',
    dueDate: '2024-03-10'
  }
];

export const mockDiscussions: Discussion[] = [
  {
    id: 'd1',
    projectId: 'p1',
    authorId: 'u2',
    title: 'Which LLM should we use?',
    content: 'I was thinking about GPT-4o vs Claude 3.5 Sonnet. Any preferences?',
    createdAt: '2024-02-18T14:00:00Z',
    updatedAt: '2024-02-18T15:00:00Z',
    comments: [
      { id: 'c1', authorId: 'u1', content: 'Sonnet is faster and cheaper for our prototype.', createdAt: '2024-02-18T14:30:00Z' },
      { id: 'c2', authorId: 'u4', content: 'Agreed, let\'s go with Sonnet.', createdAt: '2024-02-18T15:00:00Z' }
    ]
  },
  {
    id: 'd2',
    projectId: 'p1',
    authorId: 'u1',
    title: 'Vector DB choice',
    content: 'Pinecone seems easy but Weaviate is open source. Thoughts?',
    createdAt: '2024-02-19T10:00:00Z',
    updatedAt: '2024-02-19T10:00:00Z',
    comments: []
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'doc1',
    projectId: 'p1',
    title: 'Architecture Overview',
    content: '# Architecture\n\nOur system consists of three main parts:\n1. Frontend (React)\n2. API (FastAPI)\n3. Vector Store (Pinecone)\n\n## Data Flow\n- User sends query\n- Query is embedded\n- Vector search finds relevant chunks\n- LLM generates response',
    updatedAt: '2024-02-15T14:00:00Z',
    versions: [
      { id: 'v1', timestamp: '2024-01-20T10:00:00Z', authorId: 'u1', note: 'Initial draft' },
      { id: 'v2', timestamp: '2024-02-15T14:00:00Z', authorId: 'u2', note: 'Added data flow section' }
    ]
  },
  {
    id: 'doc2',
    projectId: 'p2',
    title: 'Waste Audit Plan',
    content: '# Waste Audit Plan\n\n1. Identify collection points\n2. Categorize waste types\n3. Weigh daily output',
    updatedAt: '2024-02-05T09:00:00Z',
    versions: [
      { id: 'v1', timestamp: '2024-02-05T09:00:00Z', authorId: 'u4', note: 'Drafting plan' }
    ]
  }
];

export const mockCommits: Commit[] = [
  { id: 'cm1', projectId: 'p1', message: 'feat: add pinecone integration', authorId: 'u1', timestamp: '2024-02-20T15:00:00Z', branch: 'main', hash: 'a1b2c3d' },
  { id: 'cm2', projectId: 'p1', message: 'fix: sidebar layout', authorId: 'u2', timestamp: '2024-02-19T12:00:00Z', branch: 'main', hash: 'e5f6g7h' },
  { id: 'cm3', projectId: 'p1', message: 'docs: update readme', authorId: 'u4', timestamp: '2024-02-18T10:00:00Z', branch: 'main', hash: 'i9j0k1l' }
];

export const mockMergeRequests: MergeRequest[] = [
  { id: 'mr1', projectId: 'p1', title: 'Add auth flow', sourceBranch: 'feat/auth', targetBranch: 'main', status: 'open', authorId: 'u1' },
  { id: 'mr2', projectId: 'p1', title: 'Fix CSS bugs', sourceBranch: 'fix/ui', targetBranch: 'main', status: 'merged', authorId: 'u2' }
];

export const mockReleases: Release[] = [
  { id: 'r1', projectId: 'p1', version: 'v0.1.0', title: 'Alpha Release', description: 'Basic chat functionality working.', timestamp: '2024-02-01T10:00:00Z' },
  { id: 'r2', projectId: 'p1', version: 'v0.2.0', title: 'Beta Release', description: 'Added vector search and document indexing.', timestamp: '2024-02-25T10:00:00Z' }
];
