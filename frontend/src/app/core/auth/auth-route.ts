import { UserDto } from '@core/api/generated';

const allowedNextPaths = ['/workspaces'];

export const safeNextUrl = (value: string | null | undefined): string | null => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  const path = value.split(/[?#]/u)[0] ?? '';
  const allowed = allowedNextPaths.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  return allowed ? value : null;
};

export const authenticatedHome = (user: UserDto): string => {
  return user.activeWorkspaceId
    ? `/workspaces/${encodeURIComponent(user.activeWorkspaceId)}/boards`
    : '/workspaces';
};

export const postAuthUrl = (user: UserDto, next?: string | null): string => {
  return safeNextUrl(next) ?? authenticatedHome(user);
};
