import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '@/tasks/entities/task.entity';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, Task]),
    WorkspacesModule,
  ],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
