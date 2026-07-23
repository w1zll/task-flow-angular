import { render, screen } from '@testing-library/react';
import OAuthButtons from './OAuthButtons';
import { useOAuthProviders } from '@/shared/queries/auth.queries';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/shared/queries/auth.queries', () => ({
  useOAuthProviders: jest.fn(),
}));

const mockedUseOAuthProviders = useOAuthProviders as jest.Mock;

describe('OAuthButtons', () => {
  it('renders only providers enabled by backend configuration', () => {
    mockedUseOAuthProviders.mockReturnValue({
      isLoading: false,
      data: { providers: ['google'] },
    });

    render(<OAuthButtons />);

    expect(
      screen.getByRole('button', { name: 'continue.google' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'continue.github' }),
    ).toBeNull();
    expect(screen.getByText('or')).toBeTruthy();
  });

  it('does not render social controls when no provider is enabled', () => {
    mockedUseOAuthProviders.mockReturnValue({
      isLoading: false,
      data: { providers: [] },
    });

    const { container } = render(<OAuthButtons />);
    expect(container.childElementCount).toBe(0);
  });
});
