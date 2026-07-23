import { act, render, waitFor } from '@testing-library/react';
import { authApi } from '@/shared/api/api';
import { isBrowserOffline } from '@/shared/lib/offline';
import { writeStoredAuthUser } from '@/shared/lib/auth-session';
import { useAuthStore } from '@/shared/store/root.store';
import { usePathname } from 'next/navigation';
import AuthHydrator from './AuthHydrator';

jest.mock('@/shared/api/api');
jest.mock('next/navigation');
jest.mock('@/shared/lib/offline');

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockIsBrowserOffline = isBrowserOffline as jest.MockedFunction<
  typeof isBrowserOffline
>;
const originalHydrate = useAuthStore.getState().hydrate;

describe('AuthHydrator offline bootstrap', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hydrate: originalHydrate,
    });
    mockUsePathname.mockReturnValue('/workspaces');
    mockIsBrowserOffline.mockReturnValue(true);
    jest.clearAllMocks();
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      hydrate: originalHydrate,
    });
  });

  it('hydrates a stored user once and then stabilizes', async () => {
    writeStoredAuthUser({
      id: 'cached-user',
      email: 'cached@example.com',
      name: 'Cached User',
    });
    const hydrate = jest.fn(originalHydrate);
    useAuthStore.setState({ hydrate });

    render(<AuthHydrator />);

    await waitFor(() => {
      expect(useAuthStore.getState()).toMatchObject({
        isLoading: false,
        isAuthenticated: true,
        user: { id: 'cached-user' },
      });
    });
    await act(async () => Promise.resolve());

    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(mockAuthApi.me).not.toHaveBeenCalled();
  });
});
