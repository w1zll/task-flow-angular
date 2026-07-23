const pendingWorkspaceInviteKey = 'taskflow.pendingWorkspaceInvite';

export const savePendingWorkspaceInvite = (token: string): void => {
  if (typeof window === 'undefined' || !token) return;
  sessionStorage.setItem(pendingWorkspaceInviteKey, token);
};

export const getPendingWorkspaceInvite = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(pendingWorkspaceInviteKey);
};

export const clearPendingWorkspaceInvite = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(pendingWorkspaceInviteKey);
};

export const capturePendingWorkspaceInviteFromLocation = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = new URLSearchParams(window.location.search).get('invite');
  if (token) savePendingWorkspaceInvite(token);
  return token ?? getPendingWorkspaceInvite();
};

export const getInviteAuthHref = (
  path: '/auth/login' | '/auth/register',
  token: string | null,
): string => (token ? `${path}?invite=${encodeURIComponent(token)}` : path);
