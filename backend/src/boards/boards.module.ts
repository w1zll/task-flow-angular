import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { User } from '@/users/entities/user.entity';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { JwtModule } from '@nestjs/jwt';
import { Task } from '@/tasks/entities/task.entity';
import { BoardGateway } from './boards.gateway';
import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { Column } from '@/columns/entities/column.entity';
import { AuthModule } from '@/auth/auth.module';
import { BoardPermissionsModule } from './board-permissions.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { Team } from '@/teams/entities/team.entity';
import { BoardView } from './entities/board-view.entity';
import { BoardActivity } from './entities/board-activity.entity';
import { BoardActivityModule } from './board-activity.module';
import { BoardActivityController } from './board-activity.controller';
import { TasksModule } from '@/tasks/tasks.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board,
      BoardMember,
      BoardView,
      BoardActivity,
      User,
      Task,
      Column,
      Team,
    ]),
    forwardRef(() => AuthModule),
    BoardPermissionsModule,
    WorkspacesModule,
    BoardActivityModule,
    NotificationsModule,
    TasksModule,
  ],
  providers: [BoardsService, BoardGateway, WsJwtGuard],
  controllers: [BoardsController, BoardActivityController],
  exports: [BoardsService, BoardPermissionsModule],
})
export class BoardsModule {}
