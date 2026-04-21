import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/screens/login/LoginPage';
import { AppShell } from '@/screens/shell/AppShell';
import { DashboardPage } from '@/screens/dashboard/DashboardPage';
import { ProjectsPage } from '@/screens/projects/ProjectsPage';
import { ProjectLayout } from '@/screens/projects/ProjectLayout';
import { ProjectOverviewPage } from '@/screens/projects/detail/ProjectOverviewPage';
import { ProjectReportsPage } from '@/screens/projects/detail/ProjectReportsPage';
import { ProjectTasksPage } from '@/screens/projects/detail/ProjectTasksPage';
import { ProjectTaskCreatePage } from '@/screens/projects/detail/ProjectTaskCreatePage';
import { ProjectTaskEditPage } from '@/screens/projects/detail/ProjectTaskEditPage';
import { ProjectDocumentsPage } from '@/screens/projects/detail/ProjectDocumentsPage';
import { DocumentWorkspacePage } from '@/screens/projects/detail/DocumentWorkspacePage';
import { ProjectRepositoryPage } from '@/screens/projects/detail/ProjectRepositoryPage';
import { ProjectDiscussionsListPage } from '@/screens/projects/discussions/ProjectDiscussionsListPage';
import { ProjectDiscussionDetailPage } from '@/screens/projects/discussions/ProjectDiscussionDetailPage';
import { ProjectMembersPage } from '@/screens/projects/members/ProjectMembersPage';
import { ProjectMessagesPage } from '@/screens/projects/ProjectMessagesPage';
import { ProjectReleasesPage } from '@/screens/projects/releases/ProjectReleasesPage';
import { ClassesPage } from '@/screens/classes/ClassesPage';
import { ClassDetailLayout } from '@/screens/classes/ClassDetailLayout';
import { ClassOverviewTab } from '@/screens/classes/ClassOverviewTab';
import { ClassMembersTabPage } from '@/screens/classes/ClassMembersTabPage';
import { ClassAssignmentsTabPage } from '@/screens/classes/ClassAssignmentsTabPage';
import { ClassAssignmentDetailPage } from '@/screens/classes/ClassAssignmentDetailPage';
import { ClassTeamsTabPage } from '@/screens/classes/ClassTeamsTabPage';
import { ClassProjectsTabPage } from '@/screens/classes/ClassProjectsTabPage';
import { TasksPage } from '@/screens/tasks/TasksPage';
import { TaskCreatePage } from '@/screens/tasks/TaskCreatePage';
import { TaskEditPage } from '@/screens/tasks/TaskEditPage';
import { DocumentsPage } from '@/screens/documents/DocumentsPage';
import { AiPage } from '@/screens/ai/AiPage';
import { DiscussionsPage } from '@/screens/discussions/DiscussionsPage';
import { NotificationDetailPage } from '@/screens/notifications/NotificationDetailPage';
import { NotificationsPage } from '@/screens/notifications/NotificationsPage';
import { SettingsPage } from '@/screens/settings/SettingsPage';
import { ProfilePage } from '@/screens/profile/ProfilePage';
import { MessagesPage } from '@/screens/messages/MessagesPage';
import { TeacherDashboardPage } from '@/screens/teacher/TeacherDashboardPage';
import { TeacherAssignmentsPage } from '@/screens/teacher/TeacherAssignmentsPage';
import { TeacherFeedbackPage } from '@/screens/teacher/TeacherFeedbackPage';
import { TeacherContributionsPage } from '@/screens/teacher/TeacherContributionsPage';
import { RouteError } from '@/screens/common/RouteError';
import { TeamsPage } from '@/screens/teams/TeamsPage';
import { TeamDetailLayout } from '@/screens/teams/TeamDetailLayout';
import { TeamOverviewTab } from '@/screens/teams/TeamOverviewTab';
import { TeamMembersTab } from '@/screens/teams/TeamMembersTab';
import { TeamProjectsTab } from '@/screens/teams/TeamProjectsTab';
import { TeamTasksTab } from '@/screens/teams/TeamTasksTab';
import { TeamReportsTab } from '@/screens/teams/TeamReportsTab';
import { AdminDashboardPage } from '@/screens/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/screens/admin/AdminUsersPage';
import { AdminCoursesPage } from '@/screens/admin/AdminCoursesPage';
import { AdminProjectsPage } from '@/screens/admin/AdminProjectsPage';
import { AdminTasksPage } from '@/screens/admin/AdminTasksPage';
import { AdminDiscussionsPage } from '@/screens/admin/AdminDiscussionsPage';
import { AdminAssignmentsPage } from '@/screens/admin/AdminAssignmentsPage';

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
      { path: 'projects/new', element: <Navigate to="/app/classes" replace /> },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        errorElement: <RouteError />,
        children: [
          { path: 'overview', element: <ProjectOverviewPage /> },
          { path: 'reports', element: <ProjectReportsPage /> },
          { path: 'tasks', element: <ProjectTasksPage /> },
          { path: 'tasks/new', element: <ProjectTaskCreatePage /> },
          { path: 'tasks/:taskId', element: <ProjectTaskEditPage /> },
          { path: 'discussions', element: <ProjectDiscussionsListPage /> },
          { path: 'discussions/:postId', element: <ProjectDiscussionDetailPage /> },
          { path: 'documents', element: <ProjectDocumentsPage /> },
          { path: 'documents/:docId', element: <DocumentWorkspacePage /> },
          // redirect /repository -> /repository/files (avoid duplicated /repository/repository/files)
          { path: 'repository', element: <Navigate to="files" replace /> },
          { path: 'repository/:tab', element: <ProjectRepositoryPage /> }, // tab: files|commits|branches|merge-requests
          { path: 'releases', element: <ProjectReleasesPage /> },
          { path: 'members', element: <ProjectMembersPage /> },
          { path: 'messages', element: <ProjectMessagesPage /> },
        ],
      },
      { path: 'classes', element: <ClassesPage /> },
      {
        path: 'classes/:classId',
        element: <ClassDetailLayout />,
        children: [
          { path: '', element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <ClassOverviewTab /> },
          { path: 'members', element: <ClassMembersTabPage /> },
          { path: 'teams', element: <ClassTeamsTabPage /> },
          { path: 'projects', element: <ClassProjectsTabPage /> },
          { path: 'assignments', element: <ClassAssignmentsTabPage /> },
          { path: 'assignments/:assignmentId', element: <ClassAssignmentDetailPage /> },
        ],
      },
      { path: 'teams', element: <TeamsPage /> },
      {
        path: 'teams/:teamId',
        element: <TeamDetailLayout />,
        children: [
          { path: '', element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <TeamOverviewTab /> },
          { path: 'members', element: <TeamMembersTab /> },
          { path: 'projects', element: <TeamProjectsTab /> },
          { path: 'tasks', element: <TeamTasksTab /> },
          { path: 'reports', element: <TeamReportsTab /> },
        ],
      },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'tasks/new', element: <TaskCreatePage /> },
      { path: 'tasks/:taskId', element: <TaskEditPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'discussions', element: <DiscussionsPage /> },
      { path: 'ai', element: <AiPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'notifications/:notificationId', element: <NotificationDetailPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'teacher/dashboard', element: <TeacherDashboardPage /> },
      { path: 'teacher/assignments', element: <TeacherAssignmentsPage /> },
      { path: 'teacher/feedback', element: <TeacherFeedbackPage /> },
      { path: 'teacher/contributions', element: <TeacherContributionsPage /> },
      { path: 'admin', element: <AdminDashboardPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/courses', element: <AdminCoursesPage /> },
      { path: 'admin/projects', element: <AdminProjectsPage /> },
      { path: 'admin/tasks', element: <AdminTasksPage /> },
      { path: 'admin/discussions', element: <AdminDiscussionsPage /> },
      { path: 'admin/assignments', element: <AdminAssignmentsPage /> },
    ],
  },
]);
