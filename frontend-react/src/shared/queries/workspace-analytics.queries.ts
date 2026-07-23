import { useQuery } from '@tanstack/react-query';
import {
  workspaceAnalyticsApi,
  type WorkspaceAnalyticsDashboard,
  type WorkspaceAnalyticsFilters,
} from '../api/api';
import { queryKeys } from './board-query-keys';

export type { WorkspaceAnalyticsFilters, WorkspaceAnalyticsDashboard };

export const useWorkspaceAnalyticsDashboard = (
  workspaceId: string,
  filters: WorkspaceAnalyticsFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.workspaceAnalytics(workspaceId, filters),
    queryFn: () =>
      workspaceAnalyticsApi
        .dashboard(workspaceId, {
          boardId: filters.boardId || undefined,
          teamId: filters.teamId || undefined,
          assigneeId: filters.assigneeId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        })
        .then((response) => response.data),
    enabled: enabled && !!workspaceId,
    staleTime: 120_000,
    placeholderData: (previous) => previous,
  });
