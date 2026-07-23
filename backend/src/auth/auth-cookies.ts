import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_COOKIE = 'access_token';
export const OAUTH_ATTEMPT_COOKIE = 'oauth_attempt';

const useSecureCookies =
  process.env.AUTH_COOKIE_SECURE !== undefined
    ? process.env.AUTH_COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production';

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: useSecureCookies ? 'none' : 'lax',
  path: '/',
};

export const setTokenCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearTokenCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE, AUTH_COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE, AUTH_COOKIE_OPTIONS);
};

const OAUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: useSecureCookies,
  sameSite: 'lax',
  path: '/api/auth/oauth',
};

export const setOAuthAttemptCookie = (res: Response, value: string) => {
  res.cookie(OAUTH_ATTEMPT_COOKIE, value, {
    ...OAUTH_COOKIE_OPTIONS,
    maxAge: 10 * 60 * 1000,
  });
};

export const clearOAuthAttemptCookie = (res: Response) => {
  res.clearCookie(OAUTH_ATTEMPT_COOKIE, OAUTH_COOKIE_OPTIONS);
};
