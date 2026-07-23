import { renderHook, waitFor } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { useBoardSocket } from '../hooks/useBoardSocket';
import { ensureSocketConnected, getSocket } from '../lib/socket';

// --- моки ---
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));

jest.mock('../lib/socket', () => ({
  ensureSocketConnected: jest.fn(),
  getSocket: jest.fn(),
}));

jest.mock('../queries/boards.queries', () => ({
  findTaskInBoard: (board: any, taskId: string) =>
    board?.columns
      ?.flatMap((column: any) => column.tasks ?? [])
      .find((task: any) => task.id === taskId),
  invalidateWorkspaceAnalyticsForBoard: (qc: any, boardId: string) =>
    qc.invalidateQueries({
      queryKey: ['workspaces', boardId, 'analytics'],
    }),
  moveTaskToColumnEndInBoard: (board: any, updatedTask: any) => {
    if (!board) return board;
    return {
      ...board,
      columns: board.columns?.map((column: any) => {
        const tasks = column.tasks ?? [];
        const currentTask = tasks.find(
          (task: any) => task.id === updatedTask.id,
        );

        if (!currentTask) return column;

        return {
          ...column,
          tasks: [
            ...tasks.filter((task: any) => task.id !== updatedTask.id),
            { ...currentTask, ...updatedTask },
          ].map((task: any, order: number) => ({ ...task, order })),
        };
      }),
    };
  },
  queryKeys: {
    board: (id: string) => ['board', id],
    boardActivities: (id: string) => ['boards', id, 'activities'],
    boardAnalytics: (id?: string) => ['boards', id, 'analytics'],
  },
  updateTaskInBoard: (board: any, updatedTask: any) => {
    if (!board) return board;
    return {
      ...board,
      columns: board.columns?.map((column: any) => ({
        ...column,
        tasks: column.tasks?.map((task: any) =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
        ),
      })),
    };
  },
}));

// -----------

const createMockSocket = () => ({
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  active: false,
});

