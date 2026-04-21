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
import { ProjectFilesPage } from '@/screens/projects/detail/ProjectFilesPage';
import { ProjectFileViewerPage } from '@/screens/projects/detail/ProjectFileViewerPage';
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
import { ClassFilesTabPage } from '@/screens/classes/ClassFilesTabPage';
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
import { TeamFilesTabPage } from '@/screens/teams/TeamFilesTabPage';
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
import { AdminTeamsPage } from '@/screens/admin/AdminTeamsPage';
import { AdminUserDetailPage } from '@/screens/admin/AdminUserDetailPage';
import { AdminCourseImportPage } from '@/screens/admin/AdminCourseImportPage';
import { AdminAuditTrailPage } from '@/screens/admin/AdminAuditTrailPage';
import { AdminContentLayout } from '@/screens/admin/AdminContentLayout';
import { AdminDocumentsPage } from '@/screens/admin/AdminDocumentsPage';
import { AdminImportsPage } from '@/screens/admin/AdminImportsPage';
import { AdminSystemPage } from '@/screens/admin/AdminSystemPage';
import { AdminStoragePage } from '@/screens/admin/AdminStoragePage';
import { AdminCourseDetailPage } from '@/screens/admin/AdminCourseDetailPage';
import { AdminTeamDetailPage } from '@/screens/admin/AdminTeamDetailPage';
import { AdminProjectDetailPage } from '@/screens/admin/AdminProjectDetailPage';
import { AdminContentHubPage } from '@/screens/admin/AdminContentHubPage';
import { AdminContentCoursesPage } from '@/screens/admin/AdminContentCoursesPage';
import { AdminContentTeamsPage } from '@/screens/admin/AdminContentTeamsPage';
import { AdminContentProjectsPage } from '@/screens/admin/AdminContentProjectsPage';
import { AdminContentFilesPage } from '@/screens/admin/AdminContentFilesPage';
import { AdminContentRepositoriesPage } from '@/screens/admin/AdminContentRepositoriesPage';

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
          { path: 'files', element: <ProjectFilesPage /> },
          { path: 'documents', element: <Navigate to="../files" replace /> },
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
          { path: 'files', element: <ClassFilesTabPage /> },
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
          { path: 'files', element: <TeamFilesTabPage /> },
        ],
      },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'tasks/new', element: <TaskCreatePage /> },
      { path: 'tasks/:taskId', element: <TaskEditPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'files/view', element: <ProjectFileViewerPage /> },
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
      { path: 'admin/users/:userId', element: <AdminUserDetailPage /> },
      { path: 'admin/courses', element: <AdminCoursesPage /> },
      { path: 'admin/courses/:classId/*', element: <AdminCourseDetailPage /> },
      { path: 'admin/teams', element: <AdminTeamsPage /> },
      { path: 'admin/teams/:teamId/*', element: <AdminTeamDetailPage /> },
      { path: 'admin/projects', element: <AdminProjectsPage /> },
      { path: 'admin/projects/:projectId/*', element: <AdminProjectDetailPage /> },
      {
        path: 'admin/content',
        element: <AdminContentLayout />,
        children: [
          { path: '', element: <AdminContentHubPage /> },
          { path: 'courses', element: <AdminContentCoursesPage /> },
          { path: 'teams', element: <AdminContentTeamsPage /> },
          { path: 'projects', element: <AdminContentProjectsPage /> },
          { path: 'tasks', element: <AdminTasksPage /> },
          { path: 'discussions', element: <AdminDiscussionsPage /> },
          { path: 'assignments', element: <AdminAssignmentsPage /> },
          { path: 'documents', element: <AdminDocumentsPage /> },
          { path: 'files', element: <AdminContentFilesPage /> },
          { path: 'repositories', element: <AdminContentRepositoriesPage /> },
        ],
      },
      { path: 'admin/storage', element: <AdminStoragePage /> },
      { path: 'admin/imports', element: <AdminImportsPage /> },
      { path: 'admin/system', element: <AdminSystemPage /> },
      { path: 'admin/system/audit', element: <AdminAuditTrailPage /> },
      { path: 'admin/tasks', element: <Navigate to="/app/admin/content/tasks" replace /> },
      { path: 'admin/discussions', element: <Navigate to="/app/admin/content/discussions" replace /> },
      { path: 'admin/assignments', element: <Navigate to="/app/admin/content/assignments" replace /> },
    ],
  },
]);
