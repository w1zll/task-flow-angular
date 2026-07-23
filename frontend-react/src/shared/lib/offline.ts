export class OfflineReadOnlyError extends Error {
  constructor(message = 'Offline read-only mode is active') {
    super(message);
    this.name = 'OfflineReadOnlyError';
  }
}

const OFFLINE_STORAGE_KEY = 'taskflow.networkOffline';
const ONLINE_STATUS_EVENT = 'taskflow:online-status';

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const readOfflineMarker = () => {
  if (!canUseStorage()) return false;

  try {
    return window.sessionStorage.getItem(OFFLINE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeOfflineMarker = (isOffline: boolean) => {
  if (!canUseStorage()) return;

  try {
    if (isOffline) {
      window.sessionStorage.setItem(OFFLINE_STORAGE_KEY, '1');
    } else {
      window.sessionStorage.removeItem(OFFLINE_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in hardened browser modes.
  }
};

const emitOnlineStatusChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ONLINE_STATUS_EVENT));
};

export const isBrowserOffline = () =>
  typeof navigator !== 'undefined' &&
  (navigator.onLine === false || readOfflineMarker());

export const getBrowserOnlineSnapshot = () => !isBrowserOffline();

export const subscribeToBrowserOnlineStatus = (
  callback: () => void,
) => {
  if (typeof window === 'undefined') return () => undefined;

  const handleOffline = () => {
    writeOfflineMarker(true);
    callback();
  };
  const handleOnline = () => {
    callback();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  window.addEventListener(ONLINE_STATUS_EVENT, callback);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener(ONLINE_STATUS_EVENT, callback);
  };
};

export const markNetworkOffline = () => {
  if (readOfflineMarker()) return;

  writeOfflineMarker(true);
  emitOnlineStatusChange();
};

export const markNetworkOnline = () => {
  if (!readOfflineMarker()) return;

  writeOfflineMarker(false);
  emitOnlineStatusChange();
};

export const assertOnlineForWrite = () => {
  if (isBrowserOffline()) {
    throw new OfflineReadOnlyError();
  }
};

export const isOfflineReadOnlyError = (
  error: unknown,
): error is OfflineReadOnlyError =>
  error instanceof OfflineReadOnlyError ||
  (error as { name?: string } | null)?.name === 'OfflineReadOnlyError';
