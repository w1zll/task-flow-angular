import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { AppNotification } from '../api/api';
import {
  ensureSocketConnected,
  getSocket,
  disconnectSocket,
} from '../lib/socket';
import { queryKeys } from '../queries/board-query-keys';
import { useOnlineStatus } from './useOnlineStatus';

export const useNotificationSocket = (enabled: boolean) => {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!enabled || !isOnline) return;

    const socket = getSocket();
    let isActive = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      socket.emit('notification:subscribe');
    };

    const connect = async () => {
      if (!isActive) return;
      try {
        await ensureSocketConnected(socket);
        subscribe();
      } catch (error) {
        console.error('notification socket error:', error);
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (!isActive) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        void connect();
      }, 2000);
    };

    const handleNotification = (notification: AppNotification) => {
      qc.setQueryData(
        queryKeys.notifications(false),
        (previous: AppNotification[] | undefined) => [
          notification,
          ...(previous ?? []).filter((item) => item.id !== notification.id),
        ],
      );
      if (!notification.readAt) {
        qc.setQueryData(
          queryKeys.notifications(true),
          (previous: AppNotification[] | undefined) => [
            notification,
            ...(previous ?? []).filter((item) => item.id !== notification.id),
          ],
        );
      }
    };

    const handleUnreadCount = ({ count }: { count: number }) => {
      qc.setQueryData(queryKeys.notificationUnreadCount, count);
    };

    socket.on('connect', subscribe);
    socket.on('disconnect', scheduleReconnect);
    socket.on('connect_error', scheduleReconnect);
    socket.on('notification:new', handleNotification);
    socket.on('notification:unread-count', handleUnreadCount);

    if (socket.connected) subscribe();
    else void connect();

    return () => {
      isActive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.off('connect', subscribe);
      socket.off('disconnect', scheduleReconnect);
      socket.off('connect_error', scheduleReconnect);
      socket.off('notification:new', handleNotification);
      socket.off('notification:unread-count', handleUnreadCount);
    };
  }, [enabled, isOnline, qc]);

  useEffect(() => {
    if (enabled || isOnline) return;
    disconnectSocket();
  }, [enabled, isOnline]);
};
