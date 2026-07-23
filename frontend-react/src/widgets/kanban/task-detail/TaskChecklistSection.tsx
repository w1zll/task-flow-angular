'use client';

import type { Board, BoardMember, Task, TaskChecklistItem } from '@/shared/api/api';
import {
  useCreateTaskChecklistItem,
  useDeleteTaskChecklistItem,
  useReorderTaskChecklistItems,
  useUpdateTaskChecklistItem,
} from '@/shared/queries/boards.queries';
import UserSelectOption from '@/shared/ui/UserSelectOption';
import {
  AddRounded,
  DeleteOutlineRounded,
  KeyboardArrowDownRounded,
  KeyboardArrowUpRounded,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';

interface TaskChecklistSectionProps {
  task: Task;
  board: Board;
  canEdit: boolean;
}

interface ChecklistRowProps {
  item: TaskChecklistItem;
  board: Board;
  members: BoardMember[];
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (itemId: string, direction: -1 | 1) => void;
}

type ChecklistItemUpdate = {
  title?: string;
  isDone?: boolean;
  order?: number;
  assigneeId?: string | null;
};

const uniqueMembers = (members?: BoardMember[]) => {
  const seen = new Set<string>();
  return (members ?? []).filter((member) => {
    if (seen.has(member.userId)) return false;
    seen.add(member.userId);
    return true;
  });
};

const sortChecklistItems = (items?: TaskChecklistItem[]) =>
  [...(items ?? [])].sort((a, b) => a.order - b.order);

const ChecklistRow = ({
  item,
  board,
  members,
  canEdit,
  isFirst,
  isLast,
  onMove,
}: ChecklistRowProps) => {
  const t = useTranslations('TaskDetail');
  const { enqueueSnackbar } = useSnackbar();
  const updateItem = useUpdateTaskChecklistItem();
  const deleteItem = useDeleteTaskChecklistItem();
  const [title, setTitle] = useState(item.title);
  const isPending = updateItem.isPending || deleteItem.isPending;

  useEffect(() => {
    setTitle(item.title);
  }, [item.title]);

  const update = (data: ChecklistItemUpdate) => {
    updateItem.mutate(
      {
        taskId: item.taskId,
        itemId: item.id,
        boardId: board.id,
        data,
      },
      {
        onError: () =>
          enqueueSnackbar(t('checklistUpdateError'), { variant: 'error' }),
      },
    );
  };

  const commitTitle = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      return;
    }
    update({ title: trimmed });
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'auto minmax(0, 1fr) auto',
          sm: 'auto minmax(0, 1fr) 190px auto',
        },
        gap: 1,
        alignItems: 'center',
        py: 0.75,
      }}
    >
      <Checkbox
        size="small"
        checked={item.isDone}
        disabled={!canEdit || isPending}
        onChange={(event) => update({ isDone: event.target.checked })}
        slotProps={{ input: { 'aria-label': t('toggleChecklistItem') } }}
      />

      <TextField
        size="small"
        value={title}
        disabled={!canEdit || isPending}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        sx={{
          '& .MuiInputBase-input': {
            textDecoration: item.isDone ? 'line-through' : 'none',
            color: item.isDone ? 'text.secondary' : 'text.primary',
          },
        }}
      />

      <Select
        size="small"
        value={item.assigneeId ?? ''}
        disabled={!canEdit || isPending}
        onChange={(event) =>
          update({ assigneeId: (event.target.value as string) || null })
        }
        displayEmpty
        renderValue={(value) => {
          const member = members.find((option) => option.userId === value);
          return member ? (
            <UserSelectOption
              name={member.user.name}
              avatar={member.user.avatar}
              avatarSize={22}
            />
          ) : (
            t('unassigned')
          );
        }}
        sx={{ display: { xs: 'none', sm: 'flex' } }}
      >
        <MenuItem value="">{t('unassigned')}</MenuItem>
        {members.map((member) => (
          <MenuItem key={member.userId} value={member.userId}>
            <UserSelectOption
              name={member.user.name}
              avatar={member.user.avatar}
              avatarSize={22}
            />
          </MenuItem>
        ))}
      </Select>

      <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title={t('moveChecklistItemUp')}>
          <span>
            <IconButton
              size="small"
              disabled={!canEdit || isPending || isFirst}
              onClick={() => onMove(item.id, -1)}
              aria-label={t('moveChecklistItemUp')}
            >
              <KeyboardArrowUpRounded fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('moveChecklistItemDown')}>
          <span>
            <IconButton
              size="small"
              disabled={!canEdit || isPending || isLast}
              onClick={() => onMove(item.id, 1)}
              aria-label={t('moveChecklistItemDown')}
            >
              <KeyboardArrowDownRounded fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('deleteChecklistItem')}>
          <span>
            <IconButton
              size="small"
              disabled={!canEdit || isPending}
              onClick={() =>
                deleteItem.mutate(
                  {
                    taskId: item.taskId,
                    itemId: item.id,
                    boardId: board.id,
                  },
                  {
                    onError: () =>
                      enqueueSnackbar(t('checklistDeleteError'), {
                        variant: 'error',
                      }),
                  },
                )
              }
              aria-label={t('deleteChecklistItem')}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

const TaskChecklistSection = ({
  task,
  board,
  canEdit,
}: TaskChecklistSectionProps) => {
  const t = useTranslations('TaskDetail');
  const { enqueueSnackbar } = useSnackbar();
  const createItem = useCreateTaskChecklistItem();
  const reorderItems = useReorderTaskChecklistItems();
  const [title, setTitle] = useState('');
  const items = useMemo(
    () => sortChecklistItems(task.checklistItems),
    [task.checklistItems],
  );
  const members = useMemo(() => uniqueMembers(board.members), [board.members]);
  const completedCount = items.filter((item) => item.isDone).length;
  const progress = items.length ? (completedCount / items.length) * 100 : 0;
  const canSubmit = canEdit && title.trim().length > 0 && !createItem.isPending;

  const handleAdd = () => {
    if (!canSubmit) return;
    createItem.mutate(
      {
        taskId: task.id,
        title,
        boardId: board.id,
      },
      {
        onSuccess: () => setTitle(''),
        onError: () =>
          enqueueSnackbar(t('checklistCreateError'), { variant: 'error' }),
      },
    );
  };

  const handleMove = (itemId: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;

    const nextIds = items.map((item) => item.id);
    [nextIds[index], nextIds[targetIndex]] = [
      nextIds[targetIndex],
      nextIds[index],
    ];
    reorderItems.mutate(
      {
        taskId: task.id,
        itemIds: nextIds,
        boardId: board.id,
      },
      {
        onError: () =>
          enqueueSnackbar(t('checklistUpdateError'), { variant: 'error' }),
      },
    );
  };

  return (
    <Stack spacing={1.25}>
      <Divider />
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('checklist')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {completedCount}/{items.length}
        </Typography>
      </Stack>

      {items.length > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 6, borderRadius: 1 }}
        />
      )}

      <Stack spacing={0.25}>
        {items.map((item, index) => (
          <ChecklistRow
            key={item.id}
            item={item}
            board={board}
            members={members}
            canEdit={canEdit}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onMove={handleMove}
          />
        ))}
      </Stack>

      {canEdit ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            fullWidth
            label={t('newChecklistItem')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAdd();
              }
            }}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Button
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={handleAdd}
            disabled={!canSubmit}
            sx={{ flexShrink: 0 }}
          >
            {t('add')}
          </Button>
        </Stack>
      ) : !items.length ? (
        <Typography variant="body2" color="text.secondary">
          {t('checklistEmpty')}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default TaskChecklistSection;
