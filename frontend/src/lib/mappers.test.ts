import assert from 'node:assert/strict';
import test from 'node:test';
import { mapProject, mapRole, mapTask, stripHtml } from './mappers';

test('mapRole maps backend role', () => {
  assert.equal(mapRole('STUDENT'), 'student');
  assert.equal(mapRole('TEACHER'), 'teacher');
});

test('stripHtml removes tags', () => {
  assert.equal(stripHtml('<h1>Hello</h1><p>World</p>'), 'Hello World');
});

test('mapProject keeps code flag', () => {
  const project = mapProject({
    id: 1,
    name: 'Demo',
    description: 'desc',
    type: 'CODE',
    status: 'ACTIVE',
    progress: 50,
    courseName: '软件工程',
    teamName: '云码工坊',
    dueDate: null,
    memberAvatars: [],
  });
  assert.equal(project.isCode, true);
  assert.equal(project.typeLabel, '代码项目');
});

test('mapTask exposes readable labels', () => {
  const task = mapTask({
    id: 1,
    projectId: 1,
    projectName: 'Demo',
    title: 'Task',
    description: '',
    status: 'IN_PROGRESS',
    assigneeName: 'Alex',
    dueDate: null,
    priority: 'HIGH',
  });
  assert.equal(task.statusLabel, '进行中');
  assert.equal(task.priorityLabel, '高');
});
