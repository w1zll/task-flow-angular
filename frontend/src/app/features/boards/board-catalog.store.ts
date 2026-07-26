import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { BoardsApi } from '@core/api/clients/boards-api';
import { BoardResponseDto, CreateBoardDto, UpdateBoardDto } from '@core/api/generated';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';

interface BoardCatalogState {
  readonly busyId: string | null;
  readonly errorKey: string | null;
}

const initialState: BoardCatalogState = {
  busyId: null,
  errorKey: null,
};

const boardErrorKey = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'boards.errors.unknown';
  if (error.kind === 'forbidden') return 'boards.errors.forbidden';
  if (error.kind === 'not-found') return 'boards.errors.notFound';
  if (error.kind === 'validation') return 'boards.errors.invalidData';
  if (error.kind === 'network' || error.kind === 'server' || error.kind === 'unexpected-response') {
    return 'boards.errors.unavailable';
  }
  return 'boards.errors.unknown';
};

@Injectable({ providedIn: 'root' })
export class BoardCatalogStore {
  private readonly api = inject(BoardsApi);
  private readonly cache = inject(QueryCacheStore);

  readonly busyId = signal<string | null>(null);
  readonly errorKey = signal<string | null>(null);

  async create(data: CreateBoardDto): Promise<BoardResponseDto> {
    this.busyId.set('create');
    this.errorKey.set(null);

    try {
      const created = await firstValueFrom(this.api.create({ body: data }));
      this.cache.update<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) => [
        created,
        ...boards.filter((board) => board.id !== created.id),
      ]);
      this.cache.set(queryKeys.boardDetail(created.id), created);
      return created;
    } catch (error) {
      this.errorKey.set(boardErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  async update(boardId: string, data: UpdateBoardDto): Promise<BoardResponseDto> {
    this.busyId.set(boardId);
    this.errorKey.set(null);

    try {
      const updated = await firstValueFrom(this.api.update({ id: boardId, body: data }));
      this.upsertCatalog(updated);
      const detail = this.cache.get<BoardResponseDto>(queryKeys.boardDetail(boardId));
      if (detail) {
        this.cache.set(queryKeys.boardDetail(boardId), {
          ...detail,
          ...updated,
          columns: updated.columns ?? detail.columns,
          members: updated.members ?? detail.members,
        });
      }
      return updated;
    } catch (error) {
      this.errorKey.set(boardErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(boardId: string): Promise<void> {
    this.busyId.set(boardId);
    this.errorKey.set(null);

    try {
      await firstValueFrom(this.api.remove({ id: boardId }));
      this.cache.update<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) =>
        boards.filter((board) => board.id !== boardId),
      );
      this.cache.remove(queryKeys.boardDetail(boardId));
    } catch (error) {
      this.errorKey.set(boardErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  async detail(boardId: string, force = false): Promise<BoardResponseDto> {
    const board = await firstValueFrom(
      this.cache.execute(queryKeys.boardDetail(boardId), () => this.api.detail({ id: boardId }), {
        staleTime: 30_000,
        force,
      }),
    );
    this.upsertCatalog(board);
    return board;
  }

  clearError(): void {
    this.errorKey.set(null);
  }

  errorFor(error: unknown): string {
    return boardErrorKey(error);
  }

  private upsertCatalog(board: BoardResponseDto): void {
    const catalog = this.cache.get<readonly BoardResponseDto[]>(queryKeys.boardsCatalog);
    if (!catalog) return;

    this.cache.update<readonly BoardResponseDto[]>(queryKeys.boardsCatalog, (boards = []) => {
      const index = boards.findIndex((item) => item.id === board.id);
      if (index < 0) return [board, ...boards];

      return boards.map((item) => (item.id === board.id ? { ...item, ...board } : item));
    });
  }
}
