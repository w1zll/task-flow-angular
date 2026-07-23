import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  NotificationResponseDto,
  TaskCommentResponseDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsPublisher {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitNotification(recipientId: string, notification: NotificationResponseDto) {
    this.server?.to(`user-${recipientId}`).emit('notification:new', notification);
  }

  emitUnreadCount(recipientId: string, count: number) {
    this.server?.to(`user-${recipientId}`).emit('notification:unread-count', {
      count,
    });
  }

  emitTaskCreated(boardId: string, task: unknown) {
    this.server?.to(`board-${boardId}`).emit('task:created', {
      boardId,
      task,
    });
  }

  emitTaskDeleted(boardId: string, taskId: string) {
    this.server?.to(`board-${boardId}`).emit('task:deleted', {
      boardId,
      taskId,
    });
  }

  emitTaskCommentCreated(boardId: string, comment: TaskCommentResponseDto) {
    this.server?.to(`board-${boardId}`).emit('task:comment:created', {
      boardId,
      taskId: comment.taskId,
      comment,
    });
  }

  emitTaskCommentUpdated(boardId: string, comment: TaskCommentResponseDto) {
    this.server?.to(`board-${boardId}`).emit('task:comment:updated', {
      boardId,
      taskId: comment.taskId,
      comment,
    });
  }

  emitTaskCommentDeleted(boardId: string, taskId: string, commentId: string) {
    this.server?.to(`board-${boardId}`).emit('task:comment:deleted', {
      boardId,
      taskId,
      commentId,
    });
  }
}
