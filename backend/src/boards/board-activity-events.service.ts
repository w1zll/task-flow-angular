import { Injectable } from '@nestjs/common';
import {
  BoardActivityEntityType,
  BoardActivityEventType,
} from './entities/board-activity.entity';
import { BoardActivityService } from './board-activity.service';
import { BoardActivityPublisher } from './board-activity.publisher';

const REORDER_DEDUPE_WINDOW_MS = 10_000;

const getMetadataId = (
  metadata: Record<string, unknown> | null,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
};

@Injectable()
export class BoardActivityEventsService {
  constructor(
    private readonly activityService: BoardActivityService,
    private readonly boardActivityPublisher: BoardActivityPublisher,
  ) {}

  private async createAndEmit(
    boardId: string,
    userId: string | null,
    event: BoardActivityEventType,
    entityType: BoardActivityEntityType,
    entityId: string | null,
    metadata: Record<string, unknown> | null,
    dedupeWindowMs?: number,
  ) {
    const activity = await this.activityService.log(
      boardId,
      userId,
      event,
      {
        entityType,
        entityId,
        metadata,
        dedupeWindowMs,
      },
    );

    this.boardActivityPublisher.emitActivity(boardId, activity);

    return activity;
  }

  async logBoardCreated(boardId: string, userId: string) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.BOARD_CREATED,
      BoardActivityEntityType.BOARD,
      boardId,
      null,
    );
  }

  async logBoardUpdated(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown> | null = null,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.BOARD_UPDATED,
      BoardActivityEntityType.BOARD,
      boardId,
      metadata,
    );
  }

  async logBoardMemberInvited(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.BOARD_MEMBER_INVITED,
      BoardActivityEntityType.BOARD_MEMBER,
      getMetadataId(metadata, 'memberId') ?? getMetadataId(metadata, 'memberUserId'),
      metadata,
    );
  }

  async logBoardMemberRoleChanged(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.BOARD_MEMBER_ROLE_CHANGED,
      BoardActivityEntityType.BOARD_MEMBER,
      getMetadataId(metadata, 'memberId') ?? getMetadataId(metadata, 'memberUserId'),
      metadata,
    );
  }

  async logBoardMemberRemoved(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.BOARD_MEMBER_REMOVED,
      BoardActivityEntityType.BOARD_MEMBER,
      getMetadataId(metadata, 'memberId') ?? getMetadataId(metadata, 'memberUserId'),
      metadata,
    );
  }

  async logTaskCreated(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_CREATED,
      BoardActivityEntityType.TASK,
      getMetadataId(metadata, 'taskId'),
      metadata,
    );
  }

  async logTaskUpdated(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_UPDATED,
      BoardActivityEntityType.TASK,
      getMetadataId(metadata, 'taskId'),
      metadata,
    );
  }

  async logTaskCompleted(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_COMPLETED,
      BoardActivityEntityType.TASK,
      getMetadataId(metadata, 'taskId'),
      metadata,
    );
  }

  async logTaskMoved(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_MOVED,
      BoardActivityEntityType.TASK,
      getMetadataId(metadata, 'taskId'),
      metadata,
    );
  }

  async logTaskReordered(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_REORDERED,
      BoardActivityEntityType.COLUMN,
      getMetadataId(metadata, 'columnId'),
      metadata,
      REORDER_DEDUPE_WINDOW_MS,
    );
  }

  async logTaskDeleted(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.TASK_DELETED,
      BoardActivityEntityType.TASK,
      getMetadataId(metadata, 'taskId'),
      metadata,
    );
  }

  async logColumnCreated(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.COLUMN_CREATED,
      BoardActivityEntityType.COLUMN,
      getMetadataId(metadata, 'columnId'),
      metadata,
    );
  }

  async logColumnUpdated(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.COLUMN_UPDATED,
      BoardActivityEntityType.COLUMN,
      getMetadataId(metadata, 'columnId'),
      metadata,
    );
  }

  async logColumnReordered(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.COLUMN_REORDERED,
      BoardActivityEntityType.BOARD,
      boardId,
      metadata,
      REORDER_DEDUPE_WINDOW_MS,
    );
  }

  async logColumnDeleted(
    boardId: string,
    userId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.createAndEmit(
      boardId,
      userId,
      BoardActivityEventType.COLUMN_DELETED,
      BoardActivityEntityType.COLUMN,
      getMetadataId(metadata, 'columnId'),
      metadata,
    );
  }
}
