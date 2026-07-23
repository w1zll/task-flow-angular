import { User } from '@/users/entities/user.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { DataSource, ILike, LessThan, Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import {
  AuthAuditEvent,
  AuthAuditEventType,
} from '../entities/auth-audit-event.entity';
import {
  AuthIdentity,
  OAuthProvider,
} from '../entities/auth-identity.entity';
import {
  OAuthAttempt,
  OAuthIntent,
} from '../entities/oauth-attempt.entity';
import { SessionMetadata } from '../session-metadata';
import { OAuthProviderService } from './oauth-provider.service';
import { OAuthFlowError, OAuthProfile } from './oauth.types';
import { AppLocale } from '@/common/locale/request-locale';
import { OAuthAvatarService } from './oauth-avatar.service';

const ATTEMPT_TTL_MS = 10 * 60 * 1000;

interface ProtectedAttemptPayload {
  codeVerifier: string;
  nonce?: string;
}

export interface OAuthStartResult {
  authorizationUrl: string;
  attemptCookie: string;
}

export interface OAuthCallbackResult {
  intent: OAuthIntent;
  authResult?: Awaited<ReturnType<AuthService['issueTokenPair']>>;
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const randomUrlSafe = (size = 32) => randomBytes(size).toString('base64url');

export const createPkceChallenge = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url');

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthAttempt)
    private readonly attemptRepo: Repository<OAuthAttempt>,
    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,
    @InjectRepository(AuthAuditEvent)
    private readonly auditRepo: Repository<AuthAuditEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly providerService: OAuthProviderService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly oauthAvatarService: OAuthAvatarService,
  ) {}

  getEnabledProviders() {
    return this.providerService.getEnabledProviders();
  }

  async startLogin(provider: OAuthProvider): Promise<OAuthStartResult> {
    return this.createAttempt(provider, OAuthIntent.Login);
  }

  async startLink(
    provider: OAuthProvider,
    user: User,
  ): Promise<OAuthStartResult> {
    const sessionId = (user as User & { sessionId?: string }).sessionId;
    if (!sessionId) throw new UnauthorizedException('Session not found');
    await this.authService.validateSession(user.id, sessionId);
    return this.createAttempt(provider, OAuthIntent.Link, user.id, sessionId);
  }

  async complete(
    provider: OAuthProvider,
    input: {
      code?: string;
      state?: string;
      providerError?: string;
      attemptCookie?: string;
      locale?: AppLocale;
      sessionMetadata?: SessionMetadata;
    },
  ): Promise<OAuthCallbackResult> {
    let attempt: OAuthAttempt | null = null;
    try {
      attempt = await this.consumeAttempt(
        provider,
        input.state,
        input.attemptCookie,
      );
      if (input.providerError || !input.code) {
        throw new OAuthFlowError('access_denied');
      }
      const protectedPayload = this.unprotect(attempt.protectedPayload);
      if (
        attempt.nonceHash &&
        sha256(protectedPayload.nonce ?? '') !== attempt.nonceHash
      ) {
        throw new OAuthFlowError('expired');
      }
      const profile = await this.providerService.exchangeCode(
        provider,
        input.code,
        protectedPayload.codeVerifier,
        protectedPayload.nonce,
      );

      if (attempt.intent === OAuthIntent.Link) {
        const user = await this.validateLinkAttempt(attempt);
        await this.linkIdentity(user, profile, attempt.sessionId);
        return { intent: OAuthIntent.Link };
      }

      const user = await this.resolveLogin(profile, input.locale ?? 'en');
      const authResult = await this.authService.issueTokenPair(
        user,
        input.sessionMetadata,
      );
      await this.recordAudit({
        event: AuthAuditEventType.OAuthLoginSuccess,
        provider,
        userId: user.id,
        sessionId: this.readSessionId(authResult.accessToken),
        errorCode: null,
      });
      return { intent: OAuthIntent.Login, authResult };
    } catch (error) {
      const flowError =
        error instanceof OAuthFlowError
          ? error
          : new OAuthFlowError('provider_unavailable');
      await this.recordAudit({
        event: AuthAuditEventType.OAuthLoginFailure,
        provider,
        userId: attempt?.userId ?? null,
        sessionId: attempt?.sessionId ?? null,
        errorCode: flowError.code,
      });
      throw new OAuthFlowError(flowError.code, attempt?.intent);
    }
  }

  async getMethods(userId: string) {
    const [user, identities] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.identityRepo.find({ where: { userId } }),
    ]);
    if (!user) throw new UnauthorizedException();
    const connected = new Set(identities.map((identity) => identity.provider));
    return {
      local: Boolean(user.password),
      providers: Object.values(OAuthProvider).map((provider) => ({
        provider,
        available: this.providerService.isEnabled(provider),
        connected: connected.has(provider),
      })),
    };
  }

  async unlinkIdentity(user: User, provider: OAuthProvider) {
    const [storedUser, identities] = await Promise.all([
      this.userRepo.findOne({ where: { id: user.id } }),
      this.identityRepo.find({ where: { userId: user.id } }),
    ]);
    const identity = identities.find((item) => item.provider === provider);
    if (!storedUser || !identity) throw new BadRequestException('Not connected');
    if (!storedUser.password && identities.length <= 1) {
      throw new OAuthFlowError('last_method');
    }
    await this.identityRepo.remove(identity);
    await this.recordAudit({
      event: AuthAuditEventType.IdentityUnlinked,
      provider,
      userId: user.id,
      sessionId: (user as User & { sessionId?: string }).sessionId ?? null,
      errorCode: null,
    });
  }

  private async createAttempt(
    provider: OAuthProvider,
    intent: OAuthIntent,
    userId: string | null = null,
    sessionId: string | null = null,
  ): Promise<OAuthStartResult> {
    if (!this.providerService.isEnabled(provider)) {
      throw new OAuthFlowError('provider_unavailable');
    }
    await this.attemptRepo.delete({ expiresAt: LessThan(new Date()) });

    const state = randomUrlSafe();
    const browserBinding = randomUrlSafe();
    const codeVerifier = randomUrlSafe(64);
    const nonce = provider === OAuthProvider.Google ? randomUrlSafe() : undefined;
    const attempt = await this.attemptRepo.save(
      this.attemptRepo.create({
        provider,
        intent,
        stateHash: sha256(state),
        browserBindingHash: sha256(browserBinding),
        protectedPayload: this.protect({ codeVerifier, nonce }),
        nonceHash: nonce ? sha256(nonce) : null,
        userId,
        sessionId,
        expiresAt: new Date(Date.now() + ATTEMPT_TTL_MS),
        consumedAt: null,
      }),
    );
    return {
      authorizationUrl: this.providerService.buildAuthorizationUrl(
        provider,
        state,
        createPkceChallenge(codeVerifier),
        nonce,
      ),
      attemptCookie: `${attempt.id}.${browserBinding}`,
    };
  }

  private async consumeAttempt(
    provider: OAuthProvider,
    state?: string,
    cookie?: string,
  ): Promise<OAuthAttempt> {
    if (!state || !cookie) throw new OAuthFlowError('expired');
    const separator = cookie.indexOf('.');
    if (separator <= 0) throw new OAuthFlowError('expired');
    const attemptId = cookie.slice(0, separator);
    const browserBinding = cookie.slice(separator + 1);
    const now = new Date();
    const result = await this.attemptRepo
      .createQueryBuilder()
      .update(OAuthAttempt)
      .set({ consumedAt: now })
      .where('id = :attemptId', { attemptId })
      .andWhere('provider = :provider', { provider })
      .andWhere('stateHash = :stateHash', { stateHash: sha256(state) })
      .andWhere('browserBindingHash = :bindingHash', {
        bindingHash: sha256(browserBinding),
      })
      .andWhere('consumedAt IS NULL')
      .andWhere('expiresAt > :now', { now })
      .returning('*')
      .execute();
    const attempt = result.raw?.[0] as OAuthAttempt | undefined;
    if (!attempt) throw new OAuthFlowError('expired');
    return attempt;
  }

  private async validateLinkAttempt(attempt: OAuthAttempt): Promise<User> {
    if (!attempt.userId || !attempt.sessionId) {
      throw new OAuthFlowError('expired');
    }
    try {
      return await this.authService.validateSession(
        attempt.userId,
        attempt.sessionId,
      );
    } catch {
      throw new OAuthFlowError('expired');
    }
  }

  private async resolveLogin(profile: OAuthProfile, locale: AppLocale) {
    const lockKey = createHash('sha256')
      .update(`${profile.provider}:${profile.subject}`)
      .digest();
    const firstKey = lockKey.readInt32BE(0);
    const secondKey = lockKey.readInt32BE(4);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query('SELECT pg_advisory_lock($1, $2)', [
        firstKey,
        secondKey,
      ]);
      return await this.resolveLoginLocked(profile, locale);
    } finally {
      await queryRunner
        .query('SELECT pg_advisory_unlock($1, $2)', [firstKey, secondKey])
        .catch(() => undefined);
      await queryRunner.release();
    }
  }

  private async resolveLoginLocked(profile: OAuthProfile, locale: AppLocale) {
    const existingIdentity = await this.identityRepo.findOne({
      where: {
        provider: profile.provider,
        providerSubject: profile.subject,
      },
    });
    if (existingIdentity) {
      const user = await this.userRepo.findOne({
        where: { id: existingIdentity.userId },
      });
      if (!user) throw new OAuthFlowError('provider_unavailable');
      await this.updateIdentityMetadata(existingIdentity, profile);
      return user;
    }

    const emailOwner = await this.userRepo.findOne({
      where: { email: ILike(profile.email) },
    });
    if (emailOwner) throw new OAuthFlowError('account_exists');

    let user: User;
    try {
      const providerAvatar = await this.oauthAvatarService.download(profile);
      user = await this.authService.createOnboardedUser(
        {
          email: profile.email,
          name: profile.displayName,
          password: null,
        },
        locale,
        providerAvatar,
      );
    } catch (error) {
      const winner = await this.identityRepo.findOne({
        where: {
          provider: profile.provider,
          providerSubject: profile.subject,
        },
      });
      if (winner) {
        const winnerUser = await this.userRepo.findOne({
          where: { id: winner.userId },
        });
        if (winnerUser) return winnerUser;
      }
      if (error instanceof ConflictException) {
        throw new OAuthFlowError('account_exists');
      }
      throw error;
    }

    try {
      await this.identityRepo.save(
        this.identityRepo.create({
          provider: profile.provider,
          providerSubject: profile.subject,
          providerEmail: profile.email,
          emailVerified: profile.emailVerified,
          displayName: profile.displayName,
          userId: user.id,
        }),
      );
      return user;
    } catch (error) {
      const winner = await this.identityRepo.findOne({
        where: {
          provider: profile.provider,
          providerSubject: profile.subject,
        },
      });
      if (winner?.userId !== user.id) {
        await this.authService.discardOnboardedUser(user);
      }
      if (winner) {
        const winnerUser = await this.userRepo.findOne({
          where: { id: winner.userId },
        });
        if (winnerUser) return winnerUser;
      }
      throw error;
    }
  }

  private async linkIdentity(
    user: User,
    profile: OAuthProfile,
    sessionId: string | null,
  ) {
    const [subjectIdentity, providerIdentity] = await Promise.all([
      this.identityRepo.findOne({
        where: {
          provider: profile.provider,
          providerSubject: profile.subject,
        },
      }),
      this.identityRepo.findOne({
        where: { userId: user.id, provider: profile.provider },
      }),
    ]);
    if (subjectIdentity && subjectIdentity.userId !== user.id) {
      throw new OAuthFlowError('identity_in_use');
    }
    if (providerIdentity && providerIdentity.providerSubject !== profile.subject) {
      throw new OAuthFlowError('identity_in_use');
    }
    const identity = subjectIdentity ?? providerIdentity;
    if (identity) {
      await this.updateIdentityMetadata(identity, profile);
      return;
    }
    await this.identityRepo.save(
      this.identityRepo.create({
        provider: profile.provider,
        providerSubject: profile.subject,
        providerEmail: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        userId: user.id,
      }),
    );
    await this.recordAudit({
      event: AuthAuditEventType.IdentityLinked,
      provider: profile.provider,
      userId: user.id,
      sessionId,
      errorCode: null,
    });
  }

  private updateIdentityMetadata(
    identity: AuthIdentity,
    profile: OAuthProfile,
  ) {
    identity.providerEmail = profile.email;
    identity.emailVerified = profile.emailVerified;
    identity.displayName = profile.displayName;
    return this.identityRepo.save(identity);
  }

  private protect(payload: ProtectedAttemptPayload): string {
    const secret = this.configService.get<string>('OAUTH_ATTEMPT_SECRET');
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new OAuthFlowError('provider_unavailable');
    }
    const key = createHash('sha256').update(secret).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  private unprotect(value: string): ProtectedAttemptPayload {
    try {
      const [ivValue, tagValue, ciphertextValue] = value.split('.');
      const secret = this.configService.get<string>('OAUTH_ATTEMPT_SECRET') ?? '';
      const key = createHash('sha256').update(secret).digest();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivValue, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
      return JSON.parse(plaintext) as ProtectedAttemptPayload;
    } catch {
      throw new OAuthFlowError('expired');
    }
  }

  private async recordAudit(input: Omit<AuthAuditEvent, 'id' | 'createdAt'>) {
    await this.auditRepo.save(this.auditRepo.create(input)).catch(() => undefined);
  }

  private readSessionId(accessToken: string): string | null {
    try {
      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
      ) as { sid?: string };
      return payload.sid ?? null;
    } catch {
      return null;
    }
  }
}
