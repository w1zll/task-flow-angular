type CorsCallback = (error: Error | null, allow?: boolean) => void;

const LOCAL_FRONTEND_ORIGIN = 'http://localhost:3000';

const normalizeOrigin = (origin?: string) => origin?.replace(/\/$/, '');

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllowedExactOrigins = () =>
  [
    LOCAL_FRONTEND_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_DEV_URL,
    process.env.FRONTEND_PRODUCTION_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? []),
  ]
    .map((origin) => normalizeOrigin(origin?.trim()))
    .filter((origin): origin is string => Boolean(origin));

const isVercelPreviewOrigin = (origin: string) => {
  if (process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'true') return false;

  const projectSlug = process.env.VERCEL_PROJECT_SLUG ?? 'task-flow';
  const teamSlug = process.env.VERCEL_TEAM_SLUG ?? 'wizls-projects';
  const previewPattern = new RegExp(
    `^https://${escapeRegExp(projectSlug)}-[a-z0-9-]+-${escapeRegExp(
      teamSlug,
    )}\\.vercel\\.app$`,
    'i',
  );

  return previewPattern.test(origin);
};

export const isAllowedOrigin = (origin?: string) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;

  if (getAllowedExactOrigins().includes(normalizedOrigin)) return true;

  return isVercelPreviewOrigin(normalizedOrigin);
};

export const corsOrigin = (origin: string | undefined, callback: CorsCallback) => {
  callback(null, isAllowedOrigin(origin));
};
