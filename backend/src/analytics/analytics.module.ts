import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardPermissionsModule } from '@/boards/board-permissions.module';
import { Board } from '@/boards/entities/board.entity';
import { Task } from '@/tasks/entities/task.entity';
import { WorkspacesModule } from '@/workspaces/workspaces.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Board]),
    WorkspacesModule,
    BoardPermissionsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
