import axios from 'axios';
import { redirectToLogin } from './navigation';
import { markNetworkOffline } from '../lib/offline';

jest.mock('axios');
jest.mock('./navigation', () => ({
  redirectToLogin: jest.fn(),
}));
jest.mock('../lib/offline', () => ({
  OfflineReadOnlyError: class OfflineReadOnlyError extends Error {},
  isBrowserOffline: jest.fn(() => false),
  markNetworkOffline: jest.fn(),
  markNetworkOnline: jest.fn(),
}));

describe('apiClient refresh handling', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedRedirectToLogin =
    redirectToLogin as jest.MockedFunction<typeof redirectToLogin>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createInstance = () => {
    const instance: any = jest.fn();
    instance.get = jest.fn();
    instance.post = jest.fn();
    instance.interceptors = {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    };
    return instance;
  };

  it('retries /api/auth/me after a refresh', async () => {
    const instance = createInstance();
    let responseErrorHandler: any;

    instance.interceptors.response.use.mockImplementation(
      (_fulfilled: unknown, rejected: unknown) => {
        responseErrorHandler = rejected;
      },
    );
    mockedAxios.create.mockReturnValue(instance);

    let apiClient: any;
    jest.isolateModules(() => {
      apiClient = require('./client').apiClient;
    });

    instance.post.mockResolvedValueOnce({ data: {} });
    instance.mockResolvedValueOnce({ data: { id: 'user-1' } });

    const error = {
      response: { status: 401 },
      config: { url: '/api/auth/me', method: 'get' },
    };

    const result = await responseErrorHandler(error);

    expect(instance.post).toHaveBeenCalledWith('/api/auth/refresh');
    expect(instance).toHaveBeenCalledWith({
      url: '/api/auth/me',
      method: 'get',
      _retry: true,
    });
    expect(result).toEqual({ data: { id: 'user-1' } });
    expect(apiClient).toBe(instance);
  });

  it('does not redirect on refresh failure for /api/auth/me', async () => {
    const instance = createInstance();
    let responseErrorHandler: any;

    instance.interceptors.response.use.mockImplementation(
      (_fulfilled: unknown, rejected: unknown) => {
        responseErrorHandler = rejected;
      },
    );
    mockedAxios.create.mockReturnValue(instance);

    let apiClient: any;
    jest.isolateModules(() => {
      apiClient = require('./client').apiClient;
    });

    instance.post.mockRejectedValueOnce(new Error('refresh failed'));

    const error = {
      response: { status: 401 },
      config: { url: '/api/auth/me', method: 'get' },
    };

    await expect(responseErrorHandler(error)).rejects.toBe(error);
    expect(mockedRedirectToLogin).not.toHaveBeenCalled();
    expect(apiClient).toBe(instance);
  });

  it('redirects queued protected requests when refresh fails after /api/auth/me', async () => {
    const instance = createInstance();
    let responseErrorHandler: any;

    instance.interceptors.response.use.mockImplementation(
      (_fulfilled: unknown, rejected: unknown) => {
        responseErrorHandler = rejected;
      },
    );
    mockedAxios.create.mockReturnValue(instance);

    let apiClient: any;
    jest.isolateModules(() => {
      apiClient = require('./client').apiClient;
    });

    let rejectRefresh: (reason?: unknown) => void = () => undefined;
    instance.post.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRefresh = reject;
        }),
    );

    const probeError = {
      response: { status: 401 },
      config: { url: '/api/auth/me', method: 'get' },
    };
    const protectedError = {
      response: { status: 401 },
      config: { url: '/api/boards', method: 'get' },
    };

    const probePromise = responseErrorHandler(probeError);
    const queuedPromise = responseErrorHandler(protectedError);
    const refreshError = new Error('refresh failed');

    rejectRefresh(refreshError);

    await expect(probePromise).rejects.toBe(probeError);
    await expect(queuedPromise).rejects.toBe(refreshError);
    expect(mockedRedirectToLogin).toHaveBeenCalledWith('/auth/login');
    expect(apiClient).toBe(instance);
  });

  it('does not classify a CORS-style network error as offline while the browser is online', async () => {
    const instance = createInstance();
    let responseErrorHandler: any;
    instance.interceptors.response.use.mockImplementation(
      (_fulfilled: unknown, rejected: unknown) => {
        responseErrorHandler = rejected;
      },
    );
    mockedAxios.create.mockReturnValue(instance);
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    jest.isolateModules(() => {
      require('./client');
    });

    const error = {
      config: { url: '/api/auth/identities/google', method: 'delete' },
    };
    await expect(responseErrorHandler(error)).rejects.toBe(error);
    expect(markNetworkOffline).not.toHaveBeenCalled();
  });
});
