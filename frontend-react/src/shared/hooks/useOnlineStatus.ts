'use client';

import { useSyncExternalStore } from 'react';
import {
  getBrowserOnlineSnapshot,
  subscribeToBrowserOnlineStatus,
} from '@/shared/lib/offline';

const getServerOnlineSnapshot = () => true;

export const useOnlineStatus = () =>
  useSyncExternalStore(
    subscribeToBrowserOnlineStatus,
    getBrowserOnlineSnapshot,
    getServerOnlineSnapshot,
  );

export const useIsOffline = () => !useOnlineStatus();
