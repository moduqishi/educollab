export const notificationTypeOptions = [
  { value: 'ALL', label: '全部类型' },
  { value: 'TASK', label: '任务' },
  { value: 'DISCUSSION', label: '讨论' },
  { value: 'DOCUMENT', label: '文档' },
  { value: 'SYSTEM', label: '系统' },
] as const;

export function notificationTypeLabel(type: string) {
  switch (type) {
    case 'TASK':
      return '任务';
    case 'DISCUSSION':
      return '讨论';
    case 'DOCUMENT':
      return '文档';
    case 'SYSTEM':
      return '系统';
    default:
      return type;
  }
}

export function notificationSourceTypeLabel(type?: string | null) {
  switch (type) {
    case 'TASK':
      return '任务';
    case 'DISCUSSION':
      return '讨论';
    case 'DOCUMENT':
      return '文档';
    case 'ASSIGNMENT':
      return '作业';
    case 'GROUP_TASK':
      return '组队任务';
    case 'CLASS':
      return '班级';
    case 'PROJECT':
      return '项目';
    case 'SYSTEM':
      return '系统';
    default:
      return type || '系统';
  }
}
