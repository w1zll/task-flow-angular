import { isAllowedOrigin } from './cors-origin';

describe('cors origin helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FRONTEND_URL;
    delete process.env.FRONTEND_DEV_URL;
    delete process.env.FRONTEND_PRODUCTION_URL;
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.CORS_ALLOW_VERCEL_PREVIEWS;
    delete process.env.VERCEL_PROJECT_SLUG;
    delete process.env.VERCEL_TEAM_SLUG;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows requests without an origin header', () => {
    expect(isAllowedOrigin()).toBe(true);
  });

  it('allows localhost by default', () => {
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
  });

  it('allows exact frontend origins from env variables', () => {
    process.env.FRONTEND_URL = 'https://task-flow.vercel.app/';
    process.env.CORS_ALLOWED_ORIGINS =
      'https://custom-preview.example.com, https://staging.example.com/';

    expect(isAllowedOrigin('https://task-flow.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://custom-preview.example.com')).toBe(true);
    expect(isAllowedOrigin('https://staging.example.com')).toBe(true);
  });

  it('allows matching Vercel preview origins only when enabled', () => {
    const previewOrigin =
      'https://task-flow-7wfcexvk7-wizls-projects.vercel.app';

    expect(isAllowedOrigin(previewOrigin)).toBe(false);

    process.env.CORS_ALLOW_VERCEL_PREVIEWS = 'true';

    expect(isAllowedOrigin(previewOrigin)).toBe(true);
  });

  it('rejects other Vercel projects when preview origins are enabled', () => {
    process.env.CORS_ALLOW_VERCEL_PREVIEWS = 'true';

    expect(
      isAllowedOrigin('https://another-project-7wfcexvk7-wizls-projects.vercel.app'),
    ).toBe(false);
  });
});
