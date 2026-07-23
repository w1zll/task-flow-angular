'use client';

import type { Board, Team } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { Box, Paper, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import TaskCard from '../TaskCard';
import {
  NO_TEAM_ROW_ID,
  countTasksWithoutDueDate,
  createRollingMonths,
  getBoardPlanningTasks,
  getRoadmapTeamRows,
  groupTasksByTeamAndMonth,
  toMonthKey,
  type PlannedTask,
} from '../planning-utils';

interface BoardRoadmapViewProps {
  board: Board;
  teams?: Team[];
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
}

const renderTaskCards = (
  tasks: PlannedTask[],
  boardId: string,
  highlightedTaskId?: string | null,
  canEditBoardContent?: boolean,
) =>
  tasks.map((task, index) => (
    <TaskCard
      key={task.id}
      task={task}
      index={index}
      boardId={boardId}
      dragMode="static"
      canEdit={canEditBoardContent}
      isHighlighted={task.id === highlightedTaskId}
      showMoveAction={false}
    />
  ));

const BoardRoadmapView = ({
  board,
  teams,
  highlightedTaskId,
  canEditBoardContent,
}: BoardRoadmapViewProps) => {
  const t = useTranslations('BoardPage');
  const dayjsLocale = useDayjsLocale();
  const tasks = getBoardPlanningTasks(board);
  const months = useMemo(() => createRollingMonths(dayjs(), 6), []);
  const monthKeys = useMemo(
    () => months.map((month) => toMonthKey(month)),
    [months],
  );
  const rows = useMemo(
    () => getRoadmapTeamRows(tasks, teams ?? []),
    [teams, tasks],
  );
  const tasksByMonth = useMemo(
    () => groupTasksByTeamAndMonth(tasks, monthKeys),
    [monthKeys, tasks],
  );
  const hiddenTaskCount = countTasksWithoutDueDate(tasks);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
      <Box sx={{ minWidth: 1280 }}>
        {hiddenTaskCount > 0 && (
          <Paper
            elevation={0}
            sx={{
              mb: 1.5,
              px: 1.5,
              py: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('roadmap.hiddenDueDate', { count: hiddenTaskCount })}
            </Typography>
          </Paper>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '240px repeat(6, minmax(180px, 1fr))',
            gap: 1,
            mb: 1,
          }}
        >
          <Box />
          {months.map((month) => (
            <Box key={month.toISOString()} sx={{ px: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {month.locale(dayjsLocale).format('MMM YYYY')}
              </Typography>
            </Box>
          ))}
        </Box>

        <Stack spacing={1}>
          {rows.map((row) => (
            <Paper
              key={row.id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '240px repeat(6, minmax(180px, 1fr))',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {row.id === NO_TEAM_ROW_ID ? t('roadmap.noTeam') : row.title}
                  </Typography>
                </Box>

                {months.map((month) => {
                  const monthKey = toMonthKey(month);
                  const rowTasks =
                    tasksByMonth[row.id]?.[monthKey] ?? [];

                  return (
                    <Box
                      key={`${row.id}-${monthKey}`}
                      sx={{
                        minHeight: 140,
                        p: 1,
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      {rowTasks.length > 0 ? (
                        renderTaskCards(
                          rowTasks,
                          board.id,
                          highlightedTaskId,
                          canEditBoardContent,
                        )
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {t('roadmap.emptyCell')}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default BoardRoadmapView;
