import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardPermissionsService } from './board-permissions.service';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardMember])],
  providers: [BoardPermissionsService],
  exports: [BoardPermissionsService],
})
export class BoardPermissionsModule {}
