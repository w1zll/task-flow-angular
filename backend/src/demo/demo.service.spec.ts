import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import {
  buildDemoTaskAnalyticsSeed,
  buildDemoTaskCommentSeeds,
  DemoService,
} from './demo.service';

describe('DemoService', () => {
  let service: DemoService;
  let dataSource: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  };
  let userRepo: {
    findOne: jest.Mock;
  };
  let config: {
    get: jest.Mock;
  };

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepo;
        throw new Error('Unexpected repository');
      }),
      transaction: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'ENABLE_DEMO_MODE') return 'true';
        if (key === 'DEMO_OWNER_EMAIL') return 'demo-owner@taskflow.local';
        return undefined;
      }),
    };
    service = new DemoService(
      dataSource as unknown as DataSource,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hides demo login when demo mode is disabled', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'ENABLE_DEMO_MODE' ? 'false' : undefined,
    );

    await expect(service.startDemoSession()).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('allows reset only for the configured demo owner', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'regular@taskflow.local',
    });

    await expect(service.resetDemoWorkspace('user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('resets demo data for the configured demo owner', async () => {
    const session = {
      user: {
        id: 'demo-owner',
        email: 'demo-owner@taskflow.local',
        name: 'Demo Owner',
      } as User,
      workspaceId: 'workspace-1',
      boardId: 'board-1',
    };
    userRepo.findOne.mockResolvedValue({
      id: 'demo-owner',
      email: 'demo-owner@taskflow.local',
    });
    jest.spyOn(service, 'seedSharedDemoWorkspace').mockResolvedValue(session);

    await expect(service.resetDemoWorkspace('demo-owner')).resolves.toEqual(
      session,
    );
  });
});

describe('demo analytics dataset', () => {
  const now = new Date('2026-07-14T08:00:00.000Z');
  const seeds = Array.from({ length: 125 }, (_, index) => {
    const columnIndex = Math.floor((index % 25) / 5);
    return buildDemoTaskAnalyticsSeed(index, columnIndex === 4, now);
  });

  it('covers every deadline and completion category', () => {
    const counts = seeds.reduce<Record<string, number>>((result, seed) => {
      result[seed.category] = (result[seed.category] ?? 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({
      completedOnTime: 23,
      openOverdue: 20,
      dueSoon: 20,
      future: 40,
      withoutDeadline: 10,
      completedLate: 12,
    });
  });

  it('derives completed deadlines from completedAt over a 90-day window', () => {
    const completed = seeds.filter((seed) => seed.isCompleted);
    const onTime = completed.filter(
      (seed) => seed.category === 'completedOnTime',
    );
    const late = completed.filter((seed) => seed.category === 'completedLate');

    expect(onTime.every((seed) => seed.dueDate! >= seed.completedAt!)).toBe(
      true,
    );
    expect(late.every((seed) => seed.dueDate! < seed.completedAt!)).toBe(true);
    expect(
      completed.every((seed) => {
        const daysAgo =
          (now.getTime() - seed.completedAt!.getTime()) / 86_400_000;
        return daysAgo >= 0 && daysAgo <= 90;
      }),
    ).toBe(true);
  });

  it('keeps a realistic mix of estimated and unestimated tasks', () => {
    expect(seeds.some((seed) => seed.estimateMinutes === null)).toBe(true);
    expect(seeds.some((seed) => seed.estimateMinutes !== null)).toBe(true);
    expect(seeds.some((seed) => seed.storyPoints === null)).toBe(true);
    expect(seeds.some((seed) => seed.storyPoints !== null)).toBe(true);
  });

  it('creates deterministic localized comments from multiple users', () => {
    const tasks = Array.from({ length: 125 }, (_, index) => ({
      id: `task-${index}`,
      boardId: `board-${index % 2}`,
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      completedAt: index % 2 ? null : new Date('2026-06-05T12:00:00.000Z'),
    }));
    const users = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];

    const english = buildDemoTaskCommentSeeds(tasks, users, 'en');
    const russian = buildDemoTaskCommentSeeds(tasks, users, 'ru');

    expect(english).toEqual(buildDemoTaskCommentSeeds(tasks, users, 'en'));
    expect(english).toHaveLength(43);
    expect(new Set(english.map((comment) => comment.authorId)).size).toBe(3);
    expect(russian.map((comment) => comment.body)).not.toEqual(
      english.map((comment) => comment.body),
    );
  });
});
