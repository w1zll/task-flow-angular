import WorkspaceSettingsPage from '@/widgets/workspaces/WorkspaceSettingsPage';
import {
  getWorkspaceInvitesForCurrentUser,
  getWorkspaceMembersForCurrentUser,
  getWorkspacesForCurrentUser,
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceSettings');
  return {
    title: t('title'),
    description: t('description'),
  };
}

const WorkspaceSettingsRoute = async ({ params }: Props) => {
  const { id } = await params;
  const queryClient = new QueryClient();
  try {
    const workspaces = await getWorkspacesForCurrentUser();
    const workspace = workspaces.find((item) => item.id === id);

    queryClient.setQueryData(queryKeys.workspaces, workspaces);

    if (workspace) {
      const canManageInvites =
        workspace.currentUserRole === 'owner' ||
        workspace.currentUserRole === 'admin';
      const [members, invites] = await Promise.all([
        getWorkspaceMembersForCurrentUser(id),
        canManageInvites
          ? getWorkspaceInvitesForCurrentUser(id)
          : Promise.resolve(null),
      ]);

      queryClient.setQueryData(queryKeys.workspaceMembers(id), members);
      if (invites) {
        queryClient.setQueryData(queryKeys.workspaceInvites(id), invites);
      }
    }
  } catch (error) {
    if (!isBackendUnavailableError(error)) throw error;
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkspaceSettingsPage workspaceId={id} />
    </HydrationBoundary>
  );
};

export default WorkspaceSettingsRoute;
