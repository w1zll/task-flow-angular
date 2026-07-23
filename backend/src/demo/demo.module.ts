import { AuthModule } from '@/auth/auth.module';
import { BoardView } from '@/boards/entities/board-view.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Board } from '@/boards/entities/board.entity';
import { Column } from '@/columns/entities/column.entity';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';
import { Task } from '@/tasks/entities/task.entity';
import { TeamMember } from '@/teams/entities/team-member.entity';
import { Team } from '@/teams/entities/team.entity';
import { User } from '@/users/entities/user.entity';
import { WorkspaceMember } from '@/workspaces/entities/workspace-member.entity';
import { WorkspaceInviteAuditEvent } from '@/workspaces/entities/workspace-invite-audit-event.entity';
import { WorkspaceInvite } from '@/workspaces/entities/workspace-invite.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { TaskComment } from '@/notifications/entities/task-comment.entity';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Board,
      BoardMember,
      BoardView,
      Column,
      Task,
      TaskComment,
      Team,
      TeamMember,
      User,
      Workspace,
      WorkspaceInvite,
      WorkspaceInviteAuditEvent,
      WorkspaceMember,
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoService, InMemoryRateLimiterService],
  exports: [DemoService],
})
export class DemoModule {}
