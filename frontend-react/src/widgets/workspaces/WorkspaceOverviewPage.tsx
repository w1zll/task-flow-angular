'use client';

import { useBoards } from '@/shared/queries/boards.queries';
import { useMyWorkspaceTeams } from '@/shared/queries/teams.queries';
import {
  getWorkspaceTasksFromBoards,
  useWorkspaceBoardDetails,
} from '@/shared/queries/workspace-tasks.queries';
import { useWorkspaces } from '@/shared/queries/workspaces.queries';
import { useAuthStore } from '@/shared/store/root.store';
import { Box, Grid } from '@mui/material';
import { useMemo } from 'react';
import RecentBoardsPanel from './workspace-overview/RecentBoardsPanel';
import UpcomingTasksPanel from './workspace-overview/UpcomingTasksPanel';
import WorkspaceOverviewHeader from './workspace-overview/WorkspaceOverviewHeader';
import WorkspaceStatsGrid from './workspace-overview/WorkspaceStatsGrid';

interface Props {
  workspaceId: string;
}

const WorkspaceOverviewPage = ({ workspaceId }: Props) => {
  const user = useAuthStore((state) => state.user);
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useWorkspaces();
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const myTeams = useMyWorkspaceTeams(workspaceId);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const workspaceBoards = useMemo(
    () =>
      boards
        .filter((board) => board.workspaceId === workspaceId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime(),
        ),
    [boards, workspaceId],
  );
  const boardDetailQueries = useWorkspaceBoardDetails(
    workspaceId,
    workspaceBoards,
  );
  const boardDetails = boardDetailQueries
    .map((query) => query.data)
    .filter((board): board is NonNullable<typeof board> => Boolean(board));
  const myTasks = getWorkspaceTasksFromBoards(boardDetails)
    .filter(
      (task) =>
        !task.isCompleted &&
        (task.assigneeId === user?.id || task.assignee?.id === user?.id),
    )
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);
  const isTaskLoading = boardDetailQueries.some((query) => query.isLoading);
  const isLoading = workspacesLoading || boardsLoading;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1180,
        minWidth: 0,
        boxSizing: 'border-box',
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, sm: 4 },
      }}
    >
      <WorkspaceOverviewHeader workspace={workspace} workspaceId={workspaceId} />

      <WorkspaceStatsGrid
        boardsCount={workspaceBoards.length}
        myTeamsCount={myTeams.data?.length ?? 0}
        openMyTasksCount={myTasks.length}
        isLoading={isLoading}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <RecentBoardsPanel
            workspaceId={workspaceId}
            boards={workspaceBoards}
            isLoading={boardsLoading}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <UpcomingTasksPanel
            workspaceId={workspaceId}
            tasks={myTasks}
            isLoading={isTaskLoading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkspaceOverviewPage;
