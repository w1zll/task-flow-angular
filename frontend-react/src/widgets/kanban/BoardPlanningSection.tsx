'use client';

import type { Board, Team } from '@/shared/api/api';
import { useBoardSocket } from '@/shared/hooks/useBoardSocket';
import { useMediaQuery, useTheme, Box, Skeleton, Stack } from '@mui/material';
import { useMemo } from 'react';
import type { BoardLayout } from './board-layout';
import BoardAgendaView from './board-planning/BoardAgendaView';
import BoardCalendarView from './board-planning/BoardCalendarView';
import BoardRoadmapView from './board-planning/BoardRoadmapView';
import BoardTimelineView from './board-planning/BoardTimelineView';

interface BoardPlanningSectionProps {
  boardId: string;
  layout: BoardLayout;
  board?: Board;
  filteredBoard?: Board;
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
  teams?: Team[];
}

const BoardPlanningSection = ({
  boardId,
  layout,
  board,
  filteredBoard,
  highlightedTaskId,
  canEditBoardContent,
  teams,
}: BoardPlanningSectionProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });

  useBoardSocket(boardId);

  const planningBoard = useMemo(
    () => filteredBoard ?? board,
    [board, filteredBoard],
  );

  if (!planningBoard) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', p: 2 }}>
        <Stack spacing={1.5}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={140} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (layout === 'calendar') {
    return isMobile ? (
      <BoardAgendaView
        board={planningBoard}
        highlightedTaskId={highlightedTaskId}
        canEditBoardContent={canEditBoardContent}
      />
    ) : (
      <BoardCalendarView
        board={planningBoard}
        highlightedTaskId={highlightedTaskId}
        canEditBoardContent={canEditBoardContent}
      />
    );
  }

  if (layout === 'timeline') {
    return (
      <BoardTimelineView
        board={planningBoard}
        highlightedTaskId={highlightedTaskId}
        canEditBoardContent={canEditBoardContent}
      />
    );
  }

  if (layout === 'roadmap') {
    return (
      <BoardRoadmapView
        board={planningBoard}
        teams={teams}
        highlightedTaskId={highlightedTaskId}
        canEditBoardContent={canEditBoardContent}
      />
    );
  }

  return null;
};

export default BoardPlanningSection;
