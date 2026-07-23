'use client';

import { create } from 'zustand';

export type BackendAvailabilityStatus =
  | 'checking'
  | 'starting'
  | 'ready';

interface BackendAvailabilityState {
  status: BackendAvailabilityStatus;
  setStatus: (status: BackendAvailabilityStatus) => void;
}

export const useBackendAvailabilityStore =
  create<BackendAvailabilityState>((set) => ({
    status: 'checking',
    setStatus: (status) =>
      set((state) => (state.status === status ? state : { status })),
  }));
