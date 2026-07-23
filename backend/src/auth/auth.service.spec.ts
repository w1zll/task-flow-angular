import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '@/users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { BoardsService } from '@/boards/boards.service';
import { AvatarService } from '@/users/avatar.service';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  __esModule: true,
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let refreshTokenRepo: Repository<RefreshToken>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let boardsService: BoardsService;
  let avatarService: AvatarService;
  let workspacesService: WorkspacesService;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockRefreshTokenRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockManager)),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockBoardsService = {
    createWelcomeBoard: jest.fn(),
  };

  const mockAvatarService = {
    initializeAvatar: jest.fn(),
    updateAvatar: jest.fn(),
    resetAvatar: jest.fn(),
    removeStoredAvatar: jest.fn(),
  };

  const mockWorkspacesService = {
    createPersonalWorkspace: jest.fn(async (user: User) => {
      user.activeWorkspaceId = 'workspace-1';
      return { id: 'workspace-1' };
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: BoardsService,
          useValue: mockBoardsService,
        },
        {
          provide: AvatarService,
          useValue: mockAvatarService,
        },
        {
          provide: WorkspacesService,
          useValue: mockWorkspacesService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepo = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    boardsService = module.get<BoardsService>(BoardsService);
    avatarService = module.get<AvatarService>(AvatarService);
    workspacesService = module.get<WorkspacesService>(WorkspacesService);
    mockBcrypt.hash.mockReset();
    mockBcrypt.compare.mockReset();
    mockBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);
    mockBcrypt.compare.mockResolvedValue(false as never);
    mockManager.getRepository.mockImplementation((entity) =>
      entity === User ? mockUserRepo : mockRefreshTokenRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };
      const user = {
        id: '1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
        createdAt: new Date('2026-06-10T12:00:00.000Z'),
        avatar: undefined,
      };
      const initializedUser = {
        ...user,
        avatar: 'https://api.dicebear.com/10.x/glyphs/svg?seed=1',
      };
      const tokenPair = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {
          id: '1',
          email: dto.email,
          name: dto.name,
          avatar: initializedUser.avatar,
          activeWorkspaceId: 'workspace-1',
        },
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(user);
      mockUserRepo.save.mockResolvedValue(user);
      mockAvatarService.initializeAvatar.mockResolvedValue(initializedUser);
      mockJwtService.sign
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh');
      mockConfigService.get.mockReturnValue('secret');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      mockBoardsService.createWelcomeBoard.mockResolvedValue({});

      const result = await service.register(dto);

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockUserRepo.create).toHaveBeenCalledWith(dto);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
      expect(avatarService.initializeAvatar).toHaveBeenCalledWith(
        user,
        undefined,
      );
      expect(boardsService.createWelcomeBoard).toHaveBeenCalledWith(
        user.id,
        'workspace-1',
        user.createdAt,
        'en',
      );
      expect(workspacesService.createPersonalWorkspace).toHaveBeenCalledWith(
        initializedUser,
        'en',
      );
      expect(result).toEqual(tokenPair);
    });

    it('should create localized welcome board on registration', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };
      const user = {
        id: '1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
        createdAt: new Date('2026-06-10T12:00:00.000Z'),
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(user);
      mockUserRepo.save.mockResolvedValue(user);
      mockAvatarService.initializeAvatar.mockResolvedValue(user);
      mockJwtService.sign
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh');
      mockConfigService.get.mockReturnValue('secret');
      mockRefreshTokenRepo.save.mockResolvedValue({});
      mockBoardsService.createWelcomeBoard.mockResolvedValue({});

      await service.register(dto, 'ru');

      expect(boardsService.createWelcomeBoard).toHaveBeenCalledWith(
        user.id,
        'workspace-1',
        user.createdAt,
        'ru',
      );
    });

    it('should pass an uploaded avatar to the avatar service', async () => {
      const dto: RegisterDto = {
        email: 'avatar@example.com',
        password: 'password',
        name: 'Avatar User',
      };
      const user = {
        id: 'avatar-user',
        ...dto,
        createdAt: new Date('2026-06-10T12:00:00.000Z'),
      };
      const avatarFile = {
        buffer: Buffer.from('avatar'),
        mimetype: 'image/png',
        originalname: 'avatar.png',
        size: 6,
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(user);
      mockUserRepo.save.mockResolvedValue(user);
      mockAvatarService.initializeAvatar.mockResolvedValue({
        ...user,
        avatar: '/api/storage/avatars/avatar.png',
      });
      mockBoardsService.createWelcomeBoard.mockResolvedValue({});
      mockJwtService.sign
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh');
      mockConfigService.get.mockReturnValue('secret');
      mockRefreshTokenRepo.save.mockResolvedValue({});

      await service.register(dto, 'en', avatarFile);

      expect(avatarService.initializeAvatar).toHaveBeenCalledWith(
        user,
        avatarFile,
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      };
      mockUserRepo.findOne.mockResolvedValue({ id: '1', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockBoardsService.createWelcomeBoard).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password' };
      const user = {
        id: '1',
        email: dto.email,
        name: 'Test',
        password: 'hashed',
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      const tokenPair = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {
          id: '1',
          email: dto.email,
          name: 'Test',
          avatar: undefined,
          activeWorkspaceId: undefined,
        },
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockJwtService.sign
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh');
      mockConfigService.get.mockReturnValue('secret');
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login(dto);

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(user.comparePassword).toHaveBeenCalledWith(dto.password);
      expect(result).toEqual(tokenPair);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password' };
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password' };
      const user = {
        id: '1',
        email: dto.email,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('returns the same generic error for an OAuth-only account', async () => {
      const dto: LoginDto = { email: 'oauth@example.com', password: 'password' };
      const user = {
        id: 'oauth-user',
        email: dto.email,
        password: null,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(
        'Неверный email или пароль',
      );
    });
  });

  // Add more tests for refresh, logout, etc.
  describe('logout', () => {
    it('deletes a refresh token by digest without scanning bcrypt tokens', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'demo-owner' });
      mockConfigService.get.mockReturnValue('refresh-secret');
      mockRefreshTokenRepo.delete.mockResolvedValue({ affected: 1 });

      await service.logout('raw-refresh-token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('raw-refresh-token', {
        secret: 'refresh-secret',
      });
      expect(mockRefreshTokenRepo.delete).toHaveBeenCalledWith({
        userId: 'demo-owner',
        tokenDigest: expect.any(String),
        isRevoked: false,
      });
      expect(mockRefreshTokenRepo.find).not.toHaveBeenCalled();
    });

    it('falls back to bcrypt comparison for legacy refresh tokens', async () => {
      const legacyRefreshToken = 'legacy-refresh-token';
      const legacyHash = `hashed-${legacyRefreshToken}`;
      mockBcrypt.hash.mockResolvedValueOnce(legacyHash as never);
      const legacyToken = {
        id: 'token-1',
        token: legacyHash,
        userId: 'demo-owner',
        isRevoked: false,
      };

      mockJwtService.verify.mockReturnValue({ sub: 'demo-owner' });
      mockConfigService.get.mockReturnValue('refresh-secret');
      mockRefreshTokenRepo.delete
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 1 });
      mockRefreshTokenRepo.find.mockResolvedValue([legacyToken]);
      mockBcrypt.compare.mockResolvedValueOnce(true as never);

      await service.logout(legacyRefreshToken);

      expect(mockRefreshTokenRepo.find).toHaveBeenCalledWith({
        where: {
          userId: 'demo-owner',
          isRevoked: false,
          tokenDigest: expect.anything(),
        },
      });
      expect(mockRefreshTokenRepo.delete).toHaveBeenLastCalledWith('token-1');
    });
  });

  describe('refresh', () => {
    it('rejects a reused refresh token without revoking other active sessions', async () => {
      mockBcrypt.compare.mockResolvedValue(false as never);

      mockJwtService.verify.mockReturnValue({ sub: 'demo-owner' });
      mockConfigService.get.mockReturnValue('refresh-secret');
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);
      mockRefreshTokenRepo.find.mockResolvedValue([
        {
          id: 'active-token-1',
          token: 'hashed-active-token',
          userId: 'demo-owner',
          isRevoked: false,
        },
      ]);

      await expect(service.refresh('stale-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRefreshTokenRepo.update).not.toHaveBeenCalled();
      expect(mockRefreshTokenRepo.save).not.toHaveBeenCalled();
      expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    });

    it('rotates the token in the same session row with a write lock', async () => {
      const session = {
        id: 'stable-session-id',
        token: 'old-hash',
        tokenDigest: 'old-digest',
        userId: 'demo-owner',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const user = { id: 'demo-owner', email: 'owner@example.com' };
      mockJwtService.verify.mockReturnValue({ sub: user.id });
      mockJwtService.sign
        .mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');
      mockConfigService.get.mockReturnValue('refresh-secret');
      mockRefreshTokenRepo.findOne.mockResolvedValue(session);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockRefreshTokenRepo.save.mockImplementation(async (value) => value);

      const result = await service.refresh('old-refresh', {
        userAgent: 'Browser',
        ipAddress: '192.0.2.1',
      });

      expect(mockRefreshTokenRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sid: 'stable-session-id' }),
      );
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'stable-session-id',
          token: 'hashed-refresh-token',
          userAgent: 'Browser',
          ipAddress: '192.0.2.1',
        }),
      );
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('uses a unique jti for every issued refresh token', async () => {
      const user = { id: 'user-1', email: 'user@example.com' } as User;
      mockJwtService.sign
        .mockReturnValueOnce('access-1')
        .mockReturnValueOnce('refresh-1')
        .mockReturnValueOnce('access-2')
        .mockReturnValueOnce('refresh-2');
      mockConfigService.get.mockReturnValue('refresh-secret');
      mockRefreshTokenRepo.create.mockImplementation((value) => value);
      mockRefreshTokenRepo.save.mockImplementation(async (value) => value);

      await service.issueTokenPair(user);
      await service.issueTokenPair(user);

      const refreshPayloads = mockJwtService.sign.mock.calls
        .filter((call) => call.length === 2)
        .map((call) => call[0] as { jti: string });
      const accessPayloads = mockJwtService.sign.mock.calls
        .filter((call) => call.length === 1)
        .map((call) => call[0] as { sid: string });
      expect(refreshPayloads).toHaveLength(2);
      expect(refreshPayloads[0].jti).toEqual(expect.any(String));
      expect(refreshPayloads[0].jti).not.toBe(refreshPayloads[1].jti);
      expect(accessPayloads[0].sid).toEqual(expect.any(String));
      expect(accessPayloads[0].sid).not.toBe(accessPayloads[1].sid);
    });
  });

  describe('validateSession', () => {
    it('accepts only an existing active session belonging to the user', async () => {
      const user = { id: 'user-1' } as User;
      mockRefreshTokenRepo.findOne.mockResolvedValue({
        id: 'session-1',
        userId: user.id,
      });
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.validateSession(user.id, 'session-1'),
      ).resolves.toBe(user);
      expect(mockRefreshTokenRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'session-1',
          userId: user.id,
          isRevoked: false,
          expiresAt: expect.anything(),
        }),
      });
    });

    it('rejects an access token after its session was removed', async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateSession('user-1', 'deleted-session'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects legacy access tokens without a session id', async () => {
      await expect(service.validateSession('user-1', '')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
