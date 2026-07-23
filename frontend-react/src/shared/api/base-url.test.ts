import { browserApiBaseUrl, withBrowserApiBaseUrl } from './base-url';

describe('browser API base URL', () => {
  it('keeps browser requests on the frontend origin for SSR-compatible cookies', () => {
    expect(browserApiBaseUrl).toBe('');
    expect(withBrowserApiBaseUrl('/api/auth/oauth/google/start')).toBe(
      '/api/auth/oauth/google/start',
    );
  });
});
