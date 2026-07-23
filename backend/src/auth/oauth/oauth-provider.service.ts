import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicKey,
  JsonWebKey,
  KeyObject,
  verify as verifySignature,
} from 'crypto';
import { OAuthProvider } from '../entities/auth-identity.entity';
import {
  OAuthFlowError,
  OAuthProfile,
  OAuthProviderConfig,
} from './oauth.types';

interface GoogleDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

const GOOGLE_DISCOVERY_URL =
  'https://accounts.google.com/.well-known/openid-configuration';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';
const CACHE_TTL_MS = 60 * 60 * 1000;

const fromBase64Url = (value: string) => Buffer.from(value, 'base64url');

export const selectGitHubVerifiedEmail = (
  emails: Array<{ email?: string; primary?: boolean; verified?: boolean }>,
) =>
  emails.find(
    (item) => item.primary === true && item.verified === true && item.email,
  )?.email ?? null;

@Injectable()
export class OAuthProviderService {
  private readonly logger = new Logger(OAuthProviderService.name);
  private discoveryCache?: { value: GoogleDiscovery; expiresAt: number };
  private jwksCache?: { value: GoogleJwk[]; expiresAt: number };

  constructor(private readonly configService: ConfigService) {
    const attemptSecret =
      this.configService.get<string>('OAUTH_ATTEMPT_SECRET') ?? '';
    const hasConfiguredProvider = Object.values(OAuthProvider).some((provider) =>
      this.getRawConfig(provider).some(Boolean),
    );
    if (hasConfiguredProvider && Buffer.byteLength(attemptSecret, 'utf8') < 32) {
      this.logger.warn(
        'OAUTH_ATTEMPT_SECRET must contain at least 32 UTF-8 bytes; OAuth providers are disabled',
      );
    }
    for (const provider of Object.values(OAuthProvider)) {
      const values = this.getRawConfig(provider);
      const configured = values.filter(Boolean).length;
      if (configured > 0 && !this.isCompleteConfig(values)) {
        this.logger.warn(
          `${provider} OAuth configuration is incomplete or invalid; provider is disabled`,
        );
      }
    }
  }

  getEnabledProviders(): OAuthProvider[] {
    const attemptSecret =
      this.configService.get<string>('OAUTH_ATTEMPT_SECRET') ?? '';
    if (Buffer.byteLength(attemptSecret, 'utf8') < 32) return [];
    return Object.values(OAuthProvider).filter((provider) =>
      this.isCompleteConfig(this.getRawConfig(provider)),
    );
  }

  isEnabled(provider: OAuthProvider): boolean {
    return this.getEnabledProviders().includes(provider);
  }

