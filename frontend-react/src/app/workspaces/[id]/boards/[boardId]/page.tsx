import KanbanBoardPage from '@/widgets/kanban/KanbanBoardPage';
import { getBoardForCurrentUser } from '@/shared/api/server/boards';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next/types';
import { redirect } from 'next/navigation';
import { isBackendUnavailableError } from '@/shared/api/server/backend';
import type { Board } from '@/shared/api/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Props {
  params: Promise<{ id: string; boardId: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { boardId } = await params;
  const t = await getTranslations('BoardPage');

  return {
    title: t('title', { id: boardId }),
    description: t('description', { id: boardId }),
  };
}

const WorkspaceBoardRoute = async ({ params }: Props) => {
  const { id, boardId } = await params;
  const queryClient = new QueryClient();
  let board: Board | undefined;

  try {
    board = await getBoardForCurrentUser(boardId);
  } catch (error) {
    if (!isBackendUnavailableError(error)) throw error;
  }

  if (!board) {
    return <KanbanBoardPage key={boardId} boardId={boardId} />;
  }

  if (board.workspaceId !== id) {
    redirect(`/workspaces/${board.workspaceId}/boards/${board.id}`);
  }

  queryClient.setQueryData(queryKeys.board(boardId), board);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KanbanBoardPage key={boardId} boardId={boardId} initialBoard={board} />
    </HydrationBoundary>
  );
};

export default WorkspaceBoardRoute;
