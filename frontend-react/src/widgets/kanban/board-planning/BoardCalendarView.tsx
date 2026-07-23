'use client';

import type { Board } from '@/shared/api/api';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import {
  ChevronLeftOutlined,
  ChevronRightOutlined,
  TodayOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import TaskCard from '../TaskCard';
import {
  NO_DUE_DATE_DROP_ID,
  createCalendarMonthDays,
  createCalendarWeekDays,
  getBoardPlanningTasks,
  groupTasksByDueDate,
  toDateKey,
  type PlannedTask,
} from '../planning-utils';
import { useTaskDueDateUpdater } from './useTaskDueDateUpdater';

type CalendarMode = 'week' | 'month';

interface BoardCalendarViewProps {
  board: Board;
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
}

const chunkDays = (days: Dayjs[]) => {
  const chunks: Dayjs[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    chunks.push(days.slice(index, index + 7));
  }
  return chunks;
};

const capitalizeCalendarTitle = (value: string, locale: string) =>
  value ? value.charAt(0).toLocaleUpperCase(locale) + value.slice(1) : value;

const formatCalendarMonthTitle = (date: Dayjs, locale: string) =>
  capitalizeCalendarTitle(date.locale(locale).format('MMMM YYYY'), locale);

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
      dragMode="dnd"
      canEdit={canEditBoardContent}
      isPending={pendingTaskId === task.id}
      isHighlighted={task.id === highlightedTaskId}
      showMoveAction={false}
    />
  ));

const CalendarDayCell = ({
  board,
  day,
  tasks,
  highlightedTaskId,
  canEditBoardContent,
  pendingTaskId,
  isCurrentMonth,
  isToday,
  emptyLabel,
}: {
  board: Board;
  day: Dayjs;
  tasks: PlannedTask[];
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
  pendingTaskId?: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  emptyLabel: string;
}) => {
  const dateKey = day.format('YYYY-MM-DD');

  return (
    <Paper
      elevation={0}
      sx={{
        minHeight: 150,
        border: '1px solid',
        borderColor: isToday ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: isCurrentMonth ? 'background.paper' : 'action.hover',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Stack spacing={0.1} sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, lineHeight: 1.1 }}
          >
            {day.format('D')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {day.format('dd')}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {tasks.length}
        </Typography>
      </Box>
      <Droppable droppableId={dateKey} type="TASK">
        {(provided, snapshot) => (
          <Stack
            ref={provided.innerRef}
            {...provided.droppableProps}
            spacing={1}
            sx={{
              p: 1,
              minHeight: 110,
              bgcolor: snapshot.isDraggingOver ? 'action.selected' : 'inherit',
            }}
          >
            {tasks.length > 0 ? (
              renderTaskCards(
                tasks,
                board.id,
                highlightedTaskId,
                canEditBoardContent,
                pendingTaskId,
              )
            ) : (
              <Typography variant="caption" color="text.secondary">
                {emptyLabel}
              </Typography>
            )}
            {provided.placeholder}
          </Stack>
        )}
      </Droppable>
    </Paper>
  );
};

const NoDueDateCell = ({
  board,
  tasks,
  highlightedTaskId,
  canEditBoardContent,
  pendingTaskId,
}: {
  board: Board;
  tasks: PlannedTask[];
  highlightedTaskId?: string | null;
  canEditBoardContent: boolean;
  pendingTaskId?: string | null;
}) => {
  const t = useTranslations('BoardPage');

  return (
    <Paper
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            minWidth: 0,
            overflowWrap: 'anywhere',
            textAlign: { xs: 'left', md: 'right' },
          }}
        >
          {t('calendar.noDueDate')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tasks.length}
        </Typography>
      </Box>
      <Droppable droppableId={NO_DUE_DATE_DROP_ID} type="TASK">
        {(provided, snapshot) => (
          <Stack
            ref={provided.innerRef}
            {...provided.droppableProps}
            spacing={1}
            sx={{
              p: 1.25,
              minHeight: 96,
              bgcolor: snapshot.isDraggingOver ? 'action.selected' : 'inherit',
            }}
          >
            {tasks.length > 0 ? (
              renderTaskCards(
                tasks,
                board.id,
                highlightedTaskId,
                canEditBoardContent,
                pendingTaskId,
              )
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('calendar.noDueDateEmpty')}
              </Typography>
            )}
            {provided.placeholder}
          </Stack>
        )}
      </Droppable>
    </Paper>
  );
};

