import OAuthCallbackPage from '@/features/auth/ui/OAuthCallbackPage';
import { Suspense } from 'react';

const Page = () => (
  <Suspense fallback={null}>
    <OAuthCallbackPage />
  </Suspense>
);

export default Page;
