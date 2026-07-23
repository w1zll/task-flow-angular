import { render } from '@testing-library/react';
import AppHeader from './AppHeader';

jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    },
    logout: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useIsOffline: () => true,
}));

jest.mock('@/shared/store/root.store', () => ({
  useThemeStore: () => ({
    hasHydrated: true,
    mode: 'light',
    toggle: jest.fn(),
  }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));

jest.mock('next/link', () => {
  const React = jest.requireActual('react');
  const MockNextLink = React.forwardRef(
    (
      props: React.ComponentProps<'a'> & {
        prefetch?: boolean;
      },
      ref: React.ForwardedRef<HTMLAnchorElement>,
    ) => {
      const { prefetch, ...anchorProps } = props;
      void prefetch;
      return <a ref={ref} {...anchorProps} />;
    },
  );
  MockNextLink.displayName = 'MockNextLink';
  return MockNextLink;
});

jest.mock('./LocaleSwitcher', () => function MockLocaleSwitcher() {
  return <div data-testid="locale-switcher" />;
});
jest.mock(
  './notifications/NotificationBell',
  () => function MockNotificationBell() {
    return null;
  },
);
jest.mock('@/shared/ui/TaskFlowLogo', () => function MockTaskFlowLogo() {
  return <span>TaskFlow</span>;
});
jest.mock('@/shared/ui/UserAvatar', () => function MockUserAvatar() {
  return <span>Avatar</span>;
});

describe('AppHeader', () => {
  it('does not forward the Next.js prefetch prop to offline anchor links', () => {
    const { container } = render(<AppHeader initialThemeMode="light" />);
    const workspaceLinks = Array.from(
      container.querySelectorAll('a[href="/workspaces"]'),
    );

    expect(workspaceLinks).toHaveLength(2);
    expect(workspaceLinks.every((link) => !link.hasAttribute('prefetch'))).toBe(
      true,
    );
  });
});
