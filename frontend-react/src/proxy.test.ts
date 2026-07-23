import { proxy } from './proxy';
import { NextResponse } from 'next/server';

jest.mock('next/server', () => {
  const next = jest.fn();
  const redirect = jest.fn();

  return {
    NextResponse: {
      next,
      redirect,
    },
  };
});

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;

const createJwt = (expSecondsFromNow: number) => {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
    }),
  ).toString('base64url');

  return `${header}.${payload}.`;
};

const createRequest = (options: {
  pathname: string;
  search?: string;
  accessToken?: string;
  refreshToken?: string;
}) =>
  ({
    url: `http://localhost:3000${options.pathname}${options.search ?? ''}`,
    nextUrl: {
      pathname: options.pathname,
      search: options.search ?? '',
    },
    headers: new Headers({
      cookie: [
        options.refreshToken ? `refresh_token=${options.refreshToken}` : null,
        options.accessToken ? `access_token=${options.accessToken}` : null,
      ]
        .filter(Boolean)
        .join('; '),
    }),
    cookies: {
      get: jest.fn((name: string) => {
        const value =
          name === 'refresh_token'
            ? options.refreshToken
            : name === 'access_token'
              ? options.accessToken
              : undefined;
        return value ? { value } : undefined;
      }),
    },
  }) as any;

describe('proxy', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockNextResponse.next.mockImplementation((arg?: unknown) => {
      const response: any = {
        arg,
        headers: {
          append: jest.fn(),
        },
        cookies: {
          set: jest.fn(),
        },
      };
      return response;
    });
    mockNextResponse.redirect.mockImplementation((url) => {
      const response: any = {
        url,
        headers: {
          append: jest.fn(),
        },
        cookies: {
          set: jest.fn(),
        },
      };
      return response;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('refreshes expiring access tokens and forwards fresh cookies to the render request', async () => {
    const request = createRequest({
      pathname: '/profile',
      search: '?tab=overview',
      accessToken: createJwt(10),
      refreshToken: 'refresh-old',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: jest.fn(() => [
          'access_token=access-new; Path=/; HttpOnly',
          'refresh_token=refresh-new; Path=/; HttpOnly',
        ]),
      },
    });

    const response = await proxy(request);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'POST',
        headers: {
          cookie: `refresh_token=refresh-old; access_token=${request.cookies.get('access_token').value}`,
        },
      }),
    );
    expect(mockNextResponse.next).toHaveBeenCalledWith({
      request: {
        headers: expect.any(Headers),
      },
    });

    const nextCall = mockNextResponse.next.mock.calls[0]?.[0] as
      | { request: { headers: Headers } }
      | undefined;
    expect(nextCall).toBeDefined();
    const forwardedHeaders = nextCall!.request.headers;
    expect(forwardedHeaders.get('cookie')).toContain('access_token=access-new');
    expect(forwardedHeaders.get('cookie')).toContain('refresh_token=refresh-new');
    expect(response.headers.append).toHaveBeenCalledWith(
      'set-cookie',
      'access_token=access-new; Path=/; HttpOnly',
    );
    expect(response.headers.append).toHaveBeenCalledWith(
      'set-cookie',
      'refresh_token=refresh-new; Path=/; HttpOnly',
    );
  });

  it('splits combined set-cookie headers from refresh responses', async () => {
    const request = createRequest({
      pathname: '/workspaces/1',
      accessToken: createJwt(-10),
      refreshToken: 'refresh-old',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn((name: string) =>
          name === 'set-cookie'
            ? 'access_token=access-new; Path=/; HttpOnly, refresh_token=refresh-new; Path=/; HttpOnly'
            : null,
        ),
      },
    });

    const response = await proxy(request);
    const nextCall = mockNextResponse.next.mock.calls[0]?.[0] as
      | { request: { headers: Headers } }
      | undefined;
    expect(nextCall).toBeDefined();
    const forwardedHeaders = nextCall!.request.headers;

    expect(forwardedHeaders.get('cookie')).toContain('access_token=access-new');
    expect(forwardedHeaders.get('cookie')).toContain('refresh_token=refresh-new');
    expect(response.headers.append).toHaveBeenCalledWith(
      'set-cookie',
      'access_token=access-new; Path=/; HttpOnly',
    );
    expect(response.headers.append).toHaveBeenCalledWith(
      'set-cookie',
      'refresh_token=refresh-new; Path=/; HttpOnly',
    );
  });

  it('redirects to login and clears auth cookies when refresh fails', async () => {
    const request = createRequest({
      pathname: '/workspaces',
      search: '?view=list',
      accessToken: createJwt(10),
      refreshToken: 'refresh-old',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      headers: {
        getSetCookie: jest.fn(() => []),
      },
    });

    const response = await proxy(request);

    expect(mockNextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/auth/login',
        searchParams: expect.any(URLSearchParams),
      }),
    );
    expect(response.cookies.set).toHaveBeenCalledWith('access_token', '', {
      path: '/',
      maxAge: 0,
    });
    expect(response.cookies.set).toHaveBeenCalledWith('refresh_token', '', {
      path: '/',
      maxAge: 0,
    });
  });

  it('allows rendering when the backend is temporarily unavailable', async () => {
    const request = createRequest({
      pathname: '/workspaces',
      accessToken: createJwt(-10),
      refreshToken: 'refresh-old',
    });

    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));

    const response = await proxy(request);

    expect(mockNextResponse.next).toHaveBeenCalledWith();
    expect(mockNextResponse.redirect).not.toHaveBeenCalled();
    expect(response.cookies.set).not.toHaveBeenCalled();
  });
});
