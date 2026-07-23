import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { Column } from '@/columns/entities/column.entity';
import { Board } from '@/boards/entities/board.entity';
import { User } from '@/users/entities/user.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { BoardPermissionsModule } from '@/boards/board-permissions.module';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { Team } from '@/teams/entities/team.entity';
import { BoardActivityModule } from '@/boards/board-activity.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskChecklistItem,
      TaskAttachment,
      Column,
      Board,
      User,
      Team,
    ]),
    BoardPermissionsModule,
    WorkspacesModule,
    BoardActivityModule,
    NotificationsModule,
    StorageModule,
  ],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
