import type {
  AdminAssignmentSummary,
  AdminCourseSummary,
  AdminDiscussionSummary,
  AdminDocumentSummary,
  AdminProjectSummary,
  AdminTaskSummary,
  AdminTeamSummary,
} from '@/lib/types';
import { buildAdminOverrideUrl } from '@/components/admin/AdminOverrideBanner';

export type QuickLink = { label: string; href: string };

export function courseFrontLinks(course: Pick<AdminCourseSummary, 'id'>, returnTo: string): QuickLink[] {
  return [
    { label: '概览', href: buildAdminOverrideUrl(`/app/classes/${course.id}/overview`, returnTo) },
    { label: '成员', href: buildAdminOverrideUrl(`/app/classes/${course.id}/members`, returnTo) },
    { label: '团队', href: buildAdminOverrideUrl(`/app/classes/${course.id}/teams`, returnTo) },
    { label: '项目', href: buildAdminOverrideUrl(`/app/classes/${course.id}/projects`, returnTo) },
    { label: '作业', href: buildAdminOverrideUrl(`/app/classes/${course.id}/assignments`, returnTo) },
    { label: '文件', href: buildAdminOverrideUrl(`/app/classes/${course.id}/files`, returnTo) },
  ];
}

export function teamFrontLinks(team: Pick<AdminTeamSummary, 'id'>, returnTo: string): QuickLink[] {
  return [
    { label: '概览', href: buildAdminOverrideUrl(`/app/teams/${team.id}/overview`, returnTo) },
    { label: '成员', href: buildAdminOverrideUrl(`/app/teams/${team.id}/members`, returnTo) },
    { label: '项目', href: buildAdminOverrideUrl(`/app/teams/${team.id}/projects`, returnTo) },
    { label: '任务', href: buildAdminOverrideUrl(`/app/teams/${team.id}/tasks`, returnTo) },
    { label: '文件', href: buildAdminOverrideUrl(`/app/teams/${team.id}/files`, returnTo) },
    { label: '总结', href: buildAdminOverrideUrl(`/app/teams/${team.id}/reports`, returnTo) },
  ];
}

export function projectFrontLinks(project: Pick<AdminProjectSummary, 'id' | 'type'>, returnTo: string): QuickLink[] {
  return [
    { label: '概览', href: buildAdminOverrideUrl(`/app/projects/${project.id}/overview`, returnTo) },
    { label: '任务', href: buildAdminOverrideUrl(`/app/projects/${project.id}/tasks`, returnTo) },
    { label: '讨论', href: buildAdminOverrideUrl(`/app/projects/${project.id}/discussions`, returnTo) },
    { label: '文件', href: buildAdminOverrideUrl(`/app/projects/${project.id}/files`, returnTo) },
    ...(project.type === 'CODE' ? [{ label: '仓库', href: buildAdminOverrideUrl(`/app/projects/${project.id}/repository/files`, returnTo) }] : []),
    { label: '成员', href: buildAdminOverrideUrl(`/app/projects/${project.id}/members`, returnTo) },
    { label: '总结', href: buildAdminOverrideUrl(`/app/projects/${project.id}/reports`, returnTo) },
  ];
}

export function taskOpenLink(task: AdminTaskSummary, returnTo: string) {
  return task.projectId ? buildAdminOverrideUrl(`/app/projects/${task.projectId}/tasks`, returnTo) : undefined;
}

export function discussionOpenLink(item: AdminDiscussionSummary, returnTo: string) {
  return item.projectId ? buildAdminOverrideUrl(`/app/projects/${item.projectId}/discussions`, returnTo) : undefined;
}

export function assignmentOpenLink(item: AdminAssignmentSummary, returnTo: string) {
  return item.courseId ? buildAdminOverrideUrl(`/app/classes/${item.courseId}/assignments`, returnTo) : undefined;
}

export function documentOpenLink(item: AdminDocumentSummary, returnTo: string) {
  if (item.projectId) {
    return buildAdminOverrideUrl(`/app/projects/${item.projectId}/documents/${item.id}`, returnTo);
  }
  return undefined;
}

export function fileScopeLink(item: { courseId?: number | null; teamId?: number | null; projectId?: number | null }, returnTo: string) {
  if (item.projectId) return buildAdminOverrideUrl(`/app/projects/${item.projectId}/files`, returnTo);
  if (item.teamId) return buildAdminOverrideUrl(`/app/teams/${item.teamId}/files`, returnTo);
  if (item.courseId) return buildAdminOverrideUrl(`/app/classes/${item.courseId}/files`, returnTo);
  return undefined;
}