describe('useBoardSocket', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockSetQueryData: jest.Mock;
  let mockInvalidateQueries: jest.Mock;

  beforeEach(() => {
    mockSocket = createMockSocket();
    (getSocket as jest.Mock).mockReturnValue(mockSocket);
    // В проде ensureSocketConnected обновляет ws-token и открывает socket.
    // В unit-тесте нас интересует не транспорт, а поведение useBoardSocket,
    // поэтому мок просто вызывает connect и возвращает тот же socket.
    (ensureSocketConnected as jest.Mock).mockImplementation(async (socket) => {
      socket.connect();
      return socket;
    });

    mockSetQueryData = jest.fn();
    mockInvalidateQueries = jest.fn();
    (useQueryClient as jest.Mock).mockReturnValue({
      setQueryData: mockSetQueryData,
      invalidateQueries: mockInvalidateQueries,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── подключение ───────────────────────────────────────────────────────────

  it('should ensure socket connection on mount', async () => {
    renderHook(() => useBoardSocket('board-1'));

    await waitFor(() => expect(mockSocket.connect).toHaveBeenCalledTimes(1));
    expect(ensureSocketConnected).toHaveBeenCalledWith(mockSocket);
  });

  it('should emit board:join immediately if socket is already connected', () => {
    mockSocket.connected = true;
    renderHook(() => useBoardSocket('board-1'));
    expect(mockSocket.emit).toHaveBeenCalledWith('board:join', {
      boardId: 'board-1',
    });
  });

  it('should emit board:join via onConnect handler when connect event fires', () => {
    renderHook(() => useBoardSocket('board-1'));

    // находим коллбэк зарегистрированный на 'connect'
    const onConnectCall = mockSocket.on.mock.calls.find(
      ([event]) => event === 'connect',
    );
    expect(onConnectCall).toBeDefined();

    const onConnect = onConnectCall![1];
    onConnect(); // симулируем событие connect

    expect(mockSocket.emit).toHaveBeenCalledWith('board:join', {
      boardId: 'board-1',
    });
  });

  // ─── регистрация обработчиков ──────────────────────────────────────────────

  it('should register all socket event handlers', () => {
    renderHook(() => useBoardSocket('board-1'));

    const registeredEvents = mockSocket.on.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain('connect');
    expect(registeredEvents).toContain('disconnect');
    expect(registeredEvents).toContain('board:state');
    expect(registeredEvents).toContain('task:update');
    expect(registeredEvents).toContain('task:moved');
    expect(registeredEvents).toContain('task:reordered');
  });

  // ─── board:state ───────────────────────────────────────────────────────────

  it('should call setQueryData with board on board:state event', () => {
    renderHook(() => useBoardSocket('board-1'));

    const board = { id: 'board-1', columns: [] };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'board:state',
    )![1];
    handler(board);

    expect(mockSetQueryData).toHaveBeenCalledWith(['board', 'board-1'], board);
  });

  // ─── task:update ───────────────────────────────────────────────────────────

  it('should update task in correct column on task:update event', () => {
    renderHook(() => useBoardSocket('board-1'));

    const updatedTask = {
      id: 'task-1',
      title: 'Updated',
      columnId: 'col-1',
      column: { boardId: 'board-1' },
      order: 0,
    };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:update',
    )![1];
    handler({ boardId: 'board-1', task: updatedTask });

    // проверяем что updater-функция корректно обновляет задачу
    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const prevBoard = {
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [{ id: 'task-1', title: 'Old', columnId: 'col-1', order: 0 }],
        },
      ],
    };

    const result = updaterFn(prevBoard);
    expect(result.columns[0].tasks[0].title).toBe('Updated');
  });

  it('should return prev unchanged on task:update when prev is undefined', () => {
    renderHook(() => useBoardSocket('board-1'));

    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:update',
    )![1];
    handler({
      boardId: 'board-1',
      task: { id: 'task-1', title: 'X' },
    });

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    expect(updaterFn(undefined)).toBeUndefined();
  });

  it('should invalidate analytics on task:update when completion changes', () => {
    const prevBoard = {
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [
            {
              id: 'task-1',
              title: 'Task',
              columnId: 'col-1',
              order: 0,
              isCompleted: false,
            },
          ],
        },
      ],
    };
    mockSetQueryData.mockImplementation((_key, updater) => updater(prevBoard));
    renderHook(() => useBoardSocket('board-1'));

    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:update',
    )![1];
    handler({
      boardId: 'board-1',
      task: {
        id: 'task-1',
        title: 'Task',
        columnId: 'col-1',
        order: 0,
        isCompleted: true,
      },
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['boards', 'board-1', 'analytics'],
    });
  });

  it('should move task to the end of its column on completion update', () => {
    renderHook(() => useBoardSocket('board-1'));

    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:update',
    )![1];
    handler({
      boardId: 'board-1',
      task: {
        id: 'task-1',
        title: 'Task 1',
        columnId: 'col-1',
        order: 2,
        isCompleted: true,
      },
    });

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const result = updaterFn({
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [
            {
              id: 'task-1',
              title: 'Task 1',
              columnId: 'col-1',
              order: 0,
              isCompleted: false,
            },
            {
              id: 'task-2',
              title: 'Task 2',
              columnId: 'col-1',
              order: 1,
              isCompleted: false,
            },
          ],
        },
      ],
    });

    expect(result.columns[0].tasks.map((task: any) => task.id)).toEqual([
      'task-2',
      'task-1',
    ]);
    expect(result.columns[0].tasks.map((task: any) => task.order)).toEqual([
      0, 1,
    ]);
  });

  // ─── task:moved ────────────────────────────────────────────────────────────

  it('should move task to correct column on task:moved event', () => {
    renderHook(() => useBoardSocket('board-1'));

    const movedTask = { id: 'task-1', columnId: 'col-2', order: 0 };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:moved',
    )![1];
    handler({ boardId: 'board-1', task: movedTask });

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const prevBoard = {
      id: 'board-1',
      columns: [
        { id: 'col-1', tasks: [{ id: 'task-1', columnId: 'col-1', order: 0 }] },
        { id: 'col-2', tasks: [] },
      ],
    };

    const result = updaterFn(prevBoard);
    expect(result.columns[0].tasks).toHaveLength(0); // убрана из col-1
    expect(result.columns[1].tasks).toHaveLength(1); // добавлена в col-2
    expect(result.columns[1].tasks[0].id).toBe('task-1');
  });

  it('should sort tasks by order after task:moved', () => {
    renderHook(() => useBoardSocket('board-1'));

    const movedTask = { id: 'task-3', columnId: 'col-1', order: 1 };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:moved',
    )![1];
    handler({ boardId: 'board-1', task: movedTask });

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const prevBoard = {
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [
            { id: 'task-1', columnId: 'col-1', order: 0 },
            { id: 'task-2', columnId: 'col-1', order: 2 },
          ],
        },
      ],
    };

    const result = updaterFn(prevBoard);
    const orders = result.columns[0].tasks.map((t: any) => t.order);
    expect(orders).toEqual([0, 1, 2]);
  });

  it('should apply server column order after task:moved', () => {
    renderHook(() => useBoardSocket('board-1'));

    const movedTask = { id: 'task-3', columnId: 'col-2', order: 0 };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:moved',
    )![1];
    handler({
      boardId: 'board-1',
      task: movedTask,
      taskIdsByColumn: {
        'col-1': ['task-1'],
        'col-2': ['task-3', 'task-2'],
      },
    });

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const prevBoard = {
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [
            { id: 'task-1', columnId: 'col-1', order: 0 },
            { id: 'task-3', columnId: 'col-1', order: 1 },
          ],
        },
        {
          id: 'col-2',
          tasks: [{ id: 'task-2', columnId: 'col-2', order: 0 }],
        },
      ],
    };

    const result = updaterFn(prevBoard);
    expect(result.columns[0].tasks.map((task: any) => task.id)).toEqual([
      'task-1',
    ]);
    expect(result.columns[1].tasks.map((task: any) => task.id)).toEqual([
      'task-3',
      'task-2',
    ]);
    expect(result.columns[1].tasks.map((task: any) => task.order)).toEqual([
      0, 1,
    ]);
  });

  // ─── task:reordered ────────────────────────────────────────────────────────

  it('should reorder tasks in column on task:reordered event', () => {
    renderHook(() => useBoardSocket('board-1'));

    const payload = {
      boardId: 'board-1',
      columnId: 'col-1',
      taskIds: ['task-2', 'task-1'],
    };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:reordered',
    )![1];
    handler(payload);

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const prevBoard = {
      id: 'board-1',
      columns: [
        {
          id: 'col-1',
          tasks: [
            { id: 'task-1', order: 0 },
            { id: 'task-2', order: 1 },
          ],
        },
      ],
    };

    const result = updaterFn(prevBoard);
    expect(result.columns[0].tasks[0].id).toBe('task-2');
    expect(result.columns[0].tasks[1].id).toBe('task-1');
    expect(result.columns[0].tasks.map((task: any) => task.order)).toEqual([
      0, 1,
    ]);
  });

  it('should not affect other columns on task:reordered', () => {
    renderHook(() => useBoardSocket('board-1'));

    const payload = {
      boardId: 'board-1',
      columnId: 'col-1',
      taskIds: ['task-1'],
    };
    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'task:reordered',
    )![1];
    handler(payload);

    const updaterFn = mockSetQueryData.mock.calls[0][1];
    const col2Tasks = [{ id: 'task-2', order: 0 }];
    const prevBoard = {
      id: 'board-1',
      columns: [
        { id: 'col-1', tasks: [{ id: 'task-1', order: 0 }] },
        { id: 'col-2', tasks: col2Tasks },
      ],
    };

    const result = updaterFn(prevBoard);
    expect(result.columns[1].tasks).toBe(col2Tasks); // та же ссылка — не тронуто
  });

  // ─── cleanup ───────────────────────────────────────────────────────────────

  it('should invalidate board on task detail activity changes', () => {
    renderHook(() => useBoardSocket('board-1'));

    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'board:activity',
    )![1];
    handler({
      boardId: 'board-1',
      activity: {
        id: 'activity-1',
        event: 'task_updated',
        metadata: {
          changes: [{ field: 'attachment', from: null, to: { id: 'file-1' } }],
        },
      },
    });

    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['boards', 'board-1', 'activities'],
      expect.any(Function),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['board', 'board-1'],
      exact: true,
    });
  });

  it('should not invalidate board on ordinary task activity changes', () => {
    renderHook(() => useBoardSocket('board-1'));

    const handler = mockSocket.on.mock.calls.find(
      ([e]) => e === 'board:activity',
    )![1];
    handler({
      boardId: 'board-1',
      activity: {
        id: 'activity-1',
        event: 'task_updated',
        metadata: {
          changes: [{ field: 'title', from: 'Old', to: 'New' }],
        },
      },
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['board', 'board-1'],
      exact: true,
    });
  });

  it('should ignore task events from a previously joined board', () => {
    renderHook(() => useBoardSocket('board-2'));

    const updateHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === 'task:update',
    )![1];
    const moveHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === 'task:moved',
    )![1];
    const reorderHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === 'task:reordered',
    )![1];

    updateHandler({
      boardId: 'board-1',
      task: { id: 'task-1', title: 'Stale update' },
    });
    moveHandler({
      boardId: 'board-1',
      task: { id: 'task-1', columnId: 'column-1', order: 0 },
    });
    reorderHandler({
      boardId: 'board-1',
      columnId: 'column-1',
      taskIds: ['task-1'],
    });

    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it('should emit board:leave and remove all listeners on unmount', () => {
    const { unmount } = renderHook(() => useBoardSocket('board-1'));
    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('board:leave', {
      boardId: 'board-1',
    });
    expect(mockSocket.off).toHaveBeenCalledWith('board:state');
    expect(mockSocket.off).toHaveBeenCalledWith('task:update');
    expect(mockSocket.off).toHaveBeenCalledWith('task:moved');
    expect(mockSocket.off).toHaveBeenCalledWith('task:reordered');
    expect(mockSocket.off).toHaveBeenCalledWith(
      'connect',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'connect_error',
      expect.any(Function),
    );
    expect(mockSocket.off).toHaveBeenCalledWith(
      'disconnect',
      expect.any(Function),
    );
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  it('should re-subscribe when boardId changes', () => {
    mockSocket.connected = true;

    const { rerender } = renderHook(({ id }) => useBoardSocket(id), {
      initialProps: { id: 'board-1' },
    });

    rerender({ id: 'board-2' });

    // при смене boardId — cleanup старого + mount нового
    expect(mockSocket.emit).toHaveBeenCalledWith('board:leave', {
      boardId: 'board-1',
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('board:join', {
      boardId: 'board-2',
    });
  });
});
