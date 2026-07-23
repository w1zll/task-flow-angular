import WorkspaceShell from '@/widgets/workspaces/WorkspaceShell';
import { getBoardsForCurrentUser } from '@/shared/api/server/boards';
import { getWorkspacesForCurrentUser } from '@/shared/api/server/workspaces';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { isBackendUnavailableError } from '@/shared/api/server/backend';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Props {
  children: React.ReactNode;
  params: Promise<unknown>;
}

const WorkspaceLayout = async ({ children, params }: Props) => {
  const { id } = (await params) as { id: string };
  const queryClient = new QueryClient();

  try {
    const [workspaces, boards] = await Promise.all([
      getWorkspacesForCurrentUser(),
      getBoardsForCurrentUser(),
    ]);
    const workspace = workspaces.find((item) => item.id === id);

    if (!workspace) {
      notFound();
    }

    queryClient.setQueryData(queryKeys.workspaces, workspaces);
    queryClient.setQueryData(queryKeys.boards, boards);
  } catch (error) {
    if (!isBackendUnavailableError(error)) throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspaceShell workspaceId={id}>{children}</WorkspaceShell>
    </HydrationBoundary>
  );
};

export default WorkspaceLayout;
