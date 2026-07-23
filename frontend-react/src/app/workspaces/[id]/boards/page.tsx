import BoardsClientPage from '@/widgets/boards/BoardsClientPage';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Boards');

  return {
    title: t('workspacePageTitle'),
    description: t('workspaceBoardsDescription'),
  };
}

const WorkspaceBoardsRoute = async ({ params }: Props) => {
  const { id } = await params;

  return <BoardsClientPage workspaceId={id} />;
};

export default WorkspaceBoardsRoute;
