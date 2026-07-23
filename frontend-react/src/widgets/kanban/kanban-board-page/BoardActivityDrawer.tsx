'use client';

import {
  CloseRounded,
  HistoryOutlined,
  OpenInNewRounded,
} from '@mui/icons-material';
import { BoardActivity } from '@/shared/api/api';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useDayjsLocale } from '@/shared/lib/useDayjsLocale';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';

interface BoardActivityDrawerProps {
  open: boolean;
  activities?: BoardActivity[];
  isLoading: boolean;
  isError: boolean;
  existingTaskIds?: Set<string>;
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
}

type ActivityChange = {
  field?: unknown;
  from?: unknown;
  to?: unknown;
};

type ActivityTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const getMetadataString = (
  metadata: Record<string, unknown>,
  key: string,
) => {
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

const getActivityChanges = (
  metadata: Record<string, unknown>,
): ActivityChange[] =>
  Array.isArray(metadata.changes)
    ? metadata.changes.filter(
        (item): item is ActivityChange =>
          typeof item === 'object' && item !== null,
    )
    : [];

const getActivityTaskId = (activity: BoardActivity) => {
  const metadata = activity.metadata ?? {};
  const metadataTaskId = getMetadataString(metadata, 'taskId');
  if (metadataTaskId) return metadataTaskId;

  return activity.entityType === 'task' ? activity.entityId : null;
};

const formatRole = (
  role: unknown,
  t: ActivityTranslator,
) => {
  switch (role) {
    case 'owner':
      return t('roleOwner');
    case 'editor':
      return t('roleEditor');
    case 'viewer':
      return t('roleViewer');
    default:
      return t('activitySubtitle.unknownRole');
  }
};

const formatActivityField = (
  field: unknown,
  t: ActivityTranslator,
) => {
  switch (field) {
    case 'title':
      return t('activityFields.title');
    case 'description':
      return t('activityFields.description');
    case 'priority':
      return t('activityFields.priority');
    case 'labels':
      return t('activityFields.labels');
    case 'dueDate':
      return t('activityFields.dueDate');
    case 'assignee':
      return t('activityFields.assignee');
    case 'team':
      return t('activityFields.team');
    case 'isCompleted':
      return t('activityFields.isCompleted');
    case 'completedAt':
      return t('activityFields.completedAt');
    case 'estimateMinutes':
      return t('activityFields.estimateMinutes');
    case 'storyPoints':
      return t('activityFields.storyPoints');
    case 'checklist':
      return t('activityFields.checklist');
    case 'checklistOrder':
      return t('activityFields.checklistOrder');
    case 'attachment':
      return t('activityFields.attachment');
    case 'order':
      return t('activityFields.order');
    case 'color':
      return t('activityFields.color');
    default:
      return typeof field === 'string' ? field : t('activityFields.unknown');
  }
};

const formatActivityValue = (
  field: unknown,
  value: unknown,
  t: ActivityTranslator,
) => {
  if (value === null || value === undefined || value === '') {
    return t('activityValues.empty');
  }

  if (typeof value === 'boolean') {
    return value ? t('activityValues.yes') : t('activityValues.no');
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : t('activityValues.empty');
  }

  if (typeof value === 'object') {
    const namedValue = value as {
      name?: unknown;
      title?: unknown;
      fileName?: unknown;
      id?: unknown;
    };
    if (typeof namedValue.name === 'string' && namedValue.name.trim()) {
      return namedValue.name;
    }
    if (typeof namedValue.title === 'string' && namedValue.title.trim()) {
      return namedValue.title;
    }
    if (
      typeof namedValue.fileName === 'string' &&
      namedValue.fileName.trim()
    ) {
      return namedValue.fileName;
    }
    if (typeof namedValue.id === 'string' && namedValue.id.trim()) {
      return namedValue.id;
    }
    return t('activityValues.empty');
  }

  if (typeof value === 'string') {
    if (field === 'priority') {
      switch (value) {
        case 'low':
          return t('activityPriority.low');
        case 'medium':
          return t('activityPriority.medium');
        case 'high':
          return t('activityPriority.high');
        case 'urgent':
          return t('activityPriority.urgent');
        default:
          return value;
      }
    }

    if (field === 'dueDate' || field === 'completedAt') {
      return dayjs(value).isValid()
        ? dayjs(value).format('DD.MM.YYYY')
        : value;
    }

    return value;
  }

  return String(value);
};

const formatActivityChanges = (
  changes: ActivityChange[],
  t: ActivityTranslator,
) =>
  changes
    .map((change) =>
      t('activityChange', {
        field: formatActivityField(change.field, t),
        from: formatActivityValue(change.field, change.from, t),
        to: formatActivityValue(change.field, change.to, t),
      }),
    )
    .join('; ');

const formatEventText = (
  event: BoardActivity['event'],
  t: ActivityTranslator,
) => {
  switch (event) {
    case 'board_created':
      return t('activityType.boardCreated');
    case 'board_updated':
      return t('activityType.boardUpdated');
    case 'board_member_invited':
      return t('activityType.boardMemberInvited');
    case 'board_member_role_changed':
      return t('activityType.boardMemberRoleChanged');
    case 'board_member_removed':
      return t('activityType.boardMemberRemoved');
    case 'task_created':
      return t('activityType.taskCreated');
    case 'task_updated':
      return t('activityType.taskUpdated');
    case 'task_completed':
      return t('activityType.taskCompleted');
    case 'task_moved':
      return t('activityType.taskMoved');
    case 'task_reordered':
      return t('activityType.taskReordered');
    case 'task_deleted':
      return t('activityType.taskDeleted');
    case 'column_created':
      return t('activityType.columnCreated');
    case 'column_updated':
      return t('activityType.columnUpdated');
    case 'column_reordered':
      return t('activityType.columnReordered');
    case 'column_deleted':
      return t('activityType.columnDeleted');
    default:
      return t('activityType.unknown');
  }
};

const getActivitySubtitle = (
  activity: BoardActivity,
  t: ActivityTranslator,
) => {
  const actor = activity.actorUser?.name ?? t('activitySystem');
  const metadata = activity.metadata ?? {};
  const title = getMetadataString(metadata, 'title');
  const memberName = getMetadataString(metadata, 'memberName');
  const columnTitle = getMetadataString(metadata, 'columnTitle');
  const changes = getActivityChanges(metadata);
  const formattedChanges = formatActivityChanges(changes, t);

  if (activity.event === 'board_member_invited') {
    return t('activitySubtitle.invited', {
      actor,
      member: memberName ?? t('activityValues.unknownMember'),
      role: formatRole(metadata.role, t),
    });
  }

  if (activity.event === 'board_member_role_changed') {
    return t('activitySubtitle.roleChanged', {
      actor,
      member: memberName ?? t('activityValues.unknownMember'),
      previousRole: formatRole(metadata.previousRole, t),
      role: formatRole(metadata.role, t),
    });
  }

  if (activity.event === 'board_member_removed') {
    return t('activitySubtitle.removed', {
      actor,
      member: memberName ?? t('activityValues.unknownMember'),
    });
  }

  if (activity.event === 'task_moved') {
    return t('activitySubtitle.moved', {
      actor,
      title: title ?? t('activityValues.unknownTask'),
      from: getMetadataString(metadata, 'fromColumnTitle') ?? t('activityValues.unknownColumn'),
      to: getMetadataString(metadata, 'toColumnTitle') ?? t('activityValues.unknownColumn'),
    });
  }

  if (activity.event === 'task_completed') {
    return t('activitySubtitle.completed', {
      actor,
      title: title ?? t('activityValues.unknownTask'),
      changes: formattedChanges,
    });
  }

  if (activity.event === 'task_updated' && changes.length) {
    return t('activitySubtitle.changed', {
      actor,
      title: title ?? t('activityValues.unknownTask'),
      changes: formattedChanges,
    });
  }

  if (activity.event === 'board_updated' && changes.length) {
    return t('activitySubtitle.boardChanged', {
      actor,
      changes: formattedChanges,
    });
  }

  if (activity.event === 'column_updated' && changes.length) {
    return t('activitySubtitle.changed', {
      actor,
      title: title ?? t('activityValues.unknownColumn'),
      changes: formattedChanges,
    });
  }

  if (activity.event === 'task_reordered') {
    return t('activitySubtitle.taskReordered', {
      actor,
      column: columnTitle ?? t('activityValues.unknownColumn'),
    });
  }

  if (activity.event === 'column_reordered') {
    return t('activitySubtitle.columnReordered', { actor });
  }

  if (activity.event.startsWith('task_') || activity.event.startsWith('column_')) {
    if (title) return `${actor} · ${title}`;

    return actor;
  }

  return actor;
};

const BoardActivityDrawer = ({
  open,
  activities,
  isLoading,
  isError,
  existingTaskIds,
  onClose,
  onOpenTask,
}: BoardActivityDrawerProps) => {
  const t = useTranslations('BoardPage');
  const activityT: ActivityTranslator = (key, values) =>
    t(key as never, values as never);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    defaultMatches: false,
  });
  const dayjsLocale = useDayjsLocale();
  const titleId = 'board-activity-drawer-title';
  const deletedTaskIds = new Set(
    (activities ?? [])
      .filter((activity) => activity.event === 'task_deleted')
      .map(getActivityTaskId)
      .filter((taskId): taskId is string => Boolean(taskId)),
  );

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          sx: {
            width: isMobile ? '100%' : 360,
            height: isMobile ? '100%' : 'auto',
            bgcolor: 'background.paper',
            borderLeft: isMobile ? 'none' : '1px solid',
            borderTop: isMobile ? '1px solid' : 'none',
            borderColor: 'divider',
            overflowY: 'auto',
          },
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryOutlined fontSize="small" />
            <Typography id={titleId} variant="h6" sx={{ fontWeight: 700 }}>
              {t('activity')}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t('closePanel')}
            sx={{ width: { xs: 44, sm: 32 }, height: { xs: 44, sm: 32 } }}
          >
            <CloseRounded fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {t('activityDescription')}
        </Typography>

        <Divider />

        {isLoading ? (
          <Stack spacing={1}>
            {[...Array(4)].map((_, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : isError ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="error">
              {t('activityError')}
            </Typography>
          </Box>
        ) : !activities?.length ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('noActivity')}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {activities.map((activity) => {
              const taskId = getActivityTaskId(activity);
              const canOpenTask =
                Boolean(taskId) &&
                activity.event !== 'task_deleted' &&
                activity.event.startsWith('task_') &&
                Boolean(existingTaskIds?.has(taskId ?? '')) &&
                !deletedTaskIds.has(taskId ?? '') &&
                Boolean(onOpenTask);

              return (
              <Box key={activity.id}>
                <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                  <ListItemAvatar>
                    <Avatar
                      src={activity.actorUser?.avatar ?? undefined}
                      alt={activity.actorUser?.name ?? undefined}
                    >
                      {activity.actorUser?.name
                        ? activity.actorUser.name
                            .split(/\s+/)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : 'A'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={formatEventText(activity.event, activityT)}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {getActivitySubtitle(activity, activityT)}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {dayjs(activity.createdAt)
                            .locale(dayjsLocale)
                            .format('D MMM YYYY, HH:mm')}
                        </Typography>
                        {canOpenTask && taskId && (
                          <Button
                            size="small"
                            startIcon={<OpenInNewRounded fontSize="small" />}
                            onClick={() => onOpenTask?.(taskId)}
                            sx={{
                              mt: 0.75,
                              px: 0,
                              minWidth: 0,
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                            }}
                          >
                            {t('activityOpenTask')}
                          </Button>
                        )}
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default BoardActivityDrawer;
