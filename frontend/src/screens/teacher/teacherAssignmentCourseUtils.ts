import type { AssignmentRecord, TeacherAssignmentCourseRecord } from '@/lib/types';

export function deriveAssignmentCoursesFromAssignments(
  assignments: AssignmentRecord[],
): TeacherAssignmentCourseRecord[] {
  const grouped = new Map<number, TeacherAssignmentCourseRecord>();

  for (const assignment of assignments) {
    if (!assignment.classId) continue;
    const current = grouped.get(assignment.classId) ?? {
      classId: assignment.classId,
      className: assignment.className || `课程 ${assignment.classId}`,
      assignmentCount: 0,
      openAssignmentCount: 0,
      closedAssignmentCount: 0,
      totalSubmissions: 0,
      pendingSubmissions: 0,
      gradedSubmissions: 0,
      latestDueDate: null,
    };

    current.assignmentCount += 1;
    if (assignment.status === 'CLOSED') {
      current.closedAssignmentCount += 1;
    } else {
      current.openAssignmentCount += 1;
    }
    current.totalSubmissions += assignment.totalSubmissions || 0;
    current.pendingSubmissions += assignment.pendingSubmissions || 0;
    current.gradedSubmissions += assignment.gradedSubmissions || 0;
    if (
      assignment.dueDate &&
      (!current.latestDueDate || assignment.dueDate > current.latestDueDate)
    ) {
      current.latestDueDate = assignment.dueDate;
    }

    grouped.set(assignment.classId, current);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (right.pendingSubmissions !== left.pendingSubmissions) {
      return right.pendingSubmissions - left.pendingSubmissions;
    }
    return left.className.localeCompare(right.className, 'zh-CN');
  });
}
