import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '../api/api';
import { ApiBody } from '../api/types';
import { queryKeys } from './board-query-keys';

export const useWorkspaceTeams = (
  workspaceId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.workspaceTeams(workspaceId),
    queryFn: () =>
      teamsApi.getAll(workspaceId).then((response) => response.data),
    enabled: enabled && !!workspaceId,
    staleTime: 60_000,
  });

export const useMyWorkspaceTeams = (
  workspaceId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.myWorkspaceTeams(workspaceId),
    queryFn: () =>
      teamsApi.getMine(workspaceId).then((response) => response.data),
    enabled: enabled && !!workspaceId,
    staleTime: 60_000,
  });

export const useCreateTeam = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: ApiBody<'/api/workspaces/{workspaceId}/teams', 'post'>,
    ) => teamsApi.create(workspaceId, data).then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myWorkspaceTeams(workspaceId),
      });
    },
  });
};

export const useUpdateTeam = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: ApiBody<
        '/api/workspaces/{workspaceId}/teams/{teamId}',
        'patch'
      >;
    }) =>
      teamsApi
        .update(workspaceId, teamId, data)
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myWorkspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceAnalytics(workspaceId),
      });
    },
  });
};

export const useDeleteTeam = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => teamsApi.remove(workspaceId, teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myWorkspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceAnalytics(workspaceId),
      });
    },
  });
};

export const useAddTeamMember = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      userId,
    }: {
      teamId: string;
      userId: string;
    }) =>
      teamsApi
        .addMember(workspaceId, teamId, userId)
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myWorkspaceTeams(workspaceId),
      });
    },
  });
};

export const useRemoveTeamMember = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      memberId,
    }: {
      teamId: string;
      memberId: string;
    }) => teamsApi.removeMember(workspaceId, teamId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceTeams(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.myWorkspaceTeams(workspaceId),
      });
    },
  });
};

export const useTeamTasks = (
  workspaceId: string,
  teamId: string,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.teamTasks(workspaceId, teamId),
    queryFn: () =>
      teamsApi
        .getTasks(workspaceId, teamId)
        .then((response) => response.data),
    enabled: enabled && !!workspaceId && !!teamId,
  });
