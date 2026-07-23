import { ConfigService } from '@nestjs/config';
import { OAuthProvider } from '../entities/auth-identity.entity';
import { OAuthIntent } from '../entities/oauth-attempt.entity';
import { OAuthService, createPkceChallenge } from './oauth.service';

describe('OAuthService', () => {
  const attemptRepo = {
    delete: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ id: 'attempt-1', ...value })),
  };
  const identityRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => value),
    remove: jest.fn(),
  };
  const auditRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const userRepo = { findOne: jest.fn() };
  const providerService = {
    isEnabled: jest.fn().mockReturnValue(true),
    getEnabledProviders: jest.fn().mockReturnValue([OAuthProvider.Google]),
    buildAuthorizationUrl: jest.fn().mockReturnValue('https://provider.test'),
  };
  const authService = {
    validateSession: jest.fn(),
    issueTokenPair: jest.fn(),
    createOnboardedUser: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'OAUTH_ATTEMPT_SECRET'
        ? 'test-secret-with-at-least-32-characters'
        : undefined,
    ),
  } as unknown as ConfigService;
  const queryRunner = {
    connect: jest.fn(),
    query: jest.fn(),
    release: jest.fn(),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };
  const oauthAvatarService = {
    download: jest.fn(),
  };

  const createService = () =>
    new OAuthService(
      attemptRepo as any,
      identityRepo as any,
      auditRepo as any,
      userRepo as any,
      providerService as any,
      authService as any,
      config,
      dataSource as any,
      oauthAvatarService as any,
    );

  beforeEach(() => jest.clearAllMocks());

  it('creates a short-lived, protected, browser-bound login attempt', async () => {
    const before = Date.now();
    const result = await createService().startLogin(OAuthProvider.Google);
    const saved = attemptRepo.create.mock.calls[0][0];

    expect(result.authorizationUrl).toBe('https://provider.test');
    expect(result.attemptCookie).toMatch(/^attempt-1\./);
    expect(saved.intent).toBe(OAuthIntent.Login);
    expect(saved.stateHash).toHaveLength(64);
    expect(saved.browserBindingHash).toHaveLength(64);
    expect(saved.nonceHash).toHaveLength(64);
    expect(saved.protectedPayload).not.toContain('codeVerifier');
    expect(saved.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 599_000);
    expect(providerService.buildAuthorizationUrl).toHaveBeenCalledWith(
      OAuthProvider.Google,
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it('uses the RFC 7636 S256 PKCE challenge', () => {
    expect(createPkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('prevents disconnecting the last sign-in method', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'user-1', password: null });
    identityRepo.find.mockResolvedValue([
      { id: 'identity-1', userId: 'user-1', provider: OAuthProvider.Google },
    ]);

    await expect(
      createService().unlinkIdentity(
        { id: 'user-1' } as any,
        OAuthProvider.Google,
      ),
    ).rejects.toMatchObject({ code: 'last_method' });
    expect(identityRepo.remove).not.toHaveBeenCalled();
  });

  it('passes a downloaded provider avatar only to new-user onboarding', async () => {
    const avatarFile = {
      buffer: Buffer.from('avatar'),
      mimetype: 'image/jpeg',
      originalname: 'google-avatar.jpg',
      size: 6,
    };
    const profile = {
      provider: OAuthProvider.Google,
      subject: 'google-user-1',
      email: 'new-user@example.com',
      emailVerified: true,
      displayName: 'New User',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar',
    };
    identityRepo.findOne.mockResolvedValue(null);
    userRepo.findOne.mockResolvedValue(null);
    oauthAvatarService.download.mockResolvedValue(avatarFile);
    authService.createOnboardedUser.mockResolvedValue({
      id: 'new-user-1',
      email: profile.email,
    });

    await (createService() as any).resolveLoginLocked(profile, 'en');

    expect(oauthAvatarService.download).toHaveBeenCalledWith(profile);
    expect(authService.createOnboardedUser).toHaveBeenCalledWith(
      {
        email: profile.email,
        name: profile.displayName,
        password: null,
      },
      'en',
      avatarFile,
    );
  });
});
