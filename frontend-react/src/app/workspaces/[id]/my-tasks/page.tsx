import WorkspaceMyTasksPage from '@/widgets/workspaces/WorkspaceMyTasksPage';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceMyTasks');

  return {
    title: t('title'),
    description: t('description'),
  };
}

const WorkspaceMyTasksRoute = async ({ params }: Props) => {
  const { id } = await params;

  return <WorkspaceMyTasksPage workspaceId={id} />;
};

export default WorkspaceMyTasksRoute;
