import { ConfigService } from '@nestjs/config';
import {
  generateKeyPairSync,
  sign,
} from 'crypto';
import { OAuthProvider } from '../entities/auth-identity.entity';
import {
  OAuthProviderService,
  selectGitHubVerifiedEmail,
} from './oauth-provider.service';

describe('OAuthProviderService', () => {
  const values: Record<string, string> = {
    OAUTH_ATTEMPT_SECRET: 'test-secret-with-at-least-32-characters',
    GOOGLE_OAUTH_CLIENT_ID: 'google-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret',
    GOOGLE_OAUTH_REDIRECT_URI:
      'http://localhost:3001/api/auth/oauth/google/callback',
    GITHUB_OAUTH_CLIENT_ID: 'github-client',
    GITHUB_OAUTH_CLIENT_SECRET: 'github-secret',
    GITHUB_OAUTH_REDIRECT_URI:
      'http://localhost:3001/api/auth/oauth/github/callback',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  beforeEach(() => jest.clearAllMocks());

  it('publishes only fully configured providers', () => {
    const service = new OAuthProviderService(config);
    expect(service.getEnabledProviders()).toEqual([
      OAuthProvider.Google,
      OAuthProvider.GitHub,
    ]);

    const incompleteConfig = {
      get: jest.fn((key: string) =>
        key === 'GOOGLE_OAUTH_CLIENT_ID' ? 'client' : undefined,
      ),
    } as unknown as ConfigService;
    expect(
      new OAuthProviderService(incompleteConfig).getEnabledProviders(),
    ).toEqual([]);
  });

  it('builds Google authorization with state, PKCE S256, nonce and exact callback', () => {
    const service = new OAuthProviderService(config);
    const url = new URL(
      service.buildAuthorizationUrl(
        OAuthProvider.Google,
        'state-value',
        'challenge-value',
        'nonce-value',
      ),
    );
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('nonce')).toBe('nonce-value');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(
      values.GOOGLE_OAUTH_REDIRECT_URI,
    );
  });

  it('selects only a primary verified GitHub email', () => {
    expect(
      selectGitHubVerifiedEmail([
        { email: 'secondary@example.com', verified: true },
        { email: 'primary@example.com', primary: true, verified: false },
        { email: 'verified@example.com', primary: true, verified: true },
      ]),
    ).toBe('verified@example.com');
    expect(
      selectGitHubVerifiedEmail([
        { email: 'unverified@example.com', primary: true, verified: false },
      ]),
    ).toBeNull();
  });

  it('validates Google signature, issuer, audience, expiration and nonce', async () => {
    const service = new OAuthProviderService(config);
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    jest
      .spyOn(service as any, 'getGoogleKey')
      .mockResolvedValue(publicKey);
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const header = encode({ alg: 'RS256', kid: 'key-1' });
    const payload = encode({
      iss: 'https://accounts.google.com',
      aud: 'google-client',
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'subject-1',
      nonce: 'nonce-1',
      email: 'user@example.com',
      email_verified: true,
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    });
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(`${header}.${payload}`),
      privateKey,
    ).toString('base64url');
    const token = `${header}.${payload}.${signature}`;
    const discovery = {
      issuer: 'https://accounts.google.com',
      authorization_endpoint: '',
      token_endpoint: '',
      jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
    };

    await expect(
      (service as any).verifyGoogleIdToken(
        token,
        'google-client',
        'nonce-1',
        discovery,
      ),
    ).resolves.toMatchObject({
      sub: 'subject-1',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    });
    await expect(
      (service as any).verifyGoogleIdToken(
        token,
        'google-client',
        'wrong-nonce',
        discovery,
      ),
    ).rejects.toMatchObject({ code: 'provider_unavailable' });
  });
});
