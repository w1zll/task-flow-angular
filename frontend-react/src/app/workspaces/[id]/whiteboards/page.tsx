import WhiteboardsPage from '@/widgets/whiteboards/WhiteboardsPage';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Whiteboards');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

const WorkspaceWhiteboardsRoute = async ({ params }: Props) => {
  const { id } = await params;

  return <WhiteboardsPage workspaceId={id} />;
};

export default WorkspaceWhiteboardsRoute;
