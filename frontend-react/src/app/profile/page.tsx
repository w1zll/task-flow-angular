import ProfileClientPage from './ProfileClientPage';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ProfilePage');

  return {
    title: t('profileTitle'),
    description: t('profileDescription'),
  };
}

const ProfilePage = () => {
  return <ProfileClientPage />;
};

export default ProfilePage;
