'use client';

import type { AppNotification } from '@/shared/api/api';
import { useNotificationSocket } from '@/shared/hooks/useNotificationSocket';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/shared/queries/notifications.queries';
import {
  DoneAllOutlined,
  NotificationsNoneOutlined,
} from '@mui/icons-material';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';

interface NotificationBellProps {
  enabled: boolean;
}

const getMetadataString = (
  metadata: Record<string, unknown> | null,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
};

const getNotificationHref = (notification: AppNotification) => {
  const workspaceId = getMetadataString(notification.metadata, 'workspaceId');
  if (!workspaceId || !notification.boardId) return null;

  const base = `/workspaces/${workspaceId}/boards/${notification.boardId}`;
  if (notification.taskId) {
    return `${base}?taskId=${encodeURIComponent(notification.taskId)}`;
  }
  return base;
};

const NotificationBell = ({ enabled }: NotificationBellProps) => {
  const t = useTranslations('NotificationCenter');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const notifications = useNotifications(false, enabled);
  const unreadCount = useUnreadNotificationCount(enabled);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const isOpen = Boolean(anchorEl);

  useNotificationSocket(enabled);

  const unread = unreadCount.data ?? 0;
  const visibleNotifications = useMemo(
    () => notifications.data ?? [],
    [notifications.data],
  );

  const getTitle = (notification: AppNotification) => {
    const actor = notification.actor?.name ?? t('system');
    const taskTitle =
      getMetadataString(notification.metadata, 'taskTitle') ?? t('taskFallback');
    const boardTitle =
      getMetadataString(notification.metadata, 'boardTitle') ??
      t('boardFallback');

    switch (notification.type) {
      case 'mention':
        return t('type.mention', { actor, task: taskTitle });
      case 'task_assigned':
        return t('type.taskAssigned', { actor, task: taskTitle });
      case 'team_task_changed':
        return t('type.teamTaskChanged', { actor, task: taskTitle });
      case 'board_member_added':
        return t('type.boardMemberAdded', { actor, board: boardTitle });
      default:
        return t('type.default');
    }
  };

  return (
    <>
      <Tooltip title={t('title')}>
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label={t('title')}
          aria-controls={isOpen ? 'notification-menu' : undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen ? 'true' : undefined}
        >
          <Badge
            color="error"
            badgeContent={unread}
            max={99}
            invisible={!unread}
          >
            <NotificationsNoneOutlined />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id="notification-menu"
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100vw - 24px)', sm: 380 },
              maxWidth: 420,
              mt: 1,
            },
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('unreadCount', { count: unread })}
            </Typography>
          </Box>
          <Tooltip title={t('markAllRead')}>
            <span>
              <IconButton
                size="small"
                onClick={() => markAllRead.mutate()}
                disabled={!unread || markAllRead.isPending}
                aria-label={t('markAllRead')}
              >
                <DoneAllOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {notifications.isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : visibleNotifications.length ? (
          <List sx={{ maxHeight: 420, overflowY: 'auto', py: 0 }}>
            {visibleNotifications.map((notification) => {
              const href = getNotificationHref(notification);
              const isUnread = !notification.readAt;
              return (
                <ListItemButton
                  key={notification.id}
                  {...(href ? { component: NextLink, href } : {})}
                  onClick={() => {
                    if (isUnread) markRead.mutate(notification.id);
                    setAnchorEl(null);
                  }}
                  sx={{
                    alignItems: 'flex-start',
                    borderLeft: '3px solid',
                    borderLeftColor: isUnread ? 'primary.main' : 'transparent',
                    gap: 1,
                  }}
                >
                  <ListItemText
                    primary={getTitle(notification)}
                    secondary={new Date(notification.createdAt).toLocaleString()}
                    slotProps={{
                      primary: {
                        variant: 'body2',
                        sx: {
                          fontWeight: isUnread ? 700 : 500,
                          overflowWrap: 'anywhere',
                        },
                      },
                      secondary: { variant: 'caption' },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 2, pb: 2 }}
          >
            {t('empty')}
          </Typography>
        )}

        <Box sx={{ display: { xs: 'block', sm: 'none' }, p: 1 }}>
          <Button fullWidth onClick={() => setAnchorEl(null)}>
            {t('close')}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
