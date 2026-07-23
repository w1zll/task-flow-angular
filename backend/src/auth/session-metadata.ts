import type { Request } from 'express';

export interface SessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

const truncate = (value: string | undefined, maxLength: number) => {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

export const getRequestSessionMetadata = (
  request: Request,
): SessionMetadata => ({
  userAgent: truncate(request.get('user-agent'), 500),
  ipAddress: truncate(request.ip?.replace(/^::ffff:/, ''), 64),
});

const firstMatch = (userAgent: string, candidates: Array<[RegExp, string]>) =>
  candidates.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

export const describeSession = (userAgent?: string | null) => {
  if (!userAgent) {
    return { deviceName: null, browser: null, os: null };
  }

  const browser = firstMatch(userAgent, [
    [/Edg\//, 'Microsoft Edge'],
    [/OPR\//, 'Opera'],
    [/Firefox\//, 'Firefox'],
    [/CriOS\//, 'Chrome'],
    [/Chrome\//, 'Chrome'],
    [/FxiOS\//, 'Firefox'],
    [/Safari\//, 'Safari'],
  ]);
  const os = firstMatch(userAgent, [
    [/Windows NT/, 'Windows'],
    [/(iPhone|iPad|iPod)/, 'iOS'],
    [/Android/, 'Android'],
    [/Mac OS X/, 'macOS'],
    [/CrOS/, 'ChromeOS'],
    [/Linux/, 'Linux'],
  ]);
  const deviceName = /iPad|Tablet/i.test(userAgent)
    ? 'tablet'
    : /Mobile|iPhone|Android/i.test(userAgent)
      ? 'mobile'
      : 'desktop';

  return { deviceName, browser, os };
};
