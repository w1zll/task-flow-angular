import type { Board } from '@/shared/api/api';
import type { PendingBoardMutation } from '@/shared/store/pending-board-mutations.store';
import { describePendingBoardMutation } from './pending-board-mutation-descriptions';

const messages: Record<string, string> = {
  'detail.updateTask': 'Update "{task}"',
  'detail.moveTask': 'Move "{task}"',
  'detail.reorderColumn': 'Reorder tasks in "{column}"',
  'detail.fieldChange': '{field}: "{from}" -> "{to}"',
  'detail.moveColumns': 'Column: "{from}" -> "{to}"',
  'detail.moveOrder': 'Target position: {order}',
  'detail.reorderTasks': 'Order: {from} -> {to}',
  'detail.moreTasks': '+{count} more',
  'detail.noFieldChanges':
    'No field differences could be detected from the saved board cache.',
  'field.title': 'Title',
  'field.isCompleted': 'Status',
  'field.priority': 'Priority',
  'value.empty': 'empty',
  'value.completed': 'completed',
  'value.open': 'open',
  'value.taskFallback': 'task',
  'value.columnFallback': 'column',
  'priority.high': 'High',
  'priority.medium': 'Medium',
};

const t = (key: string, values?: Record<string, unknown>) =>
  Object.entries(values ?? {}).reduce(
    (message, [name, value]) =>
      message.replace(`{${name}}`, String(value)),
    messages[key] ?? key,
  );

const board = {
  id: 'board-1',
  members: [],
  columns: [
    {
      id: 'column-1',
      title: 'Todo',
      tasks: [
        {
          id: 'task-1',
          title: 'Write spec',
          priority: 'medium',
          isCompleted: false,
          columnId: 'column-1',
        },
        {
          id: 'task-2',
          title: 'Review copy',
          priority: 'medium',
          isCompleted: false,
          columnId: 'column-1',
        },
      ],
    },
    {
      id: 'column-2',
      title: 'Done',
      tasks: [],
    },
  ],
} as unknown as Board;

const createMutation = (
  overrides: Partial<PendingBoardMutation>,
): PendingBoardMutation => ({
  id: 'mutation-1',
  boardId: 'board-1',
  event: 'task:update',
  payload: {},
  createdAt: Date.now(),
  expiresAt: Date.now() + 1000,
  status: 'pending',
  ...overrides,
});

describe('describePendingBoardMutation', () => {
  it('describes task field changes with before and after values', () => {
    const description = describePendingBoardMutation(
      createMutation({
        event: 'task:update',
        payload: {
          taskId: 'task-1',
          changes: {
            title: 'Write final spec',
            priority: 'high',
            isCompleted: true,
          },
        },
      }),
      board,
      t,
    );

    expect(description).toEqual({
      title: 'Update "Write spec"',
      lines: [
        'Title: "Write spec" -> "Write final spec"',
        'Priority: "Medium" -> "High"',
        'Status: "open" -> "completed"',
      ],
    });
  });

  it('describes task moves with source and target columns', () => {
    const description = describePendingBoardMutation(
      createMutation({
        event: 'task:move',
        payload: {
          taskId: 'task-1',
          sourceColumnId: 'column-1',
          columnId: 'column-2',
          order: 0,
        },
      }),
      board,
      t,
    );

    expect(description).toEqual({
      title: 'Move "Write spec"',
      lines: ['Column: "Todo" -> "Done"', 'Target position: 1'],
    });
  });

  it('describes task reorder with previous and target order', () => {
    const description = describePendingBoardMutation(
      createMutation({
        event: 'task:reorder',
        payload: {
          columnId: 'column-1',
          taskIds: ['task-2', 'task-1'],
        },
      }),
      board,
      t,
    );

    expect(description).toEqual({
      title: 'Reorder tasks in "Todo"',
      lines: ['Order: Write spec, Review copy -> Review copy, Write spec'],
    });
  });
});
