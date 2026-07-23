import { render, screen, waitFor } from '@testing-library/react';
import DemoWorkspaceBanner from './DemoWorkspaceBanner';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: jest.fn() }),
}));
jest.mock('@/shared/hooks/useOnlineStatus', () => ({
  useIsOffline: () => false,
}));
jest.mock('@/shared/store/root.store', () => ({
  useAuthStore: (selector: (state: { setUser: jest.Mock }) => unknown) =>
    selector({ setUser: jest.fn() }),
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return { ...actual, useMediaQuery: () => true };
});

describe('DemoWorkspaceBanner', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 50,
    });
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 844,
    });
  });

  it('appears without resize, starts collapsed and stays above mobile actions', async () => {
    render(<DemoWorkspaceBanner />);

    const banner = await screen.findByRole('region', { name: 'regionLabel' });
    await waitFor(() =>
      expect(window.getComputedStyle(banner).visibility).toBe('visible'),
    );

    expect(screen.getByRole('button', { name: 'expand' })).not.toBeNull();
    expect(parseFloat(window.getComputedStyle(banner).top)).toBeLessThanOrEqual(
      844 - 50 - 70,
    );
  });
});
