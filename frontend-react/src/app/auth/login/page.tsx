import LoginForm from '@/features/auth/ui/LoginForm';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth.Login');

  return {
    title: t('title'),
    description: t('description'),
  };
}

const LoginPage = () => {
  return <LoginForm />;
};

export default LoginPage;
