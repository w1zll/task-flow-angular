import {
  ConnectedSocket,
  Ack,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BoardsService } from './boards.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { TasksService } from '@/tasks/tasks.service';
import { UpdateTaskDto } from '@/tasks/dto/task.dto';
import { corsOrigin } from '@/common/cors/cors-origin';
import { BoardActivityPublisher } from './board-activity.publisher';
import { NotificationsPublisher } from '@/notifications/notifications.publisher';
import { NotificationsService } from '@/notifications/notifications.service';

export type BoardSocketAckErrorCode =
  | 'permission_changed'
  | 'task_deleted'
  | 'column_deleted'
  | 'board_deleted'
  | 'task_already_moved'
  | 'task_order_conflict'
  | 'validation_failed'
  | 'unknown';

type SocketAckResponse = {
  ok: boolean;
  code?: BoardSocketAckErrorCode;
  message?: string;
  retryable?: boolean;
};

type SocketAck = (response: SocketAckResponse) => void;

type BoardSocketMutationPayload = {
  idempotencyKey?: unknown;
};

const IDEMPOTENCY_ACK_TTL_MS = 1000 * 60 * 10;
const MAX_CACHED_ACKS = 500;

@WebSocketGateway({
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  namespace: '/boards',
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly mutationAckCache = new Map<
    string,
    { expiresAt: number; response: SocketAckResponse }
  >();

  constructor(
    private readonly boardService: BoardsService,
    private readonly tasksService: TasksService,
    private readonly boardActivityPublisher: BoardActivityPublisher,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsPublisher: NotificationsPublisher,
  ) {}

  handleConnection(client: Socket) {
    this.boardActivityPublisher.setServer(this.server);
    this.notificationsPublisher.setServer(this.server);
  }

  handleDisconnect(client: Socket) {
    // console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('board:join')
  async handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    const userId = (client as any).user.sub;
    const board = await this.boardService.findOne(payload.boardId, userId);
    await client.join(`board-${payload.boardId}`);
    await client.join(`user-${userId}`);
    client.emit('board:state', board);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('notification:subscribe')
  async handleNotificationSubscribe(@ConnectedSocket() client: Socket) {
    const userId = (client as any).user.sub;
    await client.join(`user-${userId}`);
    client.emit('notification:unread-count', {
      count: await this.notificationsService.countUnread(userId),
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('board:leave')
  async handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    await client.leave(`board-${payload.boardId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('task:update')
  async handleTaskUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      boardId: string;
      taskId: string;
      changes: UpdateTaskDto;
    } & BoardSocketMutationPayload,
    @Ack() ack?: SocketAck,
  ) {
    const userId = (client as any).user.sub;
    const cachedAck = this.getCachedAck(
      userId,
      'task:update',
      payload.idempotencyKey,
    );
    if (cachedAck) {
      ack?.(cachedAck);
      return;
    }

    try {
      const updated = await this.tasksService.update(
        payload.taskId,
        payload.changes,
        userId,
        payload.boardId,
      );
      const boardId = updated.column.boardId;

      this.server.to(`board-${boardId}`).emit('task:update', {
        boardId,
        task: updated,
      });
      this.ackAndCache(ack, userId, 'task:update', payload.idempotencyKey, {
        ok: true,
      });
    } catch (e) {
      this.handleMutationError(
        client,
        ack,
        userId,
        'task:update',
        payload.idempotencyKey,
        e,
        'Failed to update task',
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('task:move')
  async handleTaskMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      boardId: string;
      taskId: string;
      columnId: string;
      order: number;
      sourceColumnId?: string;
    } & BoardSocketMutationPayload,
    @Ack() ack?: SocketAck,
  ) {
    const userId = (client as any).user.sub;
    const cachedAck = this.getCachedAck(
      userId,
      'task:move',
      payload.idempotencyKey,
    );
    if (cachedAck) {
      ack?.(cachedAck);
      return;
    }

    try {
      const updated = await this.tasksService.move(
        payload.taskId,
        {
          columnId: payload.columnId,
          order: payload.order,
        },
        userId,
        payload.boardId,
        payload.sourceColumnId,
      );
      const boardId = updated.column.boardId;
      const taskIdsByColumn = await this.tasksService.getTaskIdsByColumn([
        payload.sourceColumnId,
        payload.columnId,
      ]);

      this.server.to(`board-${boardId}`).emit('task:moved', {
        boardId,
        task: updated,
        taskIdsByColumn,
      });
      this.ackAndCache(ack, userId, 'task:move', payload.idempotencyKey, {
        ok: true,
      });
    } catch (e) {
      this.handleMutationError(
        client,
        ack,
        userId,
        'task:move',
        payload.idempotencyKey,
        e,
        'Failed to move task',
      );
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('task:reorder')
  async handleTaskReorder(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      boardId: string;
      columnId: string;
      taskIds: string[];
    } & BoardSocketMutationPayload,
    @Ack() ack?: SocketAck,
  ) {
    const userId = (client as any).user.sub;
    const cachedAck = this.getCachedAck(
      userId,
      'task:reorder',
      payload.idempotencyKey,
    );
    if (cachedAck) {
      ack?.(cachedAck);
      return;
    }

    try {
      const boardId = await this.tasksService.reorder(
        payload,
        payload.columnId,
        userId,
        payload.boardId,
      );

      this.server.to(`board-${boardId}`).emit('task:reordered', {
        boardId,
        columnId: payload.columnId,
        taskIds: payload.taskIds,
      });
      this.ackAndCache(ack, userId, 'task:reorder', payload.idempotencyKey, {
        ok: true,
      });
    } catch (e) {
      this.handleMutationError(
        client,
        ack,
        userId,
        'task:reorder',
        payload.idempotencyKey,
        e,
        'Failed to reorder tasks',
      );
    }
  }

  private getCachedAck(
    userId: string,
    event: string,
    idempotencyKey: unknown,
  ): SocketAckResponse | undefined {
    const cacheKey = this.buildAckCacheKey(userId, event, idempotencyKey);
    if (!cacheKey) return undefined;

    this.pruneAckCache();
    const cached = this.mutationAckCache.get(cacheKey);
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
      this.mutationAckCache.delete(cacheKey);
      return undefined;
    }

    return cached.response;
  }

  private ackAndCache(
    ack: SocketAck | undefined,
    userId: string,
    event: string,
    idempotencyKey: unknown,
    response: SocketAckResponse,
  ) {
    const cacheKey = this.buildAckCacheKey(userId, event, idempotencyKey);
    if (cacheKey) {
      this.mutationAckCache.set(cacheKey, {
        expiresAt: Date.now() + IDEMPOTENCY_ACK_TTL_MS,
        response,
      });
      this.pruneAckCache();
    }
    ack?.(response);
  }

  private handleMutationError(
    client: Socket,
    ack: SocketAck | undefined,
    userId: string,
    event: string,
    idempotencyKey: unknown,
    error: unknown,
    fallbackMessage: string,
  ) {
    const response = this.createAckError(error, fallbackMessage);

    console.error(`${event} error:`, response.message);
    client.emit('exception', {
      message: response.message,
      code: response.code,
    });
    this.ackAndCache(ack, userId, event, idempotencyKey, response);
  }

  private createAckError(
    error: unknown,
    fallbackMessage: string,
  ): SocketAckResponse {
    const message =
      error instanceof Error && error.message ? error.message : fallbackMessage;
    const status =
      error instanceof HttpException ? error.getStatus() : undefined;

    if (status === HttpStatus.FORBIDDEN) {
      return {
        ok: false,
        code: 'permission_changed',
        message,
        retryable: false,
      };
    }
    if (status === HttpStatus.NOT_FOUND) {
      return {
        ok: false,
        code: this.getNotFoundAckCode(message),
        message,
        retryable: false,
      };
    }
    if (status === HttpStatus.CONFLICT) {
      return {
        ok: false,
        code: /order/i.test(message)
          ? 'task_order_conflict'
          : 'task_already_moved',
        message,
        retryable: false,
      };
    }
    if (status === HttpStatus.BAD_REQUEST) {
      return {
        ok: false,
        code: /order is out of date/i.test(message)
          ? 'task_order_conflict'
          : 'validation_failed',
        message,
        retryable: false,
      };
    }

    return {
      ok: false,
      code: 'unknown',
      message,
      retryable: true,
    };
  }

  private getNotFoundAckCode(message: string): BoardSocketAckErrorCode {
    if (/task/i.test(message)) return 'task_deleted';
    if (/column/i.test(message)) return 'column_deleted';
    if (/board/i.test(message)) return 'board_deleted';

    return 'unknown';
  }

  private buildAckCacheKey(
    userId: string,
    event: string,
    idempotencyKey: unknown,
  ): string | undefined {
    if (typeof idempotencyKey !== 'string') return undefined;
    const normalized = idempotencyKey.trim().slice(0, 128);
    if (!normalized) return undefined;

    return `${userId}:${event}:${normalized}`;
  }

  private pruneAckCache() {
    const now = Date.now();

    for (const [key, value] of this.mutationAckCache) {
      if (value.expiresAt <= now) {
        this.mutationAckCache.delete(key);
      }
    }

    if (this.mutationAckCache.size <= MAX_CACHED_ACKS) return;

    const overflow = this.mutationAckCache.size - MAX_CACHED_ACKS;
    Array.from(this.mutationAckCache.keys())
      .slice(0, overflow)
      .forEach((key) => this.mutationAckCache.delete(key));
  }
}
