import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { ColumnsApi } from '@core/api/clients/columns-api';
import { TasksApi } from '@core/api/clients/tasks-api';
import {
  BoardResponseDto,
  ColumnResponseDto,
  CreateTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from '@core/api/generated';
import { OptimisticTransaction, QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';
import {
  BoardRealtime,
  BoardRealtimeAckError,
  BoardRealtimeUnavailableError,
} from '@core/realtime/board-realtime';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';

export type MoveDirection = 'backward' | 'forward';

const mutationErrorKey = (error: unknown): string => {
  if (error instanceof BoardRealtimeAckError) {
    if (error.code === 'permission_changed') return 'kanban.errors.forbidden';
    if (
      error.code === 'task_deleted' ||
      error.code === 'column_deleted' ||
      error.code === 'board_deleted'
    ) {
      return 'kanban.errors.notFound';
    }
    if (error.code === 'task_already_moved' || error.code === 'task_order_conflict') {
      return 'kanban.errors.conflict';
    }
    if (error.code === 'validation_failed') return 'kanban.errors.invalidData';
    return 'kanban.errors.unavailable';
  }
  if (error instanceof BoardRealtimeUnavailableError) return 'kanban.errors.unavailable';
  if (!(error instanceof ApiError)) return 'kanban.errors.unknown';
  if (error.kind === 'forbidden') return 'kanban.errors.forbidden';
  if (error.kind === 'not-found') return 'kanban.errors.notFound';
  if (error.kind === 'conflict') return 'kanban.errors.conflict';
  if (error.kind === 'validation') return 'kanban.errors.invalidData';
  if (error.kind === 'network' || error.kind === 'server' || error.kind === 'unexpected-response') {
    return 'kanban.errors.unavailable';
  }
  return 'kanban.errors.unknown';
};

const shouldReloadBoard = (error: unknown): boolean =>
  error instanceof BoardRealtimeAckError ||
  error instanceof BoardRealtimeUnavailableError ||
  (error instanceof ApiError &&
    (error.kind === 'network' ||
      error.kind === 'server' ||
      error.kind === 'unexpected-response' ||
      error.kind === 'conflict'));

const sortColumns = (columns: readonly ColumnResponseDto[]): ColumnResponseDto[] =>
  [...columns]
    .sort((left, right) => left.order - right.order)
    .map((column, order) => ({ ...column, order }));

const sortTasks = (tasks: readonly TaskResponseDto[]): TaskResponseDto[] =>
  [...tasks]
    .sort((left, right) => left.order - right.order)
    .map((task, order) => ({ ...task, order }));

const updateBoardTask = (
  board: BoardResponseDto,
  taskId: string,
  updater: (task: TaskResponseDto) => TaskResponseDto,
): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) => ({
    ...column,
    tasks: (column.tasks ?? []).map((task) => (task.id === taskId ? updater(task) : task)),
  })),
});

const removeBoardTask = (board: BoardResponseDto, taskId: string): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) => ({
    ...column,
    tasks: sortTasks((column.tasks ?? []).filter((task) => task.id !== taskId)),
  })),
});

const upsertBoardTask = (
  board: BoardResponseDto,
  task: TaskResponseDto,
  replacedId = task.id,
): BoardResponseDto => {
  const withoutTask = removeBoardTask(removeBoardTask(board, replacedId), task.id);

  return {
    ...withoutTask,
    columns: (withoutTask.columns ?? []).map((column) =>
      column.id === task.columnId
        ? { ...column, tasks: sortTasks([...(column.tasks ?? []), task]) }
        : column,
    ),
  };
};

const moveBoardTask = (
  board: BoardResponseDto,
  taskId: string,
  columnId: string,
  order: number,
): BoardResponseDto => {
  const task = (board.columns ?? [])
    .flatMap((column) => column.tasks ?? [])
    .find((candidate) => candidate.id === taskId);
  if (!task) return board;

  return upsertBoardTask(board, { ...task, columnId, order });
};

const reorderBoardTasks = (
  board: BoardResponseDto,
  columnId: string,
  taskIds: readonly string[],
): BoardResponseDto => ({
  ...board,
  columns: (board.columns ?? []).map((column) => {
    if (column.id !== columnId) return column;
    const byId = new Map((column.tasks ?? []).map((task) => [task.id, task]));
    return {
      ...column,
      tasks: taskIds
        .map((id, order) => {
          const task = byId.get(id);
          return task ? { ...task, order } : null;
        })
        .filter((task): task is TaskResponseDto => task !== null),
    };
  }),
});

@Injectable({ providedIn: 'root' })
export class KanbanStore {
  private readonly boards = inject(BoardCatalogStore);
  private readonly cache = inject(QueryCacheStore);
  private readonly columnsApi = inject(ColumnsApi);
  private readonly realtime = inject(BoardRealtime);
  private readonly tasksApi = inject(TasksApi);

  readonly busyId = signal<string | null>(null);
  readonly errorKey = signal<string | null>(null);