  buildAuthorizationUrl(
    provider: OAuthProvider,
    state: string,
    codeChallenge: string,
    nonce?: string,
  ): string {
    const providerConfig = this.getConfig(provider);
    if (provider === OAuthProvider.Google) {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: providerConfig.clientId,
        redirect_uri: providerConfig.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce: nonce ?? '',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'online',
        prompt: 'select_account',
      }).toString();
      return url.toString();
    }

    const url = new URL(GITHUB_AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      response_type: 'code',
      scope: 'read:user user:email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  async exchangeCode(
    provider: OAuthProvider,
    code: string,
    codeVerifier: string,
    nonce?: string,
  ): Promise<OAuthProfile> {
    try {
      return provider === OAuthProvider.Google
        ? await this.exchangeGoogle(code, codeVerifier, nonce ?? '')
        : await this.exchangeGitHub(code, codeVerifier);
    } catch (error) {
      if (error instanceof OAuthFlowError) throw error;
      throw new OAuthFlowError('provider_unavailable');
    }
  }

  private async exchangeGoogle(
    code: string,
    codeVerifier: string,
    nonce: string,
  ): Promise<OAuthProfile> {
    const providerConfig = this.getConfig(OAuthProvider.Google);
    const discovery = await this.getGoogleDiscovery();
    const token = await this.fetchJson<{ id_token?: string }>(
      discovery.token_endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          redirect_uri: providerConfig.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }),
      },
    );
    if (!token.id_token) throw new OAuthFlowError('provider_unavailable');

    const claims = await this.verifyGoogleIdToken(
      token.id_token,
      providerConfig.clientId,
      nonce,
      discovery,
    );
    if (!claims.email || claims.email_verified !== true) {
      throw new OAuthFlowError('email_unverified');
    }
    if (!claims.sub) throw new OAuthFlowError('provider_unavailable');

    return {
      provider: OAuthProvider.Google,
      subject: claims.sub,
      email: claims.email.toLowerCase(),
      emailVerified: true,
      displayName: claims.name?.trim() || claims.email.split('@')[0],
      avatarUrl: claims.picture ?? null,
    };
  }

  private async exchangeGitHub(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthProfile> {
    const providerConfig = this.getConfig(OAuthProvider.GitHub);
    const token = await this.fetchJson<{
      access_token?: string;
      token_type?: string;
    }>(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code,
        redirect_uri: providerConfig.redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    if (!token.access_token) {
      throw new OAuthFlowError('provider_unavailable');
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TaskFlow-OAuth',
    };
    const [profile, emails] = await Promise.all([
      this.fetchJson<{
        id?: number;
        name?: string;
        login?: string;
        avatar_url?: string;
      }>(
        `${GITHUB_API_URL}/user`,
        { headers },
      ),
      this.fetchJson<
        Array<{ email?: string; primary?: boolean; verified?: boolean }>
      >(`${GITHUB_API_URL}/user/emails`, { headers }),
    ]);
    const email = selectGitHubVerifiedEmail(emails);
    if (!email) throw new OAuthFlowError('email_unverified');
    if (!profile.id) throw new OAuthFlowError('provider_unavailable');

    return {
      provider: OAuthProvider.GitHub,
      subject: String(profile.id),
      email: email.toLowerCase(),
      emailVerified: true,
      displayName: profile.name?.trim() || profile.login?.trim() || 'GitHub user',
      avatarUrl: profile.avatar_url ?? null,
    };
  }

  private async verifyGoogleIdToken(
    token: string,
    clientId: string,
    expectedNonce: string,
    discovery: GoogleDiscovery,
  ) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new OAuthFlowError('provider_unavailable');
    const header = JSON.parse(fromBase64Url(parts[0]).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const claims = JSON.parse(fromBase64Url(parts[1]).toString('utf8')) as {
      iss?: string;
      aud?: string | string[];
      exp?: number;
      sub?: string;
      nonce?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (header.alg !== 'RS256' || !header.kid) {
      throw new OAuthFlowError('provider_unavailable');
    }
    const key = await this.getGoogleKey(header.kid, discovery.jwks_uri);
    const valid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      key,
      fromBase64Url(parts[2]),
    );
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      !valid ||
      !['https://accounts.google.com', 'accounts.google.com'].includes(
        claims.iss ?? '',
      ) ||
      !audience.includes(clientId) ||
      !claims.exp ||
      claims.exp * 1000 <= Date.now() ||
      claims.nonce !== expectedNonce
    ) {
      throw new OAuthFlowError('provider_unavailable');
    }
    return claims;
  }

  private async getGoogleDiscovery(): Promise<GoogleDiscovery> {
    if (this.discoveryCache && this.discoveryCache.expiresAt > Date.now()) {
      return this.discoveryCache.value;
    }
    const value = await this.fetchJson<GoogleDiscovery>(GOOGLE_DISCOVERY_URL);
    if (
      value.issuer !== 'https://accounts.google.com' ||
      !value.token_endpoint.startsWith('https://oauth2.googleapis.com/') ||
      !value.jwks_uri.startsWith('https://www.googleapis.com/')
    ) {
      throw new OAuthFlowError('provider_unavailable');
    }
    this.discoveryCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  private async getGoogleKey(kid: string, jwksUri: string): Promise<KeyObject> {
    if (!this.jwksCache || this.jwksCache.expiresAt <= Date.now()) {
      const response = await this.fetchJson<{ keys?: GoogleJwk[] }>(jwksUri);
      this.jwksCache = {
        value: response.keys ?? [],
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    }
    const jwk = this.jwksCache.value.find(
      (item) => item.kid === kid && item.kty === 'RSA',
    );
    if (!jwk) throw new OAuthFlowError('provider_unavailable');
    return createPublicKey({
      key: jwk as unknown as JsonWebKey,
      format: 'jwk',
    });
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const timeoutMs = Number(
      this.configService.get<string>('OAUTH_PROVIDER_TIMEOUT_MS') ?? 8_000,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getConfig(provider: OAuthProvider): OAuthProviderConfig {
    const [clientId, clientSecret, redirectUri] = this.getRawConfig(provider);
    if (!clientId || !clientSecret || !redirectUri || !this.isEnabled(provider)) {
      throw new OAuthFlowError('provider_unavailable');
    }
    return { provider, clientId, clientSecret, redirectUri };
  }

  private getRawConfig(provider: OAuthProvider): [string, string, string] {
    const prefix = provider === OAuthProvider.Google ? 'GOOGLE' : 'GITHUB';
    return [
      this.configService.get<string>(`${prefix}_OAUTH_CLIENT_ID`) ?? '',
      this.configService.get<string>(`${prefix}_OAUTH_CLIENT_SECRET`) ?? '',
      this.configService.get<string>(`${prefix}_OAUTH_REDIRECT_URI`) ?? '',
    ];
  }

  private isCompleteConfig(values: [string, string, string]) {
    if (!values.every(Boolean)) return false;
    try {
      const redirect = new URL(values[2]);
      return redirect.protocol === 'https:' || redirect.protocol === 'http:';
    } catch {
      return false;
    }
  }
}
