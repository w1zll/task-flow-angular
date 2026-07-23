import { io, Socket } from 'socket.io-client';
import { authApi } from '../api/api';

let socket: Socket | null = null;
let socketConnectPromise: Promise<Socket> | null = null;
let whiteboardSocket: Socket | null = null;
let whiteboardSocketConnectPromise: Promise<Socket> | null = null;

const getSocketUrl = () =>
  (process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001').replace(
    /\/+$/,
    '',
  );

const isBrowserOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

export const isSocketReady = (targetSocket: Socket = getSocket()) => {
  if (isBrowserOffline() || !targetSocket.connected) return false;

  const engine = targetSocket.io.engine as
    | {
        readyState?: string;
        transport?: {
          writable?: boolean;
        };
      }
    | undefined;

  if (engine?.readyState && engine.readyState !== 'open') return false;
  if (engine?.transport?.writable === false) return false;

  return true;
};

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = getSocketUrl();
    socket = io(`${socketUrl}/boards`, {
      withCredentials: true,
      autoConnect: false,
      reconnection: false,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
};

export const getWhiteboardSocket = (): Socket => {
  if (!whiteboardSocket) {
    const socketUrl = getSocketUrl();
    whiteboardSocket = io(`${socketUrl}/whiteboards`, {
      withCredentials: true,
      autoConnect: false,
      reconnection: false,
      transports: ['websocket', 'polling'],
    });
  }

  return whiteboardSocket;
};

export const disconnectSocket = () => {
  socketConnectPromise = null;
  if (!socket) return;
  socket.disconnect();
};

export const disconnectWhiteboardSocket = () => {
  whiteboardSocketConnectPromise = null;
  if (!whiteboardSocket) return;
  whiteboardSocket.disconnect();
};

export const refreshSocketAuth = async (
  targetSocket: Socket = getSocket(),
): Promise<void> => {
  const { data } = await authApi.wsToken();
  targetSocket.auth = { token: data.token };
};

export const ensureSocketConnected = async (
  targetSocket: Socket = getSocket(),
  timeoutMs = 10_000,
): Promise<Socket> => {
  if (isSocketReady(targetSocket)) return targetSocket;
  if (isBrowserOffline()) {
    throw new Error('Browser is offline');
  }
  if (socketConnectPromise) return socketConnectPromise;

  socketConnectPromise = new Promise<Socket>(async (resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      targetSocket.off('connect', handleConnect);
      targetSocket.off('connect_error', handleConnectError);
    };

    const handleConnect = () => {
      cleanup();
      resolve(targetSocket);
    };

    const handleConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    try {
      await refreshSocketAuth(targetSocket);
      if (isBrowserOffline()) {
        throw new Error('Browser is offline');
      }
      if (isSocketReady(targetSocket)) {
        cleanup();
        resolve(targetSocket);
        return;
      }

      targetSocket.on('connect', handleConnect);
      targetSocket.on('connect_error', handleConnectError);
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Socket connection timeout'));
      }, timeoutMs);

      targetSocket.connect();
    } catch (error) {
      cleanup();
      reject(error);
    }
  }).finally(() => {
    socketConnectPromise = null;
  });

  return socketConnectPromise;
};

export const ensureWhiteboardSocketConnected = async (
  targetSocket: Socket = getWhiteboardSocket(),
  timeoutMs = 10_000,
): Promise<Socket> => {
  if (isSocketReady(targetSocket)) return targetSocket;
  if (isBrowserOffline()) {
    throw new Error('Browser is offline');
  }
  if (whiteboardSocketConnectPromise) return whiteboardSocketConnectPromise;

  whiteboardSocketConnectPromise = new Promise<Socket>(
    async (resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        targetSocket.off('connect', handleConnect);
        targetSocket.off('connect_error', handleConnectError);
      };

      const handleConnect = () => {
        cleanup();
        resolve(targetSocket);
      };

      const handleConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      try {
        await refreshSocketAuth(targetSocket);
        if (isBrowserOffline()) {
          throw new Error('Browser is offline');
        }
        if (isSocketReady(targetSocket)) {
          cleanup();
          resolve(targetSocket);
          return;
        }

        targetSocket.on('connect', handleConnect);
        targetSocket.on('connect_error', handleConnectError);
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Socket connection timeout'));
        }, timeoutMs);

        targetSocket.connect();
      } catch (error) {
        cleanup();
        reject(error);
      }
    },
  ).finally(() => {
    whiteboardSocketConnectPromise = null;
  });

  return whiteboardSocketConnectPromise;
};
