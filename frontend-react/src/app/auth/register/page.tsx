import RegisterForm from '@/features/auth/ui/RegisterForm';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Auth.Register');

  return {
    title: t('title'),
    description: t('description'),
  };
}

const RegisterPage = () => {
  return <RegisterForm />;
};

export default RegisterPage;
