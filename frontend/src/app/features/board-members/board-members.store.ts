import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { BoardMembersApi } from '@core/api/clients/board-members-api';
import { WorkspacesApi } from '@core/api/clients/workspaces-api';
import {
  BoardMemberResponseDto,
  BoardResponseDto,
  WorkspaceMemberResponseDto,
} from '@core/api/generated';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';

type BoardMemberRole = 'editor' | 'viewer';

const memberErrorKey = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'boardMembers.errors.unknown';
  if (error.kind === 'forbidden') return 'boardMembers.errors.forbidden';
  if (error.kind === 'not-found') return 'boardMembers.errors.notFound';
  if (error.kind === 'validation') return 'boardMembers.errors.invalidData';
  if (error.kind === 'network' || error.kind === 'server' || error.kind === 'unexpected-response') {
    return 'boardMembers.errors.unavailable';
  }
  return 'boardMembers.errors.unknown';
};

@Injectable({ providedIn: 'root' })
export class BoardMembersStore {
  private readonly api = inject(BoardMembersApi);
  private readonly workspacesApi = inject(WorkspacesApi);
  private readonly cache = inject(QueryCacheStore);

  readonly busyId = signal<string | null>(null);
  readonly errorKey = signal<string | null>(null);

  async load(
    boardId: string,
    workspaceId: string,
    force = false,
  ): Promise<{
    members: readonly BoardMemberResponseDto[];
    workspaceMembers: readonly WorkspaceMemberResponseDto[];
  }> {
    this.errorKey.set(null);
    try {
      const [members, workspaceMembers] = await Promise.all([
        firstValueFrom(
          this.cache.execute(
            queryKeys.boardMembers(boardId),
            () => this.api.list({ id: boardId }),
            { staleTime: 15_000, force },
          ),
        ),
        firstValueFrom(
          this.cache.execute(
            queryKeys.workspaceMembers(workspaceId),
            () => this.workspacesApi.members({ id: workspaceId }),
            { staleTime: 30_000, force },
          ),
        ),
      ]);
      this.syncDetail(boardId, members);
      return { members, workspaceMembers };
    } catch (error) {
      this.errorKey.set(memberErrorKey(error));
      throw error;
    }
  }

  async add(
    boardId: string,
    userId: string,
    role: BoardMemberRole,
  ): Promise<BoardMemberResponseDto> {
    this.busyId.set('add');
    this.errorKey.set(null);
    try {
      const member = await firstValueFrom(this.api.add({ id: boardId, body: { userId, role } }));
      const members = this.updateMembers(boardId, (current) => [
        ...current.filter((item) => item.userId !== member.userId),
        member,
      ]);
      this.syncDetail(boardId, members);
      return member;
    } catch (error) {
      this.errorKey.set(memberErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  async updateRole(
    boardId: string,
    memberId: string,
    role: BoardMemberRole,
  ): Promise<BoardMemberResponseDto> {
    this.busyId.set(memberId);
    this.errorKey.set(null);
    try {
      const member = await firstValueFrom(
        this.api.updateRole({ id: boardId, memberId, body: { role } }),
      );
      const members = this.updateMembers(boardId, (current) =>
        current.map((item) => (item.id === memberId ? member : item)),
      );
      this.syncDetail(boardId, members);
      return member;
    } catch (error) {
      this.errorKey.set(memberErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(boardId: string, memberId: string): Promise<void> {
    this.busyId.set(memberId);
    this.errorKey.set(null);
    try {
      await firstValueFrom(this.api.remove({ id: boardId, memberId }));
      const members = this.updateMembers(boardId, (current) =>
        current.filter((item) => item.id !== memberId),
      );
      this.syncDetail(boardId, members);
    } catch (error) {
      this.errorKey.set(memberErrorKey(error));
      throw error;
    } finally {
      this.busyId.set(null);
    }
  }

  clearError(): void {
    this.errorKey.set(null);
  }

  private updateMembers(
    boardId: string,
    updater: (current: readonly BoardMemberResponseDto[]) => readonly BoardMemberResponseDto[],
  ): readonly BoardMemberResponseDto[] {
    const current =
      this.cache.get<readonly BoardMemberResponseDto[]>(queryKeys.boardMembers(boardId)) ?? [];
    const updated = updater(current);
    this.cache.set(queryKeys.boardMembers(boardId), updated);
    return updated;
  }

  private syncDetail(boardId: string, members: readonly BoardMemberResponseDto[]): void {
    const detail = this.cache.get<BoardResponseDto>(queryKeys.boardDetail(boardId));
    if (!detail) return;

    this.cache.set(queryKeys.boardDetail(boardId), {
      ...detail,
      members: [...members],
    });
  }
}
