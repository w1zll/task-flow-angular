import WorkspaceInviteLandingPage from '@/widgets/workspaces/WorkspaceInviteLandingPage';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceInvite');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

const WorkspaceInvitePage = async ({ params }: Props) => {
  const { token } = await params;
  return <WorkspaceInviteLandingPage token={token} />;
};

export default WorkspaceInvitePage;
