import 'server-only';

import {
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  Team,
} from '@/shared/api/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackendUnavailableError, fetchBackendApi } from './backend';

const apiBaseUrl = process.env.API_URL || 'http://localhost:3001';

const getCookieHeader = async () => {
  const headersList = await headers();
  return headersList.get('cookie') ?? '';
};

export const getWorkspacesForCurrentUser = async (): Promise<Workspace[]> => {
  const cookieHeader = await getCookieHeader();
  const response = await fetchBackendApi(`${apiBaseUrl}/api/workspaces`, {
    cache: 'no-store',
    headers: {
      cookie: cookieHeader,
    },
  });

  if (response.status === 401) {
    redirect('/auth/login');
  }

  if (!response.ok) {
    throw new BackendUnavailableError(
      `Workspace API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<Workspace[]>;
};

const fetchWorkspaceApi = async <T>(path: string): Promise<T> => {
  const cookieHeader = await getCookieHeader();
  const response = await fetchBackendApi(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: {
      cookie: cookieHeader,
    },
  });

  if (response.status === 401) {
    redirect('/auth/login');
  }

  if (!response.ok) {
    throw new BackendUnavailableError(
      `Workspace API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
};

export const getWorkspaceMembersForCurrentUser = (
  workspaceId: string,
): Promise<WorkspaceMember[]> =>
  fetchWorkspaceApi(`/api/workspaces/${workspaceId}/members`);

export const getWorkspaceInvitesForCurrentUser = (
  workspaceId: string,
): Promise<WorkspaceInvite[]> =>
  fetchWorkspaceApi(`/api/workspaces/${workspaceId}/invites`);

export const getWorkspaceTeamsForCurrentUser = (
  workspaceId: string,
): Promise<Team[]> =>
  fetchWorkspaceApi(`/api/workspaces/${workspaceId}/teams`);
