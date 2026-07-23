import 'server-only';

import { Board } from '@/shared/api/api';
import { getBoardContentTag } from '@/shared/cache/board-cache-tags';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { BackendUnavailableError, fetchBackendApi } from './backend';

const apiBaseUrl = process.env.API_URL || 'http://localhost:3001';
const boardContentCacheVersion = 'v2';

const getCookieHeader = async () => {
  const headersList = await headers();
  return headersList.get('cookie') ?? '';
};

const fetchBoardApi = async <T>(
  path: string,
  init: RequestInit & { next?: NextFetchRequestConfig } = {},
): Promise<T> => {
  const response = await fetchBackendApi(`${apiBaseUrl}${path}`, init);
  handleBoardApiResponse(response);

  return response.json() as Promise<T>;
};

const fetchBoardApiNoContent = async (
  path: string,
  init: RequestInit & { next?: NextFetchRequestConfig } = {},
): Promise<void> => {
  const response = await fetchBackendApi(`${apiBaseUrl}${path}`, init);
  handleBoardApiResponse(response);
};

const handleBoardApiResponse = (response: Response) => {
  if (response.status === 401) {
    redirect('/auth/login');
  }

  if (response.status === 403 || response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new BackendUnavailableError(
      `Board API request failed: ${response.status}`,
    );
  }
};

export const getBoardsForCurrentUser = async () => {
  const cookieHeader = await getCookieHeader();

  return fetchBoardApi<Board[]>('/api/boards', {
    cache: 'no-store',
    headers: {
      cookie: cookieHeader,
    },
  });
};

const ensureBoardAccessForCurrentUser = async (
  boardId: string,
  cookieHeader: string,
) => {
  return fetchBoardApiNoContent(`/api/boards/${boardId}/access`, {
    cache: 'no-store',
    headers: {
      cookie: cookieHeader,
    },
  });
};

const getCachedBoardContent = async (
  boardId: string,
  cookieHeader: string,
) => {
  return unstable_cache(
    async () =>
      fetchBoardApi<Board>(`/api/boards/${boardId}`, {
        cache: 'no-store',
        headers: {
          cookie: cookieHeader,
        },
      }),
    [`board-content:${boardContentCacheVersion}:${boardId}`],
    {
      tags: [getBoardContentTag(boardId)],
    },
  )();
};

export const getBoardForCurrentUser = async (boardId: string) => {
  const cookieHeader = await getCookieHeader();

  await ensureBoardAccessForCurrentUser(boardId, cookieHeader);
  return getCachedBoardContent(boardId, cookieHeader);
};
