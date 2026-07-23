import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { BoardPermissionsService } from './board-permissions.service';
import { BoardActivityService } from './board-activity.service';
import {
  BoardActivity,
  BoardActivityEntityType,
  BoardActivityEventType,
} from './entities/board-activity.entity';
import { User } from '@/users/entities/user.entity';

describe('BoardActivityService', () => {
  let service: BoardActivityService;
  let activityRepo: jest.Mocked<Partial<Repository<BoardActivity>>>;
  let boardPermissions: jest.Mocked<Partial<BoardPermissionsService>>;

  beforeEach(async () => {
    activityRepo = {
      create: jest.fn((activity) => activity as BoardActivity),
      save: jest.fn(async (activity: BoardActivity) => ({
        ...activity,
        id: activity.id ?? 'activity-1',
        createdAt: activity.createdAt ?? new Date('2026-06-01T10:00:00.000Z'),
      })),
      findOne: jest.fn(),
    };
    boardPermissions = {
      assertCanRead: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardActivityService,
        {
          provide: getRepositoryToken(BoardActivity),
          useValue: activityRepo,
        },
        {
          provide: BoardPermissionsService,
          useValue: boardPermissions,
        },
      ],
    }).compile();

    service = module.get(BoardActivityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a public actor DTO after logging activity', async () => {
    activityRepo.findOne!.mockResolvedValue({
      id: 'activity-1',
      boardId: 'board-1',
      actorUserId: 'user-1',
      actorUser: {
        id: 'user-1',
        email: 'actor@example.com',
        name: 'Actor',
        password: 'hashed-password',
        avatar: null,
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
        updatedAt: new Date('2026-06-01T09:30:00.000Z'),
      } as User,
      event: BoardActivityEventType.TASK_UPDATED,
      entityType: BoardActivityEntityType.TASK,
      entityId: 'task-1',
      metadata: { taskId: 'task-1' },
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    } as BoardActivity);

    const result = await service.log(
      'board-1',
      'user-1',
      BoardActivityEventType.TASK_UPDATED,
      {
        entityType: BoardActivityEntityType.TASK,
        entityId: 'task-1',
        metadata: { taskId: 'task-1' },
      },
    );

    expect(result.actorUser).toEqual({
      id: 'user-1',
      email: 'actor@example.com',
      name: 'Actor',
      avatar: null,
      createdAt: '2026-06-01T09:00:00.000Z',
      updatedAt: '2026-06-01T09:30:00.000Z',
    });
    expect(result).not.toHaveProperty('actorUser.password');
  });
});
