import WorkspaceOverviewPage from '@/widgets/workspaces/WorkspaceOverviewPage';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceOverview');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

const WorkspaceOverviewRoute = async ({ params }: Props) => {
  const { id } = await params;

  return <WorkspaceOverviewPage workspaceId={id} />;
};

export default WorkspaceOverviewRoute;
