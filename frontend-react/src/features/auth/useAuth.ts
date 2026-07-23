'use client';

import {
  authApi,
  type RegisterPayload,
  workspaceInvitesApi,
} from '@/shared/api/api';
import {
  clearPendingWorkspaceInvite,
  getPendingWorkspaceInvite,
} from '@/shared/lib/pending-workspace-invite';
import { isBrowserOffline } from '@/shared/lib/offline';
import { clearOfflineApplicationCaches } from '@/shared/lib/offline-navigation-cache';
import { clearPersistedQueryCache } from '@/shared/lib/query-persistence';
import { useAuthStore } from '@/shared/store/root.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

export const useAuth = () => {
  const authStore = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [isCompletingInvite, setIsCompletingInvite] = useState(false);

  const getPostAuthPath = (workspaceId?: string | null) =>
    workspaceId ? `/workspaces/${workspaceId}` : '/workspaces';

  const finishAuthentication = async (user: typeof authStore.user) => {
    await clearOfflineApplicationCaches();
    await clearPersistedQueryCache();
    queryClient.clear();
    authStore.setUser(user);
    const inviteToken = getPendingWorkspaceInvite();

    if (!inviteToken) {
      router.push(getPostAuthPath(user?.activeWorkspaceId));
      router.refresh();
      return;
    }

    setIsCompletingInvite(true);
    try {
      const workspace = (
        await workspaceInvitesApi.accept(inviteToken)
      ).data;
      authStore.setActiveWorkspace(workspace.id);
      clearPendingWorkspaceInvite();
      router.push(getPostAuthPath(workspace.id));
      router.refresh();
    } catch {
      router.push(`/invite/${encodeURIComponent(inviteToken)}`);
      router.refresh();
    } finally {
      setIsCompletingInvite(false);
    }
  };

  const clearClientSession = async () => {
    queryClient.clear();
    await clearOfflineApplicationCaches();
    await clearPersistedQueryCache();
    authStore.logout();
    router.push('/auth/login');
    router.refresh();
  };

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      authApi.login(data).then((r) => r.data),
    onSuccess: ({ user }) => {
      void finishAuthentication(user);
    },
    onError: (err: any) =>
      enqueueSnackbar(err.response?.data?.message || 'Login failed', {
        variant: 'error',
      }),
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterPayload) =>
      authApi.register(data).then((r) => r.data),
    onSuccess: ({ user }) => {
      void finishAuthentication(user);
    },
    onError: (err: any) => {
      enqueueSnackbar(err.response?.data?.message || 'Registration failed', {
        variant: 'error',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      void clearClientSession();
    },
    onError: () => {
      if (isBrowserOffline()) {
        void clearClientSession();
      }
    },
  });

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending || isCompletingInvite,
    isRegisterLoading: registerMutation.isPending || isCompletingInvite,
    finishAuthentication,
  };
};
