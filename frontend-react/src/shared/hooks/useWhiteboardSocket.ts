import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { WhiteboardOperation } from '../api/api';
import {
  disconnectWhiteboardSocket,
  ensureWhiteboardSocketConnected,
  getWhiteboardSocket,
} from '../lib/socket';
import { queryKeys } from '../queries/board-query-keys';
import { appendOperationToState } from '../queries/whiteboards.queries';
import { useOnlineStatus } from './useOnlineStatus';

export interface RemoteWhiteboardCursor {
  userId: string;
  userName?: string;
  x: number;
  y: number;
  color?: string;
  tool?: string;
  updatedAt: number;
}

export const useWhiteboardSocket = (
  workspaceId: string,
  whiteboardId: string,
) => {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, RemoteWhiteboardCursor>
  >({});

  useEffect(() => {
    if (!isOnline) {
      disconnectWhiteboardSocket();
      return;
    }

    const socket = getWhiteboardSocket();
    let isActive = true;
    let isRefreshingAuth = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWithToken = async () => {
      if (isRefreshingAuth || !isActive) return;
      isRefreshingAuth = true;

      try {
        await ensureWhiteboardSocketConnected(socket);
      } catch (error) {
        console.error('whiteboard socket auth error:', error);
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          scheduleReconnect();
        }
      } finally {
        isRefreshingAuth = false;
      }
    };

    const scheduleReconnect = () => {
      if (!isActive) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        void connectWithToken();
      }, 2000);
    };

    const joinWhiteboard = () => {
      socket.emit('whiteboard:join', { whiteboardId });
    };

    const onConnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      joinWhiteboard();
    };

    const onConnectError = (error: Error) => {
      console.error('[Whiteboard WS] connect_error:', error.message);
      scheduleReconnect();
    };

    const onDisconnect = () => {
      scheduleReconnect();
    };

    const onOnline = () => {
      void connectWithToken();
    };

    const onOperation = (payload: {
      whiteboardId: string;
      operation: WhiteboardOperation;
    }) => {
      if (payload.whiteboardId !== whiteboardId) return;
      queryClient.setQueryData(
        queryKeys.whiteboardState(workspaceId, whiteboardId),
        (previous) => appendOperationToState(previous as any, payload.operation),
      );
      queryClient.setQueryData(
        queryKeys.whiteboard(workspaceId, whiteboardId),
        (previous) =>
          previous
            ? {
                ...(previous as any),
                lastSequence: Math.max(
                  (previous as any).lastSequence ?? 0,
                  payload.operation.sequence,
                ),
              }
            : previous,
      );
    };

    const onCursor = (payload: {
      whiteboardId: string;
      userId: string;
      userName?: string;
      x: number;
      y: number;
      color?: string;
      tool?: string;
    }) => {
      if (payload.whiteboardId !== whiteboardId) return;
      setRemoteCursors((previous) => ({
        ...previous,
        [payload.userId]: {
          userId: payload.userId,
          userName: payload.userName,
          x: payload.x,
          y: payload.y,
          color: payload.color,
          tool: payload.tool,
          updatedAt: Date.now(),
        },
      }));
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('whiteboard:operation', onOperation);
    socket.on('whiteboard:cursor', onCursor);
    window.addEventListener('online', onOnline);

    if (socket.connected) {
      joinWhiteboard();
    } else {
      void connectWithToken();
    }

    return () => {
      isActive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.emit('whiteboard:leave', { whiteboardId });
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('whiteboard:operation', onOperation);
      socket.off('whiteboard:cursor', onCursor);
      window.removeEventListener('online', onOnline);
    };
  }, [isOnline, queryClient, whiteboardId, workspaceId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setRemoteCursors((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(
            ([, cursor]) => now - cursor.updatedAt < 6000,
          ),
        ),
      );
    }, 2000);

    return () => window.clearInterval(interval);
  }, []);

  return { remoteCursors };
};
