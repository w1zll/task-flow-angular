import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TasksService } from '@/tasks/tasks.service';
import { BoardGateway } from './boards.gateway';
import { BoardsService } from './boards.service';

describe('BoardGateway', () => {
  let gateway: BoardGateway;
  let boardsService: jest.Mocked<Pick<BoardsService, 'findOne'>>;
  let tasksService: jest.Mocked<
    Pick<TasksService, 'update' | 'move' | 'reorder' | 'getTaskIdsByColumn'>
  >;
  let boardActivityPublisher: { setServer: jest.Mock };
  let notificationsService: { countUnread: jest.Mock };
  let notificationsPublisher: { setServer: jest.Mock };
  let roomEmit: jest.Mock;
  let serverTo: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let client: jest.Mocked<Pick<Socket, 'join' | 'leave' | 'emit'>> & {
    user: { sub: string };
  };

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    boardsService = {
      findOne: jest.fn(),
    };
    tasksService = {
      update: jest.fn(),
      move: jest.fn(),
      reorder: jest.fn(),
      getTaskIdsByColumn: jest.fn(),
    };
    boardActivityPublisher = { setServer: jest.fn() };
    notificationsService = { countUnread: jest.fn().mockResolvedValue(0) };
    notificationsPublisher = { setServer: jest.fn() };
    gateway = new BoardGateway(
      boardsService as unknown as BoardsService,
      tasksService as unknown as TasksService,
      boardActivityPublisher as never,
      notificationsService as never,
      notificationsPublisher as never,
    );
    roomEmit = jest.fn();
    serverTo = jest.fn(() => ({ emit: roomEmit }));
    gateway.server = { to: serverTo } as never;
    client = {
      user: { sub: 'user-1' },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('checks access before joining a board room', async () => {
    const board = { id: 'board-1' };
    boardsService.findOne.mockResolvedValue(board as never);

    await gateway.handleJoinBoard(client as unknown as Socket, {
      boardId: 'board-1',
    });

    expect(boardsService.findOne).toHaveBeenCalledWith('board-1', 'user-1');
    expect(client.join).toHaveBeenCalledWith('board-board-1');
    expect(client.emit).toHaveBeenCalledWith('board:state', board);
    expect(boardsService.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      client.join.mock.invocationCallOrder[0],
    );
  });

  it('does not join a forbidden board room', async () => {
    boardsService.findOne.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );

    await expect(
      gateway.handleJoinBoard(client as unknown as Socket, {
        boardId: 'board-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalledWith(
      'board:state',
      expect.anything(),
    );
  });

  it('leaves the requested board room', async () => {
    await gateway.handleLeaveBoard(client as unknown as Socket, {
      boardId: 'board-1',
    });

    expect(client.leave).toHaveBeenCalledWith('board-board-1');
  });

  it('does not broadcast a viewer task update rejected by permissions', async () => {
    tasksService.update.mockRejectedValue(
      new ForbiddenException('You do not have permission to edit this board'),
    );
    const ack = jest.fn();

    await gateway.handleTaskUpdate(
      client as unknown as Socket,
      {
        boardId: 'board-1',
        taskId: 'task-1',
        changes: { title: 'Blocked' },
      },
      ack,
    );

    expect(tasksService.update).toHaveBeenCalledWith(
      'task-1',
      { title: 'Blocked' },
      'user-1',
      'board-1',
    );
    expect(serverTo).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      code: 'permission_changed',
      message: 'You do not have permission to edit this board',
      retryable: false,
    });
  });

  it('broadcasts a task update only to its actual board room', async () => {
    const task = {
      id: 'task-1',
      column: { boardId: 'board-1' },
    };
    tasksService.update.mockResolvedValue(task as never);
    const ack = jest.fn();

    await gateway.handleTaskUpdate(
      client as unknown as Socket,
      {
        boardId: 'board-1',
        taskId: 'task-1',
        changes: { title: 'Updated' },
      },
      ack,
    );

    expect(serverTo).toHaveBeenCalledWith('board-board-1');
    expect(roomEmit).toHaveBeenCalledWith('task:update', {
      boardId: 'board-1',
      task,
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('does not replay a duplicate idempotent task update', async () => {
    const task = {
      id: 'task-1',
      column: { boardId: 'board-1' },
    };
    tasksService.update.mockResolvedValue(task as never);
    const firstAck = jest.fn();
    const secondAck = jest.fn();
    const payload = {
      boardId: 'board-1',
      taskId: 'task-1',
      changes: { title: 'Updated' },
      idempotencyKey: 'mutation-1',
    };

    await gateway.handleTaskUpdate(client as unknown as Socket, payload, firstAck);
    await gateway.handleTaskUpdate(
      client as unknown as Socket,
      payload,
      secondAck,
    );

    expect(tasksService.update).toHaveBeenCalledTimes(1);
    expect(serverTo).toHaveBeenCalledTimes(1);
    expect(firstAck).toHaveBeenCalledWith({ ok: true });
    expect(secondAck).toHaveBeenCalledWith({ ok: true });
  });

  it('acks stale task moves as non-retryable conflicts', async () => {
    tasksService.move.mockRejectedValue(
      new ConflictException('Task was moved by another user'),
    );
    const ack = jest.fn();

    await gateway.handleTaskMove(
      client as unknown as Socket,
      {
        boardId: 'board-1',
        taskId: 'task-1',
        columnId: 'column-2',
        sourceColumnId: 'column-1',
        order: 0,
        idempotencyKey: 'mutation-2',
      },
      ack,
    );

    expect(serverTo).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      code: 'task_already_moved',
      message: 'Task was moved by another user',
      retryable: false,
    });
  });

  it('broadcasts final source and target column task order after task move', async () => {
    const task = {
      id: 'task-1',
      columnId: 'column-2',
      column: { boardId: 'board-1' },
      order: 0,
    };
    tasksService.move.mockResolvedValue(task as never);
    tasksService.getTaskIdsByColumn.mockResolvedValue({
      'column-1': ['task-2'],
      'column-2': ['task-1', 'task-3'],
    });
    const ack = jest.fn();

    await gateway.handleTaskMove(
      client as unknown as Socket,
      {
        boardId: 'board-1',
        taskId: 'task-1',
        columnId: 'column-2',
        sourceColumnId: 'column-1',
        order: 0,
      },
      ack,
    );

    expect(tasksService.getTaskIdsByColumn).toHaveBeenCalledWith([
      'column-1',
      'column-2',
    ]);
    expect(roomEmit).toHaveBeenCalledWith('task:moved', {
      boardId: 'board-1',
      task,
      taskIdsByColumn: {
        'column-1': ['task-2'],
        'column-2': ['task-1', 'task-3'],
      },
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });
});
