import { User } from '@/users/entities/user.entity';
import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { BoardsService } from '@/boards/boards.service';
import { AppLocale } from '@/common/locale/request-locale';
import { AvatarService } from '@/users/avatar.service';
import { AvatarUploadFile } from '@/storage/storage.types';
import { WorkspacesService } from '@/workspaces/workspaces.service';
import { createHmac, randomUUID } from 'crypto';
import { SessionMetadata } from './session-metadata';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,

    private readonly dataSource: DataSource,

    @Inject(forwardRef(() => BoardsService))
    private readonly boardsService: BoardsService,

    private readonly avatarService: AvatarService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async register(
    dto: RegisterDto,
    locale: AppLocale = 'en',
    avatarFile?: AvatarUploadFile,
    sessionMetadata?: SessionMetadata,
  ) {
    const user = await this.createOnboardedUser(
      {
        email: dto.email,
        name: dto.name,
        password: dto.password,
      },
      locale,
      avatarFile,
    );

    return this.createSession(user, sessionMetadata);
  }

  async createOnboardedUser(
    input: { email: string; name: string; password: string | null },
    locale: AppLocale = 'en',
    avatarFile?: AvatarUploadFile,
  ) {
    const existing = await this.userRepo.findOne({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    let user = await this.userRepo.save(this.userRepo.create(input));

    try {
      user = await this.avatarService.initializeAvatar(user, avatarFile);
      const workspace = await this.workspacesService.createPersonalWorkspace(
        user,
        locale,
      );
      await this.boardsService.createWelcomeBoard(
        user.id,
        workspace.id,
        user.createdAt ?? new Date(),
        locale,
      );
    } catch (error) {
      await this.avatarService.removeStoredAvatar(user).catch(() => undefined);
      await this.userRepo.remove(user);
      throw error;
    }

    return user;
  }

  async discardOnboardedUser(user: User) {
    await this.avatarService.removeStoredAvatar(user).catch(() => undefined);
    await this.userRepo.remove(user);
  }

  updateAvatar(user: User, avatarFile: AvatarUploadFile) {
    return this.avatarService.updateAvatar(user, avatarFile);
  }

  resetAvatar(user: User) {
    return this.avatarService.resetAvatar(user);
  }

  async login(dto: LoginDto, sessionMetadata?: SessionMetadata) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    return this.createSession(user, sessionMetadata);
  }

  async refresh(rawRefreshToken: string, sessionMetadata?: SessionMetadata) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    return this.dataSource.transaction(async (manager) => {
      const matchedToken = await this.findStoredRefreshToken(
        rawRefreshToken,
        payload.sub,
        manager,
        true,
      );

      if (
        !matchedToken ||
        matchedToken.isRevoked ||
        new Date() > matchedToken.expiresAt
      ) {
        throw new UnauthorizedException(
          'Пользователь не авторизован. Пожалуйста, войдите заново.',
        );
      }

      const user = await manager.getRepository(User).findOne({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('Пользователь не найден');

      return this.rotateSession(user, matchedToken, manager, sessionMetadata);
    });
  }

  async logout(rawRefreshToken: string) {
    if (!rawRefreshToken) return;

    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      return;
    }

    const tokenDigest = this.getRefreshTokenDigest(rawRefreshToken);
    const deleteResult = await this.refreshTokenRepo.delete({
      userId: payload.sub,
      tokenDigest,
      isRevoked: false,
    });

    if (deleteResult.affected && deleteResult.affected > 0) return;

    const storedTokens = await this.refreshTokenRepo.find({
      where: { userId: payload.sub, isRevoked: false, tokenDigest: IsNull() },
    });

    for (const t of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, t.token);
      if (isMatch) {
        await this.refreshTokenRepo.delete(t.id);
        break;
      }
    }
  }

  async getSessions(userId: string, rawRefreshToken?: string) {
    await this.removeInactiveSessions(userId);
    const sessions = await this.refreshTokenRepo
      .createQueryBuilder('token')
      .where('token.userId = :userId', { userId })
      .andWhere('token.isRevoked = false')
      .andWhere('token.expiresAt > NOW()')
      .orderBy('token.createdAt', 'DESC')
      .getMany();

    const current = rawRefreshToken
      ? await this.findStoredRefreshToken(rawRefreshToken, userId)
      : null;

    return sessions.map((session) => ({
      session,
      current: session.id === current?.id,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.refreshTokenRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Сессия не найдена');
    }
    await this.refreshTokenRepo.delete(session.id);
  }

  async revokeOtherSessions(userId: string, rawRefreshToken?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Текущая сессия не найдена');
    }

    const current = await this.findStoredRefreshToken(rawRefreshToken, userId);
    if (!current || current.isRevoked || current.expiresAt <= new Date()) {
      throw new UnauthorizedException('Текущая сессия не найдена');
    }

    await this.refreshTokenRepo.delete({ userId, id: Not(current.id) });
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return user;
  }

  async validateSession(userId: string, sessionId: string): Promise<User> {
    if (!sessionId) {
      throw new UnauthorizedException('Сессия не найдена');
    }

    const session = await this.refreshTokenRepo.findOne({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!session) {
      throw new UnauthorizedException('Сессия не найдена');
    }

    return this.validateUser(userId);
  }

  generateWebSocketToken(user: User): string {
    const sessionId = (user as User & { sessionId?: string }).sessionId;
    if (!sessionId) {
      throw new UnauthorizedException('Сессия не найдена');
    }
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        sid: sessionId,
        tokenUse: 'websocket',
      },
      {
        expiresIn: this.config.get('JWT_WS_EXPIRES_IN') || '2m',
      },
    );
  }

  issueTokenPair(user: User, sessionMetadata?: SessionMetadata) {
    return this.createSession(user, sessionMetadata);
  }

  private async createSession(user: User, metadata?: SessionMetadata) {
    await this.removeInactiveSessions(user.id);
    const sessionId = randomUUID();
    const tokenPair = await this.generateTokenPair(user, sessionId);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        id: sessionId,
        token: tokenPair.hashedRefresh,
        tokenDigest: tokenPair.tokenDigest,
        userId: user.id,
        expiresAt: tokenPair.expiresAt,
        lastActiveAt: new Date(),
        userAgent: metadata?.userAgent ?? null,
        ipAddress: metadata?.ipAddress ?? null,
      }),
    );

    return this.toAuthResult(
      user,
      tokenPair.accessToken,
      tokenPair.refreshToken,
    );
  }

  private async rotateSession(
    user: User,
    session: RefreshToken,
    manager: EntityManager,
    metadata?: SessionMetadata,
  ) {
    const tokenPair = await this.generateTokenPair(user, session.id);
    session.token = tokenPair.hashedRefresh;
    session.tokenDigest = tokenPair.tokenDigest;
    session.expiresAt = tokenPair.expiresAt;
    session.lastActiveAt = new Date();
    session.userAgent = metadata?.userAgent ?? session.userAgent ?? null;
    session.ipAddress = metadata?.ipAddress ?? session.ipAddress ?? null;
    await manager.getRepository(RefreshToken).save(session);

    return this.toAuthResult(
      user,
      tokenPair.accessToken,
      tokenPair.refreshToken,
    );
  }

  private async generateTokenPair(user: User, sessionId: string) {
    const payload = { sub: user.id, email: user.email, sid: sessionId };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_TIME') || '7d',
      },
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const tokenDigest = this.getRefreshTokenDigest(refreshToken);
    const decoded = this.jwtService.decode(refreshToken) as
      | { exp?: number }
      | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
      accessToken,
      refreshToken,
      hashedRefresh,
      tokenDigest,
      expiresAt,
    };
  }

  private toAuthResult(user: User, accessToken: string, refreshToken: string) {
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        activeWorkspaceId: user.activeWorkspaceId,
      },
    };
  }

  private async findStoredRefreshToken(
    rawRefreshToken: string,
    userId: string,
    manager?: EntityManager,
    lock = false,
  ): Promise<RefreshToken | null> {
    const repository = manager
      ? manager.getRepository(RefreshToken)
      : this.refreshTokenRepo;
    const tokenDigest = this.getRefreshTokenDigest(rawRefreshToken);
    const tokenByDigest = await repository.findOne({
      where: { userId, tokenDigest, isRevoked: false },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (tokenByDigest) return tokenByDigest;

    const storedTokens = await repository.find({
      where: { userId, isRevoked: false, tokenDigest: IsNull() },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    for (const t of storedTokens) {
      const isMatch = await bcrypt.compare(rawRefreshToken, t.token);
      if (isMatch) return t;
    }

    return null;
  }

  private async removeInactiveSessions(userId: string) {
    await this.refreshTokenRepo.delete([
      { userId, isRevoked: true },
      { userId, expiresAt: LessThanOrEqual(new Date()) },
    ]);
  }

  private getRefreshTokenDigest(rawRefreshToken: string): string {
    return createHmac(
      'sha256',
      this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
    )
      .update(rawRefreshToken)
      .digest('hex');
  }
}
