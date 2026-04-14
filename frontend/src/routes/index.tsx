import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/screens/login/LoginPage';
import { AppShell } from '@/screens/shell/AppShell';
import { DashboardPage } from '@/screens/dashboard/DashboardPage';
import { ProjectsPage } from '@/screens/projects/ProjectsPage';
import { CreateProjectPage } from '@/screens/projects/CreateProjectPage';
import { ProjectLayout } from '@/screens/projects/ProjectLayout';
import { ProjectOverviewPage } from '@/screens/projects/detail/ProjectOverviewPage';
import { ProjectTasksPage } from '@/screens/projects/detail/ProjectTasksPage';
import { ProjectDocumentsPage } from '@/screens/projects/detail/ProjectDocumentsPage';
import { DocumentWorkspacePage } from '@/screens/projects/detail/DocumentWorkspacePage';
import { ProjectRepositoryPage } from '@/screens/projects/detail/ProjectRepositoryPage';
import { ProjectDiscussionsListPage } from '@/screens/projects/discussions/ProjectDiscussionsListPage';
import { ProjectDiscussionDetailPage } from '@/screens/projects/discussions/ProjectDiscussionDetailPage';
import { ProjectMembersPage } from '@/screens/projects/members/ProjectMembersPage';
import { ProjectReleasesPage } from '@/screens/projects/releases/ProjectReleasesPage';
import { TeamsPage } from '@/screens/teams/TeamsPage';
import { TasksPage } from '@/screens/tasks/TasksPage';
import { DocumentsPage } from '@/screens/documents/DocumentsPage';
import { DiscussionsPage } from '@/screens/discussions/DiscussionsPage';
import { AiPage } from '@/screens/ai/AiPage';
import { NotificationsPage } from '@/screens/notifications/NotificationsPage';
import { SettingsPage } from '@/screens/settings/SettingsPage';
import { TeacherDashboardPage } from '@/screens/teacher/TeacherDashboardPage';
import { TeacherAssignmentsPage } from '@/screens/teacher/TeacherAssignmentsPage';
import { TeacherFeedbackPage } from '@/screens/teacher/TeacherFeedbackPage';
import { TeacherContributionsPage } from '@/screens/teacher/TeacherContributionsPage';
import { RouteError } from '@/screens/common/RouteError';

export const routes = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace />, errorElement: <RouteError /> },
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    path: '/app',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '', element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/new', element: <CreateProjectPage /> },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        errorElement: <RouteError />,
        children: [
          { path: 'overview', element: <ProjectOverviewPage /> },
          { path: 'tasks', element: <ProjectTasksPage /> },
          { path: 'discussions', element: <ProjectDiscussionsListPage /> },
          { path: 'discussions/:postId', element: <ProjectDiscussionDetailPage /> },
          { path: 'documents', element: <ProjectDocumentsPage /> },
          { path: 'documents/:docId', element: <DocumentWorkspacePage /> },
          // redirect /repository -> /repository/files (avoid duplicated /repository/repository/files)
          { path: 'repository', element: <Navigate to="files" replace /> },
          { path: 'repository/:tab', element: <ProjectRepositoryPage /> }, // tab: files|commits|branches|merge-requests
          { path: 'releases', element: <ProjectReleasesPage /> },
          { path: 'members', element: <ProjectMembersPage /> },
        ],
      },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'discussions', element: <DiscussionsPage /> },
      { path: 'ai', element: <AiPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'teacher/dashboard', element: <TeacherDashboardPage /> },
      { path: 'teacher/assignments', element: <TeacherAssignmentsPage /> },
      { path: 'teacher/feedback', element: <TeacherFeedbackPage /> },
      { path: 'teacher/contributions', element: <TeacherContributionsPage /> },
    ],
  },
]);
