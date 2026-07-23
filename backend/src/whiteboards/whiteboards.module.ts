import { AuthModule } from '@/auth/auth.module';
import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { Board } from '@/boards/entities/board.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { BoardPermissionsModule } from '@/boards/board-permissions.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteboardOperation } from './entities/whiteboard-operation.entity';
import { WhiteboardSnapshot } from './entities/whiteboard-snapshot.entity';
import { Whiteboard } from './entities/whiteboard.entity';
import { WhiteboardsController } from './whiteboards.controller';
import { WhiteboardsGateway } from './whiteboards.gateway';
import { WhiteboardsService } from './whiteboards.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Whiteboard,
      WhiteboardOperation,
      WhiteboardSnapshot,
      Board,
      BoardMember,
    ]),
    forwardRef(() => AuthModule),
    BoardPermissionsModule,
    WorkspacesModule,
  ],
  controllers: [WhiteboardsController],
  providers: [WhiteboardsService, WhiteboardsGateway, WsJwtGuard],
  exports: [WhiteboardsService],
})
export class WhiteboardsModule {}
