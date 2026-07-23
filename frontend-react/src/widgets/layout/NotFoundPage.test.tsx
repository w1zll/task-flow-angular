import { render, screen } from '@testing-library/react';
import NotFoundPage from './NotFoundPage';
import { useAuthStore } from '@/shared/store/root.store';
import type { ReactNode } from 'react';

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const messages: Record<string, Record<string, string>> = {
      NotFound: {
        eyebrow: 'Page not found',
        title: 'We could not find this page',
        description: 'The page you requested does not exist.',
        authenticatedAction: 'Go to workspaces',
        guestAction: 'Go home',
        loadingAction: 'Loading...',
      },
    };

    return (key: string) => messages[namespace]?.[key] ?? key;
  },
}));

jest.mock('next/link', () => {
  const React = require('react') as typeof import('react');

  return {
    __esModule: true,
    default: React.forwardRef<HTMLAnchorElement, { href: string; children: ReactNode }>(
      function MockLink({ href, children }, ref) {
        return (
          <a ref={ref} href={href}>
            {children}
          </a>
        );
      },
    ),
  };
});

jest.mock('@/shared/store/root.store', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;

describe('NotFoundPage', () => {
  const renderWithAuth = (state: {
    isAuthenticated: boolean;
    isLoading: boolean;
  }) => {
    mockUseAuthStore.mockImplementation((selector: any) =>
      selector({
        user: null,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
      }),
    );

    return render(<NotFoundPage />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the authenticated CTA and links to workspaces', () => {
    renderWithAuth({ isAuthenticated: true, isLoading: false });

    expect(
      screen.getByRole('link', { name: 'Go to workspaces' }).getAttribute(
        'href',
      ),
    ).toBe('/workspaces');
  });

  it('shows the guest CTA and links to home', () => {
    renderWithAuth({ isAuthenticated: false, isLoading: false });

    expect(
      screen.getByRole('link', { name: 'Go home' }).getAttribute('href'),
    ).toBe('/');
  });

  it('disables navigation while auth is hydrating', () => {
    renderWithAuth({ isAuthenticated: true, isLoading: true });

    expect(
      screen.getByRole('button', { name: 'Loading...' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.queryByRole('link', { name: 'Go to workspaces' }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'Go home' })).toBeNull();
  });
});
