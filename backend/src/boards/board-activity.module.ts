import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardActivity } from './entities/board-activity.entity';
import { BoardActivityService } from './board-activity.service';
import { BoardActivityEventsService } from './board-activity-events.service';
import { BoardActivityPublisher } from './board-activity.publisher';
import { BoardPermissionsModule } from './board-permissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([BoardActivity]), BoardPermissionsModule],
  providers: [
    BoardActivityService,
    BoardActivityEventsService,
    BoardActivityPublisher,
  ],
  exports: [BoardActivityService, BoardActivityEventsService, BoardActivityPublisher],
})
export class BoardActivityModule {}
