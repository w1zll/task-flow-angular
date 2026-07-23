import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { STORAGE_ADAPTER, StorageAdapter } from '@/storage/storage.types';
import { User } from './entities/user.entity';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  let service: AvatarService;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let storage: jest.Mocked<StorageAdapter>;

  const createUser = (overrides: Partial<User> = {}) =>
    ({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      password: 'hashed',
      avatar: null,
      avatarProvider: null,
      avatarStorageKey: null,
      ...overrides,
    }) as User;

  const createFile = (overrides = {}) => ({
    buffer: Buffer.from('avatar'),
    mimetype: 'image/png',
    originalname: 'avatar.png',
    size: 6,
    ...overrides,
  });

  beforeEach(async () => {
    userRepo = {
      save: jest.fn(async (user) => user as User),
    };
    storage = {
      provider: 'local',
      uploadAvatar: jest.fn().mockResolvedValue({
        url: '/api/storage/avatars/avatar.png',
        key: 'avatar.png',
        provider: 'local',
      }),
      deleteAvatar: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: STORAGE_ADAPTER,
          useValue: storage,
        },
      ],
    }).compile();

    service = module.get(AvatarService);
  });

  it('creates a stable default avatar from the user id', () => {
    expect(service.getDefaultAvatarUrl('user-1')).toBe(
      service.getDefaultAvatarUrl('user-1'),
    );
    expect(service.getDefaultAvatarUrl('user-1')).toContain('seed=user-1');
  });

  it('assigns the default avatar when registration has no file', async () => {
    const user = createUser();

    const result = await service.initializeAvatar(user);

    expect(result.avatar).toBe(
      'https://api.dicebear.com/10.x/glyphs/svg?seed=user-1',
    );
    expect(result.avatarProvider).toBe('dicebear');
    expect(result.avatarStorageKey).toBeNull();
    expect(storage.uploadAvatar).not.toHaveBeenCalled();
  });

  it('uploads a supported avatar and stores provider metadata', async () => {
    const user = createUser();
    const file = createFile();

    const result = await service.updateAvatar(user, file);

    expect(storage.uploadAvatar).toHaveBeenCalledWith(file, 'user-1');
    expect(result.avatar).toBe('/api/storage/avatars/avatar.png');
    expect(result.avatarProvider).toBe('local');
    expect(result.avatarStorageKey).toBe('avatar.png');
  });

  it('rejects avatars larger than 2 MB before storage upload', async () => {
    await expect(
      service.updateAvatar(
        createUser(),
        createFile({ size: 2 * 1024 * 1024 + 1 }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.uploadAvatar).not.toHaveBeenCalled();
  });

  it('rejects unsupported avatar MIME types', async () => {
    await expect(
      service.updateAvatar(
        createUser(),
        createFile({ mimetype: 'image/svg+xml' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.uploadAvatar).not.toHaveBeenCalled();
  });

  it('deletes the previous managed avatar after replacement', async () => {
    const user = createUser({
      avatar: '/api/storage/avatars/old.png',
      avatarProvider: 'local',
      avatarStorageKey: 'old.png',
    });

    await service.updateAvatar(user, createFile());

    expect(storage.deleteAvatar).toHaveBeenCalledWith('old.png');
  });
});