  async createColumn(board: BoardResponseDto, title: string): Promise<BoardResponseDto> {
    const transaction = this.begin(board.id, `column:${title}`, (current) => current);
    this.busyId.set('column:create');
    this.errorKey.set(null);

    try {
      const created = await firstValueFrom(
        this.columnsApi.create({
          body: {
            boardId: board.id,
            order: board.columns?.length ?? 0,
            title,
          },
        }),
      );
      this.reconcile(transaction, board.id, (current) => ({
        ...current,
        columns: sortColumns([
          ...(current.columns ?? []).filter((column) => column.id !== created.id),
          created,
        ]),
      }));
      return this.currentBoard(board.id, board);
    } catch (error) {
      return this.fail(transaction, board.id, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async renameColumn(boardId: string, columnId: string, title: string): Promise<BoardResponseDto> {
    const transaction = this.begin(boardId, columnId, (board) => ({
      ...board,
      columns: (board.columns ?? []).map((column) =>
        column.id === columnId ? { ...column, title } : column,
      ),
    }));
    this.start(columnId);

    try {
      const updated = await firstValueFrom(
        this.columnsApi.update({ id: columnId, body: { title } }),
      );
      this.reconcile(transaction, boardId, (board) => ({
        ...board,
        columns: (board.columns ?? []).map((column) =>
          column.id === columnId
            ? { ...column, ...updated, tasks: updated.tasks ?? column.tasks }
            : column,
        ),
      }));
      return this.currentBoard(boardId);
    } catch (error) {
      return this.fail(transaction, boardId, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async removeColumn(boardId: string, columnId: string): Promise<BoardResponseDto> {
    const transaction = this.begin(boardId, columnId, (board) => ({
      ...board,
      columns: sortColumns((board.columns ?? []).filter((column) => column.id !== columnId)),
    }));
    this.start(columnId);

    try {
      await firstValueFrom(this.columnsApi.remove({ id: columnId }));
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(boardId);
    } catch (error) {
      return this.fail(transaction, boardId, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async moveColumn(
    board: BoardResponseDto,
    columnId: string,
    direction: MoveDirection,
  ): Promise<BoardResponseDto> {
    const columns = sortColumns(board.columns ?? []);
    const index = columns.findIndex((column) => column.id === columnId);
    const targetIndex = direction === 'backward' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= columns.length) return board;

    [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];
    const columnIds = columns.map((column) => column.id);
    const transaction = this.begin(board.id, columnId, (current) => ({
      ...current,
      columns: reorderColumns(current.columns ?? [], columnIds),
    }));
    this.start(columnId);

    try {
      await firstValueFrom(
        this.columnsApi.reorder({
          boardId: board.id,
          body: { columnIds },
        }),
      );
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(board.id, board);
    } catch (error) {
      return this.fail(transaction, board.id, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async createTask(boardId: string, data: CreateTaskDto): Promise<BoardResponseDto> {
    const board = this.currentBoard(boardId);
    const now = new Date().toISOString();
    const temporaryId = `optimistic:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
    const assignee = board.members?.find((member) => member.userId === data.assigneeId)?.user;
    const temporaryTask: TaskResponseDto = {
      ...data,
      id: temporaryId,
      createdAt: now,
      updatedAt: now,
      order: data.order ?? 0,
      assignee,
    };
    const transaction = this.begin(boardId, temporaryId, (current) =>
      upsertBoardTask(current, temporaryTask),
    );
    this.start(temporaryId);

    try {
      const created = await firstValueFrom(this.tasksApi.create({ body: data }));
      this.reconcile(transaction, boardId, (current) =>
        upsertBoardTask(current, created, temporaryId),
      );
      return this.currentBoard(boardId, board);
    } catch (error) {
      return this.fail(transaction, boardId, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async updateTask(
    boardId: string,
    taskId: string,
    data: UpdateTaskDto,
  ): Promise<BoardResponseDto> {
    const transaction = this.begin(boardId, taskId, (board) =>
      updateBoardTask(board, taskId, (task) => ({ ...task, ...data })),
    );
    this.start(taskId);

    try {
      await this.realtime.updateTask(boardId, taskId, data);
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(boardId);
    } catch (error) {
      return this.fail(transaction, boardId, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async removeTask(boardId: string, taskId: string): Promise<BoardResponseDto> {
    const transaction = this.begin(boardId, taskId, (board) => removeBoardTask(board, taskId));
    this.start(taskId);

    try {
      await firstValueFrom(this.tasksApi.remove({ id: taskId }));
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(boardId);
    } catch (error) {
      return this.fail(transaction, boardId, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async moveTask(
    board: BoardResponseDto,
    task: TaskResponseDto,
    targetColumnId: string,
  ): Promise<BoardResponseDto> {
    if (targetColumnId === task.columnId) return board;
    const targetColumn = board.columns?.find((column) => column.id === targetColumnId);
    const order = targetColumn?.tasks?.length ?? 0;
    const transaction = this.begin(board.id, task.id, (current) =>
      moveBoardTask(current, task.id, targetColumnId, order),
    );
    this.start(task.id);

    try {
      await this.realtime.moveTask(board.id, task.id, targetColumnId, order, task.columnId);
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(board.id, board);
    } catch (error) {
      return this.fail(transaction, board.id, error);
    } finally {
      this.busyId.set(null);
    }
  }

  async reorderTask(
    board: BoardResponseDto,
    task: TaskResponseDto,
    direction: MoveDirection,
  ): Promise<BoardResponseDto> {
    const column = board.columns?.find((item) => item.id === task.columnId);
    if (!column) return board;

    const tasks = sortTasks(column.tasks ?? []);
    const index = tasks.findIndex((item) => item.id === task.id);
    const targetIndex = direction === 'backward' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= tasks.length) return board;

    [tasks[index], tasks[targetIndex]] = [tasks[targetIndex], tasks[index]];
    const taskIds = tasks.map((item) => item.id);
    const transaction = this.begin(board.id, task.id, (current) =>
      reorderBoardTasks(current, column.id, taskIds),
    );
    this.start(task.id);

    try {
      await this.realtime.reorderTask(board.id, column.id, taskIds);
      transaction.commit();
      this.cache.invalidate(queryKeys.boardsCatalog);
      return this.currentBoard(board.id, board);
    } catch (error) {
      return this.fail(transaction, board.id, error);
    } finally {
      this.busyId.set(null);
    }
  }

  clearError(): void {
    this.errorKey.set(null);
  }

  private start(busyId: string): void {
    this.busyId.set(busyId);
    this.errorKey.set(null);
  }

  private begin(
    boardId: string,
    entityId: string,
    updater: (board: BoardResponseDto) => BoardResponseDto,
  ): OptimisticTransaction {
    const transaction = this.cache.optimisticTransaction(entityId);
    transaction.update<BoardResponseDto>(queryKeys.boardDetail(boardId), (board) =>
      updater(board ?? this.currentBoard(boardId)),
    );
    if (this.cache.get<readonly BoardResponseDto[]>(queryKeys.boardsCatalog)) {
      transaction.update<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) =>
        boards.map((board) => (board.id === boardId ? updater(board) : board)),
      );
    }
    return transaction;
  }

  private reconcile(
    transaction: OptimisticTransaction,
    boardId: string,
    updater: (board: BoardResponseDto) => BoardResponseDto,
  ): void {
    if (!transaction.isActive()) return;
    transaction.reconcile<BoardResponseDto>(queryKeys.boardDetail(boardId), (board) =>
      updater(board ?? this.currentBoard(boardId)),
    );
    if (this.cache.get<readonly BoardResponseDto[]>(queryKeys.boardsCatalog)) {
      transaction.reconcile<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) =>
        boards.map((board) => (board.id === boardId ? updater(board) : board)),
      );
    }
    transaction.commit();
    this.cache.invalidate(queryKeys.boardsCatalog);
  }

  private currentBoard(boardId: string, fallback?: BoardResponseDto): BoardResponseDto {
    const board = this.cache.get<BoardResponseDto>(queryKeys.boardDetail(boardId)) ?? fallback;
    if (!board) throw new Error(`Board ${boardId} is not cached`);
    return board;
  }

  private fail(transaction: OptimisticTransaction, boardId: string, error: unknown): never {
    transaction.rollback();
    this.errorKey.set(mutationErrorKey(error));
    if (
      (error instanceof BoardRealtimeAckError && error.code === 'permission_changed') ||
      (error instanceof ApiError && error.kind === 'forbidden')
    ) {
      this.removeWriteCapabilities(boardId);
    }
    if (shouldReloadBoard(error)) {
      void this.boards.detail(boardId, true).catch(() => undefined);
    }
    throw error;
  }

  private removeWriteCapabilities(boardId: string): void {
    const restrict = (board: BoardResponseDto): BoardResponseDto => ({
      ...board,
      currentUserRole: 'viewer',
      capabilities: {
        ...board.capabilities,
        canDeleteBoard: false,
        canEditBoardContent: false,
        canManageBoardMembers: false,
        canManageBoardSettings: false,
        canManageColumns: false,
        canUseWhiteboard: false,
      },
    });
    const detail = this.cache.get<BoardResponseDto>(queryKeys.boardDetail(boardId));
    if (detail) {
      this.cache.updateFromServer<BoardResponseDto>(queryKeys.boardDetail(boardId), (board) =>
        restrict(board ?? detail),
      );
    }
    if (this.cache.get<readonly BoardResponseDto[]>(queryKeys.boardsCatalog)) {
      this.cache.updateFromServer<readonly BoardResponseDto[]>(
        queryKeys.boardsCatalog,
        (boards = []) => boards.map((board) => (board.id === boardId ? restrict(board) : board)),
      );
    }
  }
}

const reorderColumns = (
  columns: readonly ColumnResponseDto[],
  columnIds: readonly string[],
): ColumnResponseDto[] => {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return columnIds
    .map((id, order) => {
      const column = byId.get(id);
      return column ? { ...column, order } : null;
    })
    .filter((column): column is ColumnResponseDto => column !== null);
};
