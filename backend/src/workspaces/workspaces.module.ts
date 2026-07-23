import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/users/entities/user.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceInvite } from './entities/workspace-invite.entity';
import { WorkspaceInviteAuditEvent } from './entities/workspace-invite-audit-event.entity';
import { WorkspaceInvitesController } from './workspace-invites.controller';
import { WorkspaceInvitesService } from './workspace-invites.service';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      WorkspaceInvite,
      WorkspaceInviteAuditEvent,
      User,
    ]),
  ],
  providers: [
    WorkspacesService,
    WorkspaceInvitesService,
    InMemoryRateLimiterService,
  ],
  controllers: [WorkspacesController, WorkspaceInvitesController],
  exports: [WorkspacesService, WorkspaceInvitesService],
})
export class WorkspacesModule {}
