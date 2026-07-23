import WhiteboardCanvasPage from '@/widgets/whiteboards/WhiteboardCanvasPage';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Props {
  params: Promise<{ id: string; whiteboardId: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { whiteboardId } = await params;
  const t = await getTranslations('Whiteboards');

  return {
    title: t('canvasTitle', { id: whiteboardId }),
    description: t('canvasDescription', { id: whiteboardId }),
  };
}

const WorkspaceWhiteboardRoute = async ({ params }: Props) => {
  const { id, whiteboardId } = await params;

  return <WhiteboardCanvasPage workspaceId={id} whiteboardId={whiteboardId} />;
};

export default WorkspaceWhiteboardRoute;
