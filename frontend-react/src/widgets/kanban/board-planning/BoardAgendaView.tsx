'use client';

import type { Board } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { Box, Paper, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import TaskCard from '../TaskCard';
import {
  createAgendaGroups,
  getBoardPlanningTasks,
  type PlannedTask,
} from '../planning-utils';

interface BoardAgendaViewProps {
  board: Board;
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
  pendingTaskId?: string | null;
}

const renderTaskCards = (
  tasks: PlannedTask[],
  boardId: string,
  highlightedTaskId?: string | null,
  canEditBoardContent?: boolean,
  pendingTaskId?: string | null,
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
      isPending={pendingTaskId === task.id}
      showMoveAction={false}
    />
  ));

const BoardAgendaView = ({
  board,
  highlightedTaskId,
  canEditBoardContent,
  pendingTaskId,
}: BoardAgendaViewProps) => {
  const t = useTranslations('BoardPage');
  const dayjsLocale = useDayjsLocale();
  const tasks = getBoardPlanningTasks(board);
  const agenda = createAgendaGroups(tasks);

  const sections = [
    {
      key: 'overdue',
      title: t('mobile.agenda.overdue'),
      tasks: agenda.overdue,
      tone: 'error.main',
    },
    {
      key: 'today',
      title: t('mobile.agenda.today'),
      tasks: agenda.today,
      tone: 'primary.main',
    },
    ...agenda.upcoming.map((group) => ({
      key: `upcoming-${group.dateKey}`,
      title: dayjs(group.dateKey).locale(dayjsLocale).format('D MMM'),
      tasks: group.tasks,
    })),
    {
      key: 'no-due-date',
      title: t('mobile.agenda.noDueDate'),
      tasks: agenda.noDueDate,
    },
  ];

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 2 }}>
      <Stack spacing={1.5}>
        {sections.map((section) => (
          <Paper
            key={section.key}
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
                px: 1.5,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {section.title}
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ p: 1.25 }}>
              {section.tasks.length > 0 ? (
                renderTaskCards(
                  section.tasks,
                  board.id,
                  highlightedTaskId,
                  canEditBoardContent,
                  pendingTaskId,
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('mobile.agenda.empty')}
                </Typography>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default BoardAgendaView;
