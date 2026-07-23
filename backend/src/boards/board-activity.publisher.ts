import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { BoardActivityResponseDto } from './dto/board-activity.dto';

@Injectable()
export class BoardActivityPublisher {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitActivity(boardId: string, activity: BoardActivityResponseDto) {
    if (!this.server) {
      return;
    }

    this.server.to(`board-${boardId}`).emit('board:activity', {
      boardId,
      activity,
    });
  }
}
