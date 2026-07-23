import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardPermissionsService } from '@/boards/board-permissions.service';
import { FrontendCacheService } from '@/common/frontend-cache/frontend-cache.service';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { Column } from './entities/column.entity';
import { BoardActivityEventsService } from '@/boards/board-activity-events.service';

type ActivityChange = {
  field: string;
  from: unknown;
  to: unknown;
};

const hasOwn = (value: object, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

@Injectable()
export class ColumnsService {
  constructor(
    @InjectRepository(Column)
    private readonly columnRepo: Repository<Column>,
    private readonly frontendCache: FrontendCacheService,
    private readonly boardPermissions: BoardPermissionsService,
    private readonly boardActivityEvents: BoardActivityEventsService,
  ) {}

  async create(dto: CreateColumnDto, userId: string): Promise<Column> {
    await this.boardPermissions.assertCanManageColumns(dto.boardId, userId);
    if (dto.order === undefined) {
      const count = await this.columnRepo.count({
        where: { boardId: dto.boardId },
      });
      dto.order = count;
    }

    const column = this.columnRepo.create(dto);
    const saved = await this.columnRepo.save(column);
    await this.frontendCache.revalidateBoard(dto.boardId);
    await this.boardActivityEvents.logColumnCreated(dto.boardId, userId, {
      columnId: saved.id,
      title: saved.title,
      order: saved.order,
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateColumnDto,
    userId: string,
  ): Promise<Column> {
    const column = await this.columnRepo.findOne({ where: { id } });
    if (!column) throw new NotFoundException('Column not found');
    await this.boardPermissions.assertCanManageColumns(column.boardId, userId);
    const before = { title: column.title, order: column.order };

    Object.assign(column, dto);
    const saved = await this.columnRepo.save(column);
    await this.frontendCache.revalidateBoard(column.boardId);
    const changes = this.buildColumnActivityChanges(before, saved, dto);
    if (changes.length) {
      await this.boardActivityEvents.logColumnUpdated(column.boardId, userId, {
        columnId: saved.id,
        title: saved.title,
        order: saved.order,
        changes,
      });
    }
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const column = await this.columnRepo.findOne({ where: { id } });
    if (!column) throw new NotFoundException('Column not found');
    await this.boardPermissions.assertCanManageColumns(column.boardId, userId);

    const { boardId } = column;
    await this.columnRepo.remove(column);
    await this.frontendCache.revalidateBoard(boardId);
    await this.boardActivityEvents.logColumnDeleted(boardId, userId, {
      columnId: column.id,
      title: column.title,
    });
  }

  async reorder(
    dto: ReorderColumnsDto,
    boardId: string,
    userId: string,
  ): Promise<void> {
    await this.boardPermissions.assertCanManageColumns(boardId, userId);

    const updates = dto.columnIds.map((columnId, index) =>
      this.columnRepo.update({ id: columnId, boardId }, { order: index }),
    );
    await Promise.all(updates);
    await this.frontendCache.revalidateBoard(boardId);
    await this.boardActivityEvents.logColumnReordered(boardId, userId, {
      boardId,
      columnIds: dto.columnIds,
    });
  }

  private buildColumnActivityChanges(
    before: Pick<Column, 'title' | 'order'>,
    after: Column,
    dto: UpdateColumnDto,
  ): ActivityChange[] {
    const changes: ActivityChange[] = [];

    if (hasOwn(dto, 'title')) {
      this.addActivityChange(changes, 'title', before.title, after.title);
    }
    if (hasOwn(dto, 'order')) {
      this.addActivityChange(changes, 'order', before.order, after.order);
    }

    return changes;
  }

  private addActivityChange(
    changes: ActivityChange[],
    field: string,
    from: unknown,
    to: unknown,
  ) {
    if (JSON.stringify(from) === JSON.stringify(to)) return;
    changes.push({ field, from, to });
  }
}
