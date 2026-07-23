// Browser API traffic must stay on the frontend origin. Next.js proxies /api
// to NestJS, so auth cookies are visible to both the browser and Server
// Components even when frontend and backend use unrelated production domains.
export const browserApiBaseUrl = '';

export const withBrowserApiBaseUrl = (path: string) =>
  `${browserApiBaseUrl}${path}`;
