import WorkspaceTeamsPage from '@/widgets/workspaces/WorkspaceTeamsPage';
import {
  getWorkspaceMembersForCurrentUser,
  getWorkspaceTeamsForCurrentUser,
} from '@/shared/api/server/workspaces';
import { queryKeys } from '@/shared/queries/board-query-keys';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { isBackendUnavailableError } from '@/shared/api/server/backend';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceTeamsPage');

  return {
    title: t('title'),
    description: t('description'),
  };
}

const WorkspaceTeamsRoute = async ({ params }: Props) => {
  const { id } = await params;
  const queryClient = new QueryClient();
  try {
    const [members, teams] = await Promise.all([
      getWorkspaceMembersForCurrentUser(id),
      getWorkspaceTeamsForCurrentUser(id),
    ]);

    queryClient.setQueryData(queryKeys.workspaceMembers(id), members);
    queryClient.setQueryData(queryKeys.workspaceTeams(id), teams);
  } catch (error) {
    if (!isBackendUnavailableError(error)) throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspaceTeamsPage workspaceId={id} />
    </HydrationBoundary>
  );
};

export default WorkspaceTeamsRoute;
