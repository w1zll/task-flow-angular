import WorkspaceAnalyticsPage from '@/widgets/workspaces/analytics/WorkspaceAnalyticsPage';
import {
  parseAnalyticsFilters,
  type AnalyticsSearchParams,
} from '@/widgets/workspaces/analytics/analytics-filters';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<AnalyticsSearchParams>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('WorkspaceAnalytics');

  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

const WorkspaceAnalyticsRoute = async ({ params, searchParams }: Props) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const initialFilters = parseAnalyticsFilters(query);

  return (
    <WorkspaceAnalyticsPage
      workspaceId={id}
      initialFilters={initialFilters}
    />
  );
};

export default WorkspaceAnalyticsRoute;
