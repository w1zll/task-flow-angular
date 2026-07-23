import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type OAuthProvider } from '@/shared/api/api';
import { useAuthStore } from '@/shared/store/root.store';
import { queryKeys } from './board-query-keys';

export const authQueryKeys = {
  sessions: ['auth', 'sessions'] as const,
  providers: ['auth', 'providers'] as const,
  methods: ['auth', 'methods'] as const,
};

export const useOAuthProviders = () =>
  useQuery({
    queryKey: authQueryKeys.providers,
    queryFn: () => authApi.getProviders().then((response) => response.data),
    staleTime: 5 * 60_000,
    retry: 1,
  });

export const useAuthMethods = () =>
  useQuery({
    queryKey: authQueryKeys.methods,
    queryFn: () => authApi.getMethods().then((response) => response.data),
    staleTime: 30_000,
  });

export const useUnlinkProvider = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: OAuthProvider) => authApi.unlinkProvider(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: authQueryKeys.methods }),
  });
};

export const useSessions = () => {
  return useQuery({
    queryKey: authQueryKeys.sessions,
    queryFn: () => authApi.getSessions().then((r) => r.data),
    staleTime: 60_000,
  });
};

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: authQueryKeys.sessions }),
  });
};

export const useRevokeOtherSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: authQueryKeys.sessions }),
  });
};

export const useUpdateAvatar = () => {
  const qc = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (file: File) => authApi.updateAvatar(file).then((r) => r.data),
    onSuccess: (user) => {
      setUser(user);
      void qc.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useResetAvatar = () => {
  const qc = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => authApi.resetAvatar().then((r) => r.data),
    onSuccess: (user) => {
      setUser(user);
      void qc.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};
