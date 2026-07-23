import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardPermissionsService } from './board-permissions.service';
import { toPublicUser } from '@/users/public-user';
import { BoardActivityResponseDto } from './dto/board-activity.dto';
import { UserResponseDto } from '@/users/dto/user.dto';
import {
  BoardActivity,
  BoardActivityEntityType,
  BoardActivityEventType,
} from './entities/board-activity.entity';

interface BoardActivityLogOptions {
  entityType: BoardActivityEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeWindowMs?: number;
}

interface FindBoardActivityOptions {
  limit?: number;
  before?: string;
  event?: BoardActivityEventType[];
}

@Injectable()
export class BoardActivityService {
  constructor(
    @InjectRepository(BoardActivity)
    private readonly activityRepo: Repository<BoardActivity>,
    private readonly boardPermissions: BoardPermissionsService,
  ) {}

  async log(
    boardId: string,
    actorUserId: string | null,
    event: BoardActivityEventType,
    options: BoardActivityLogOptions,
  ): Promise<BoardActivityResponseDto> {
    const reusableActivity = options.dedupeWindowMs
      ? await this.findReusableActivity(
          boardId,
          actorUserId,
          event,
          options.entityType,
          options.entityId ?? null,
          options.dedupeWindowMs,
        )
      : null;

    if (reusableActivity) {
      reusableActivity.metadata = options.metadata ?? null;
      reusableActivity.createdAt = new Date();
      const saved = await this.activityRepo.save(reusableActivity);
      return this.findById(saved.id);
    }

    const activity = this.activityRepo.create({
      boardId,
      actorUserId,
      event,
      entityType: options.entityType,
      entityId: options.entityId ?? null,
      metadata: options.metadata ?? null,
    });
    const saved = await this.activityRepo.save(activity);
    return this.findById(saved.id);
  }

  async findForBoard(
    boardId: string,
    userId: string,
    options: FindBoardActivityOptions,
  ): Promise<BoardActivityResponseDto[]> {
    await this.boardPermissions.assertCanRead(boardId, userId);

    const qb = this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actorUser', 'actorUser')
      .where('activity.boardId = :boardId', { boardId })
      .orderBy('activity.createdAt', 'DESC');

    if (options.before) {
      qb.andWhere('activity.createdAt < :before', {
        before: new Date(options.before),
      });
    }

    if (options.event?.length) {
      qb.andWhere('activity.event IN (:...events)', {
        events: options.event,
      });
    }

    qb.take(options.limit ?? 50);

    const activities = await qb.getMany();
    return activities.map((activity) => this.toResponseDto(activity));
  }

  private async findById(id: string): Promise<BoardActivityResponseDto> {
    const activity = await this.activityRepo.findOne({
      where: { id },
      relations: ['actorUser'],
    });
    if (!activity) {
      throw new InternalServerErrorException('Board activity was not saved');
    }
    return this.toResponseDto(activity);
  }

  private async findReusableActivity(
    boardId: string,
    actorUserId: string | null,
    event: BoardActivityEventType,
    entityType: BoardActivityEntityType,
    entityId: string | null,
    dedupeWindowMs: number,
  ): Promise<BoardActivity | null> {
    const since = new Date(Date.now() - dedupeWindowMs);
    const qb = this.activityRepo
      .createQueryBuilder('activity')
      .where('activity.boardId = :boardId', { boardId })
      .andWhere('activity.event = :event', { event })
      .andWhere('activity.entityType = :entityType', { entityType })
      .andWhere('activity.createdAt >= :since', { since })
      .orderBy('activity.createdAt', 'DESC');

    if (actorUserId) {
      qb.andWhere('activity.actorUserId = :actorUserId', { actorUserId });
    } else {
      qb.andWhere('activity.actorUserId IS NULL');
    }

    if (entityId) {
      qb.andWhere('activity.entityId = :entityId', { entityId });
    } else {
      qb.andWhere('activity.entityId IS NULL');
    }

    return qb.getOne();
  }

  private toResponseDto(
    activity: BoardActivity,
  ): BoardActivityResponseDto {
    return {
      id: activity.id,
      boardId: activity.boardId,
      actorUser: this.toUserResponseDto(activity.actorUser),
      event: activity.event,
      entityType: activity.entityType,
      entityId: activity.entityId,
      metadata: activity.metadata,
      createdAt:
        activity.createdAt instanceof Date
          ? activity.createdAt.toISOString()
          : activity.createdAt,
    };
  }

  private toUserResponseDto(
    user: BoardActivity['actorUser'],
  ): UserResponseDto | null {
    if (!user) return null;
    const publicUser = toPublicUser(user);

    return {
      id: publicUser.id,
      email: publicUser.email,
      name: publicUser.name,
      avatar: publicUser.avatar,
      createdAt:
        publicUser.createdAt instanceof Date
          ? publicUser.createdAt.toISOString()
          : publicUser.createdAt,
      updatedAt:
        publicUser.updatedAt instanceof Date
          ? publicUser.updatedAt.toISOString()
          : publicUser.updatedAt,
    };
  }
}
