import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardPermissionsModule } from '@/boards/board-permissions.module';
import { Board } from '@/boards/entities/board.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Task } from '@/tasks/entities/task.entity';
import { TeamMember } from '@/teams/entities/team-member.entity';
import { User } from '@/users/entities/user.entity';
import { Mention } from './entities/mention.entity';
import { Notification } from './entities/notification.entity';
import { TaskComment } from './entities/task-comment.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsPublisher } from './notifications.publisher';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskComment,
      Mention,
      Notification,
      Task,
      Board,
      BoardMember,
      User,
      TeamMember,
    ]),
    BoardPermissionsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsPublisher],
  exports: [NotificationsService, NotificationsPublisher],
})
export class NotificationsModule {}
