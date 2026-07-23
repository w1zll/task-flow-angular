import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/workspaces'];
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;
const BACKEND_REFRESH_TIMEOUT_MS = 1_500;
const DEFAULT_API_URL = process.env.API_URL || 'http://localhost:3001';

const isProtectedRoute = (pathname: string) =>
  PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

const getCookieHeader = (request: NextRequest) =>
  request.headers.get('cookie') ?? '';

const parseCookieHeader = (cookieHeader: string) =>
  new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index < 0) return [part, ''];
        return [part.slice(0, index), part.slice(index + 1)];
      }),
  );

const serializeCookieHeader = (cookies: Map<string, string>) =>
  Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = atob(padded);
    const json = decodeURIComponent(
      Array.from(decoded, (char) =>
        `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
      ).join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getAccessTokenExpiry = (token: string) => {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
};

const shouldRefreshAccessToken = (accessToken: string | undefined) => {
  if (!accessToken) return true;

  const expiry = getAccessTokenExpiry(accessToken);
  if (!expiry) return true;

  return expiry <= Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS;
};

const splitSetCookieHeader = (setCookieHeader: string) =>
  setCookieHeader.split(/,(?=\s*[^;,]+=)/).map((cookie) => cookie.trim());

const getSetCookieHeaders = (headers: Headers) => {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie();
  }

  const setCookie = headers.get('set-cookie');
  return setCookie ? splitSetCookieHeader(setCookie) : [];
};

const applySetCookieHeaders = (response: NextResponse, setCookieHeaders: string[]) => {
  setCookieHeaders.forEach((cookie) => {
    response.headers.append('set-cookie', cookie);
  });
};

const applyCookieUpdates = (cookieHeader: string, setCookieHeaders: string[]) => {
  const cookies = parseCookieHeader(cookieHeader);

  setCookieHeaders.forEach((cookieHeaderValue) => {
    const [cookiePair] = cookieHeaderValue.split(';');
    const index = cookiePair.indexOf('=');
    if (index < 0) return;

    const name = cookiePair.slice(0, index).trim();
    const value = cookiePair.slice(index + 1);
    cookies.set(name, value);
  });

  return serializeCookieHeader(cookies);
};

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.set(ACCESS_COOKIE, '', {
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, '', {
    path: '/',
    maxAge: 0,
  });
};

const createLoginRedirect = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);

  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = isProtectedRoute(pathname);
  if (!isProtected) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!shouldRefreshAccessToken(accessToken)) {
    return NextResponse.next();
  }

  const responseHeaders = getCookieHeader(request);
  const refreshController = new AbortController();
  const refreshTimeout = setTimeout(
    () => refreshController.abort(),
    BACKEND_REFRESH_TIMEOUT_MS,
  );

  try {
    const refreshResponse = await fetch(
      new URL('/api/auth/refresh', DEFAULT_API_URL),
      {
        method: 'POST',
        headers: {
          cookie: responseHeaders,
        },
        signal: refreshController.signal,
      },
    );

    if (!refreshResponse.ok) {
      return createLoginRedirect(request);
    }

    const setCookieHeaders = getSetCookieHeaders(refreshResponse.headers);
    if (setCookieHeaders.length === 0) {
      return createLoginRedirect(request);
    }

    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(
      'cookie',
      applyCookieUpdates(responseHeaders, setCookieHeaders),
    );

    const response = NextResponse.next({
      request: {
        headers: forwardedHeaders,
      },
    });

    applySetCookieHeaders(response, setCookieHeaders);

    return response;
  } catch {
    return NextResponse.next();
  } finally {
    clearTimeout(refreshTimeout);
  }
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/workspaces/:path*',
    '/auth/:path*',
  ],
};
