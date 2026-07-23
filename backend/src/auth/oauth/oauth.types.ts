import { OAuthProvider } from '../entities/auth-identity.entity';

export const OAUTH_ERROR_CODES = [
  'account_exists',
  'email_unverified',
  'access_denied',
  'expired',
  'identity_in_use',
  'last_method',
  'provider_unavailable',
] as const;

export type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number];

export class OAuthFlowError extends Error {
  constructor(
    public readonly code: OAuthErrorCode,
    public readonly intent?: 'login' | 'link',
  ) {
    super(code);
  }
}

export interface OAuthProfile {
  provider: OAuthProvider;
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
}

export interface OAuthProviderConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
