import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Column } from './entities/column.entity';
import { ColumnsService } from './column.service';
import { ColumnsController } from './columns.controller';
import { BoardPermissionsModule } from '@/boards/board-permissions.module';
import { BoardActivityModule } from '@/boards/board-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Column]),
    BoardPermissionsModule,
    BoardActivityModule,
  ],
  providers: [ColumnsService],
  controllers: [ColumnsController],
})
export class ColumnsModule {}
