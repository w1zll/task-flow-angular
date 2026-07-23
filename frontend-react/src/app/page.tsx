import LandingClient from '@/widgets/landing/LandingClient';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('HomePage');
  return {
    title: t('title'),
    description: t('description'),
  };
};

const HomePage = async () => {
  return <LandingClient />;
};

export default HomePage;
