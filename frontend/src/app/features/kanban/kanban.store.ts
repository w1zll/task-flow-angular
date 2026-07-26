import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import {
  BoardResponseDto,
  CreateTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from '@core/api/generated';
import { ColumnsApi } from '@core/api/clients/columns-api';
import { TasksApi } from '@core/api/clients/tasks-api';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';

export type MoveDirection = 'backward' | 'forward';

const mutationErrorKey = (error: unknown): string => {
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

@Injectable({ providedIn: 'root' })
export class KanbanStore {
  private readonly boards = inject(BoardCatalogStore);
  private readonly columnsApi = inject(ColumnsApi);
  private readonly tasksApi = inject(TasksApi);

  readonly busyId = signal<string | null>(null);
  readonly errorKey = signal<string | null>(null);

  async createColumn(board: BoardResponseDto, title: string): Promise<BoardResponseDto> {
    return this.mutate('column:create', board.id, async () => {
      await firstValueFrom(
        this.columnsApi.create({
          body: {
            boardId: board.id,
            order: board.columns?.length ?? 0,
            title,
          },
        }),
      );
    });
  }

  async renameColumn(boardId: string, columnId: string, title: string): Promise<BoardResponseDto> {
    return this.mutate(columnId, boardId, async () => {
      await firstValueFrom(this.columnsApi.update({ id: columnId, body: { title } }));
    });
  }

  async removeColumn(boardId: string, columnId: string): Promise<BoardResponseDto> {
    return this.mutate(columnId, boardId, async () => {
      await firstValueFrom(this.columnsApi.remove({ id: columnId }));
    });
  }

  async moveColumn(
    board: BoardResponseDto,
    columnId: string,
    direction: MoveDirection,
  ): Promise<BoardResponseDto> {
    const columns = [...(board.columns ?? [])].sort((a, b) => a.order - b.order);
    const index = columns.findIndex((column) => column.id === columnId);
    const targetIndex = direction === 'backward' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= columns.length) return board;

    [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];

    return this.mutate(columnId, board.id, async () => {
      await firstValueFrom(
        this.columnsApi.reorder({
          boardId: board.id,
          body: { columnIds: columns.map((column) => column.id) },
        }),
      );
    });
  }

  async createTask(boardId: string, data: CreateTaskDto): Promise<BoardResponseDto> {
    return this.mutate('task:create', boardId, async () => {
      await firstValueFrom(this.tasksApi.create({ body: data }));
    });
  }

  async updateTask(
    boardId: string,
    taskId: string,
    data: UpdateTaskDto,
  ): Promise<BoardResponseDto> {
    return this.mutate(taskId, boardId, async () => {
      await firstValueFrom(this.tasksApi.update({ id: taskId, body: data }));
    });
  }

  async removeTask(boardId: string, taskId: string): Promise<BoardResponseDto> {
    return this.mutate(taskId, boardId, async () => {
      await firstValueFrom(this.tasksApi.remove({ id: taskId }));
    });
  }

  async moveTask(
    board: BoardResponseDto,
    task: TaskResponseDto,
    targetColumnId: string,
  ): Promise<BoardResponseDto> {
    if (targetColumnId === task.columnId) return board;
    const targetColumn = board.columns?.find((column) => column.id === targetColumnId);
    const order = targetColumn?.tasks?.length ?? 0;

    return this.mutate(task.id, board.id, async () => {
      await firstValueFrom(
        this.tasksApi.move({
          id: task.id,
          body: { columnId: targetColumnId, order },
        }),
      );
    });
  }

  async reorderTask(
    board: BoardResponseDto,
    task: TaskResponseDto,
    direction: MoveDirection,
  ): Promise<BoardResponseDto> {
    const column = board.columns?.find((item) => item.id === task.columnId);
    if (!column) return board;

    const tasks = [...(column.tasks ?? [])].sort((a, b) => a.order - b.order);
    const index = tasks.findIndex((item) => item.id === task.id);
    const targetIndex = direction === 'backward' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= tasks.length) return board;

    [tasks[index], tasks[targetIndex]] = [tasks[targetIndex], tasks[index]];

    return this.mutate(task.id, board.id, async () => {
      await firstValueFrom(
        this.tasksApi.reorder({
          columnId: column.id,
          body: { taskIds: tasks.map((item) => item.id) },
        }),
      );
    });
  }

  clearError(): void {
    this.errorKey.set(null);
  }

  private async mutate(
    busyId: string,
    boardId: string,
    mutation: () => Promise<void>,
  ): Promise<BoardResponseDto> {
    this.busyId.set(busyId);
    this.errorKey.set(null);
    try {
      await mutation();
      return await this.boards.detail(boardId, true);
    } catch (error) {
      this.errorKey.set(mutationErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }
}
