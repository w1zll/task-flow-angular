'use client';

import type { Board } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { Box, Paper, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import TaskCard from '../TaskCard';
import {
  createRollingWeeks,
  getBoardPlanningTasks,
  groupTasksByWeek,
  toWeekKey,
  type PlannedTask,
} from '../planning-utils';

interface BoardTimelineViewProps {
  board: Board;
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

const BoardTimelineView = ({
  board,
  highlightedTaskId,
  canEditBoardContent,
}: BoardTimelineViewProps) => {
  const t = useTranslations('BoardPage');
  const dayjsLocale = useDayjsLocale();
  const tasks = getBoardPlanningTasks(board);
  const weeks = useMemo(
    () => createRollingWeeks(dayjs(), 6, dayjsLocale),
    [dayjsLocale],
  );
  const weekKeys = useMemo(
    () => weeks.map((week) => toWeekKey(week, dayjsLocale)),
    [dayjsLocale, weeks],
  );
  const tasksByWeek = useMemo(
    () => groupTasksByWeek(tasks, weekKeys, dayjsLocale),
    [dayjsLocale, tasks, weekKeys],
  );

  if (!board.columns?.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">{t('timeline.empty')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
      <Box sx={{ minWidth: 1280 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '240px repeat(6, minmax(180px, 1fr))',
            gap: 1,
            mb: 1,
          }}
        >
          <Box />
          {weeks.map((week) => (
            <Box key={week.toISOString()} sx={{ px: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {week.format('D MMM')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {week.add(6, 'day').format('D MMM')}
              </Typography>
            </Box>
          ))}
        </Box>

        <Stack spacing={1}>
          {(board.columns ?? []).map((column) => (
            <Paper
              key={column.id}
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
                    {column.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {column.tasks?.length ?? 0}
                  </Typography>
                </Box>

                {weeks.map((week) => {
                  const weekKey = toWeekKey(week, dayjsLocale);
                  const rowTasks =
                    tasksByWeek[column.id]?.[weekKey] ?? [];

                  return (
                    <Box
                      key={`${column.id}-${weekKey}`}
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
                          {t('timeline.emptyCell')}
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

export default BoardTimelineView;
