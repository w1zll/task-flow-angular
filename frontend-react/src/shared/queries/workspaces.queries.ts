import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { demoApi, workspaceInvitesApi, workspacesApi } from '../api/api';
import { clearOfflineApplicationCaches } from '../lib/offline-navigation-cache';
import { clearPersistedQueryCache } from '../lib/query-persistence';
import { ApiBody } from '../api/types';
import { queryKeys } from './board-query-keys';

export const useWorkspaces = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: () => workspacesApi.getAll().then((response) => response.data),
    enabled,
    staleTime: 60_000,
  });

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      workspacesApi.create({ name }).then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => workspacesApi.remove(workspaceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useSwitchWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspacesApi
        .switchActive(workspaceId)
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useWorkspaceMembers = (
  workspaceId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.workspaceMembers(workspaceId),
    queryFn: () =>
      workspacesApi
        .getMembers(workspaceId)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId,
    staleTime: 0,
  });

export const useUpdateWorkspaceMemberRole = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      role,
    }: {
      memberId: string;
      role: 'admin' | 'member';
    }) =>
      workspacesApi
        .updateMemberRole(workspaceId, memberId, role)
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
};

export const useRemoveWorkspaceMember = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceMembers(workspaceId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useWorkspaceInvites = (
  workspaceId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.workspaceInvites(workspaceId),
    queryFn: () =>
      workspacesApi
        .getInvites(workspaceId)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId,
  });

export const useCreateWorkspaceInvite = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: ApiBody<'/api/workspaces/{workspaceId}/invites', 'post'>,
    ) =>
      workspacesApi
        .createInvite(workspaceId, data)
        .then((response) => response.data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceInvites(workspaceId),
      }),
  });
};

export const useRevokeWorkspaceInvite = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      workspacesApi.revokeInvite(workspaceId, inviteId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceInvites(workspaceId),
      }),
  });
};

export const useWorkspaceInvitePreview = (token: string) =>
  useQuery({
    queryKey: queryKeys.workspaceInvitePreview(token),
    queryFn: () =>
      workspaceInvitesApi.preview(token).then((response) => response.data),
    enabled: !!token,
    retry: false,
  });

export const useAcceptWorkspaceInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      workspaceInvitesApi.accept(token).then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
    },
  });
};

export const useRegisterFromDemoInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      demoApi.registerFromInvite(token).then((response) => response.data),
    onSuccess: async () => {
      await clearOfflineApplicationCaches();
      await clearPersistedQueryCache();
      queryClient.clear();
    },
  });
};
