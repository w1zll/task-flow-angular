import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  AppNotification,
  notificationsApi,
  TaskComment,
  taskCommentsApi,
} from '../api/api';
import { queryKeys } from './board-query-keys';

export const useTaskComments = (taskId?: string) =>
  useQuery({
    queryKey: queryKeys.taskComments(taskId ?? ''),
    queryFn: () => taskCommentsApi.getAll(taskId ?? '').then((r) => r.data),
    enabled: !!taskId,
    staleTime: 30_000,
  });

export const useCreateTaskComment = (taskId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; mentionedUserIds?: string[] }) =>
      taskCommentsApi.create(taskId ?? '', data).then((r) => r.data),
    onSuccess: (comment) => {
      qc.setQueryData(
        queryKeys.taskComments(comment.taskId),
        (previous: TaskComment[] | undefined) => {
          const withoutDuplicate = (previous ?? []).filter(
            (item) => item.id !== comment.id,
          );
          return [...withoutDuplicate, comment].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          );
        },
      );
    },
  });
};

export const useNotifications = (unreadOnly = false, enabled = true) =>
  useQuery({
    queryKey: queryKeys.notifications(unreadOnly),
    queryFn: () => notificationsApi.getAll({ unreadOnly }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  });

export const useUnreadNotificationCount = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.count),
    enabled,
    staleTime: 30_000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id).then((r) => r.data),
    onSuccess: (notification) => {
      updateNotificationCaches(qc, notification);
      void qc.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.setQueryData(queryKeys.notificationUnreadCount, 0);
      qc.setQueryData(
        queryKeys.notifications(false),
        (previous: AppNotification[] | undefined) =>
          previous?.map((notification) => ({
            ...notification,
            readAt: notification.readAt ?? new Date().toISOString(),
          })),
      );
      qc.setQueryData(queryKeys.notifications(true), []);
    },
  });
};

export const updateNotificationCaches = (
  qc: QueryClient,
  notification: AppNotification,
) => {
  qc.setQueryData(
    queryKeys.notifications(false),
    (previous: AppNotification[] | undefined) =>
      previous?.map((item) =>
        item.id === notification.id ? notification : item,
      ) ?? [notification],
  );
  qc.setQueryData(
    queryKeys.notifications(true),
    (previous: AppNotification[] | undefined) => {
      const next = previous?.filter((item) => item.id !== notification.id) ?? [];
      if (!notification.readAt) return [notification, ...next];
      return next;
    },
  );
};
