import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { authApi, workspaceInvitesApi } from '@/shared/api/api';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';

// Mock dependencies
jest.mock('@/shared/store/root.store', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@/shared/api/api');
jest.mock('next/navigation');
jest.mock('notistack');

import { useAuthStore } from '@/shared/store/root.store';

const mockUseAuthStore = useAuthStore as jest.MockedFunction<
  typeof useAuthStore
>;
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockWorkspaceInvitesApi =
  workspaceInvitesApi as jest.Mocked<typeof workspaceInvitesApi>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSnackbar = useSnackbar as jest.MockedFunction<typeof useSnackbar>;

describe('useAuth', () => {
  let queryClient: QueryClient;
  let mockStore: any;
  let mockRouter: any;
  let mockSnackbar: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockStore = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: jest.fn(),
      setActiveWorkspace: jest.fn(),
      logout: jest.fn(),
    };
    mockUseAuthStore.mockReturnValue(mockStore);

    mockRouter = { push: jest.fn(), refresh: jest.fn() };
    mockUseRouter.mockReturnValue(mockRouter);

    mockSnackbar = { enqueueSnackbar: jest.fn() };
    mockUseSnackbar.mockReturnValue(mockSnackbar);

    mockAuthApi.login = jest.fn();
    mockAuthApi.register = jest.fn();
    mockAuthApi.logout = jest.fn();
    mockWorkspaceInvitesApi.accept = jest.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('initial state', () => {
    it('should return initial auth state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoginLoading).toBe(false);
      expect(result.current.isRegisterLoading).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const response = {
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      };

      // @ts-expect-error Mocked response intentionally omits Axios metadata.
      mockAuthApi.login.mockResolvedValue({ data: response });

      const { result } = renderHook(() => useAuth(), { wrapper });

      result.current.login(loginData);

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith(loginData);
        expect(mockStore.setUser).toHaveBeenCalledWith(response.user);
        expect(mockRouter.push).toHaveBeenCalledWith('/workspaces');
      });
    });

    it('should restore the active workspace after login', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const response = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          activeWorkspaceId: 'workspace-1',
        },
      };

      // @ts-expect-error Mocked response intentionally omits Axios metadata.
      mockAuthApi.login.mockResolvedValue({ data: response });

      const { result } = renderHook(() => useAuth(), { wrapper });
      result.current.login(loginData);

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith(loginData);
        expect(mockStore.setUser).toHaveBeenCalledWith(response.user);
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/workspaces/workspace-1',
        );
      });
    });

    it('should handle login error', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const error = { response: { data: { message: 'Invalid credentials' } } };

      mockAuthApi.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      result.current.login(loginData);

      await waitFor(() => {
        expect(mockSnackbar.enqueueSnackbar).toHaveBeenCalledWith(
          'Invalid credentials',
          {
            variant: 'error',
          },
        );
      });
    });

    it('should accept a pending workspace invite after login', async () => {
      const loginData = { email: 'test@example.com', password: 'password' };
      const response = {
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      };
      sessionStorage.setItem(
        'taskflow.pendingWorkspaceInvite',
        'invite-token',
      );
      // @ts-expect-error Mocked response intentionally omits Axios metadata.
      mockAuthApi.login.mockResolvedValue({ data: response });
      mockWorkspaceInvitesApi.accept.mockResolvedValue({
        data: {
          id: 'workspace-2',
          name: 'Invited Workspace',
          isPersonal: false,
          ownerId: 'owner-1',
          currentUserRole: 'member',
          isActive: true,
          createdAt: '2026-06-25T00:00:00.000Z',
          updatedAt: '2026-06-25T00:00:00.000Z',
        },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      result.current.login(loginData);

      await waitFor(() => {
        expect(mockWorkspaceInvitesApi.accept).toHaveBeenCalledWith(
          'invite-token',
        );
        expect(mockStore.setActiveWorkspace).toHaveBeenCalledWith(
          'workspace-2',
        );
        expect(mockRouter.push).toHaveBeenCalledWith(
          '/workspaces/workspace-2',
        );
        expect(
          sessionStorage.getItem('taskflow.pendingWorkspaceInvite'),
        ).toBeNull();
      });
    });
  });

  describe('register', () => {
    it('should pass the optional avatar file to the registration API', async () => {
      const avatar = new File(['avatar'], 'avatar.png', {
        type: 'image/png',
      });
      const registrationData = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
        avatar,
      };
      const response = {
        user: {
          id: '1',
          email: registrationData.email,
          name: registrationData.name,
          avatar: '/api/storage/avatars/avatar.png',
        },
      };

      // @ts-expect-error Mocked response intentionally omits Axios metadata.
      mockAuthApi.register.mockResolvedValue({ data: response });

      const { result } = renderHook(() => useAuth(), { wrapper });
      result.current.register(registrationData);

      await waitFor(() => {
        expect(mockAuthApi.register).toHaveBeenCalledWith(registrationData);
        expect(mockStore.setUser).toHaveBeenCalledWith(response.user);
        expect(mockRouter.push).toHaveBeenCalledWith('/workspaces');
      });
    });
  });
});