const BoardCalendarView = ({
  board,
  highlightedTaskId,
  canEditBoardContent,
}: BoardCalendarViewProps) => {
  const t = useTranslations('BoardPage');
  const dayjsLocale = useDayjsLocale();
  const { pendingTaskId, updateTaskDueDate } = useTaskDueDateUpdater(board.id);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [anchor, setAnchor] = useState(() => dayjs().startOf('day'));
  const tasks = getBoardPlanningTasks(board);
  const grouped = useMemo(() => groupTasksByDueDate(tasks), [tasks]);
  const monthGridRows = useMemo(
    () => chunkDays(createCalendarMonthDays(anchor, dayjsLocale)),
    [anchor, dayjsLocale],
  );
  const weekDays = useMemo(
    () => createCalendarWeekDays(anchor, dayjsLocale),
    [anchor, dayjsLocale],
  );
  const weekdayLabels = useMemo(
    () =>
      createCalendarWeekDays(dayjs(), dayjsLocale).map((day) =>
        day.format('dd'),
      ),
    [dayjsLocale],
  );

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const nextDueDate =
      destination.droppableId === NO_DUE_DATE_DROP_ID
        ? null
        : destination.droppableId;
    const currentTask = tasks.find((task) => task.id === draggableId);
    if (!currentTask) return;
    if (toDateKey(currentTask.dueDate) === nextDueDate) return;

    await updateTaskDueDate({
      taskId: draggableId,
      dueDate: nextDueDate,
    });
  };

  const navigate = (direction: -1 | 1) => {
    setAnchor((current) =>
      mode === 'week'
        ? current.add(direction, 'week')
        : current.add(direction, 'month'),
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, nextMode: CalendarMode | null) => {
              if (nextMode) setMode(nextMode);
            }}
            aria-label={t('calendar.modeLabel')}
          >
            <ToggleButton value="week">{t('calendar.week')}</ToggleButton>
            <ToggleButton value="month">{t('calendar.month')}</ToggleButton>
          </ToggleButtonGroup>

          <Button size="small" onClick={() => navigate(-1)}>
            <ChevronLeftOutlined fontSize="small" />
            {t('calendar.previous')}
          </Button>
          <Button size="small" startIcon={<TodayOutlined />} onClick={() => setAnchor(dayjs().startOf('day'))}>
            {t('calendar.today')}
          </Button>
          <Button size="small" onClick={() => navigate(1)}>
            {t('calendar.next')}
            <ChevronRightOutlined fontSize="small" />
          </Button>
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {mode === 'week'
            ? `${weekDays[0].locale(dayjsLocale).format('D MMM')} - ${weekDays[6]
                .locale(dayjsLocale)
                .format('D MMM')}`
            : formatCalendarMonthTitle(anchor, dayjsLocale)}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Stack spacing={2}>
            {mode === 'week' ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(7, minmax(190px, 1fr))',
                  },
                  minWidth: { md: 1400 },
                }}
              >
                {weekDays.map((day) => {
                  const dayKey = day.format('YYYY-MM-DD');
                  return (
                    <CalendarDayCell
                      key={dayKey}
                      board={board}
                      day={day}
                      tasks={grouped.byDate[dayKey] ?? []}
                      highlightedTaskId={highlightedTaskId}
                      canEditBoardContent={canEditBoardContent}
                      pendingTaskId={pendingTaskId}
                      isCurrentMonth={true}
                      isToday={day.isSame(dayjs(), 'day')}
                      emptyLabel={t('calendar.emptyDay')}
                    />
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: 'repeat(7, minmax(190px, 1fr))',
                  minWidth: 1400,
                }}
              >
                {weekdayLabels.map((label) => (
                  <Box
                    key={label}
                    sx={{
                      px: 1,
                      py: 0.75,
                      color: 'text.secondary',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </Box>
                ))}

                {monthGridRows.map((week, weekIndex) =>
                  week.map((day) => {
                    const dayKey = day.format('YYYY-MM-DD');
                    const isCurrentMonth = day.month() === anchor.month();
                    return (
                      <CalendarDayCell
                        key={`${weekIndex}-${dayKey}`}
                        board={board}
                        day={day}
                        tasks={grouped.byDate[dayKey] ?? []}
                        highlightedTaskId={highlightedTaskId}
                        canEditBoardContent={canEditBoardContent}
                        pendingTaskId={pendingTaskId}
                        isCurrentMonth={isCurrentMonth}
                        isToday={day.isSame(dayjs(), 'day')}
                        emptyLabel={t('calendar.emptyDay')}
                      />
                    );
                  }),
                )}
              </Box>
            )}

            <NoDueDateCell
              board={board}
              tasks={grouped.noDueDate}
              highlightedTaskId={highlightedTaskId}
              canEditBoardContent={canEditBoardContent}
              pendingTaskId={pendingTaskId}
            />
          </Stack>
        </DragDropContext>
      </Box>
    </Box>
  );
};

export default BoardCalendarView;
