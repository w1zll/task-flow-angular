'use client';

import { create } from 'zustand';

export type OfflineNavigationView =
  | { type: 'catalog'; workspaceId?: string }
  | { type: 'board'; boardId: string };

interface OfflineBoardNavigationState {
  view: OfflineNavigationView | null;
  selectBoard: (boardId: string) => void;
  openCatalog: (workspaceId?: string) => void;
  clearSelection: () => void;
}

export const useOfflineBoardNavigationStore =
  create<OfflineBoardNavigationState>((set) => ({
    view: null,
    selectBoard: (boardId) => set({ view: { type: 'board', boardId } }),
    openCatalog: (workspaceId) =>
      set({ view: { type: 'catalog', workspaceId } }),
    clearSelection: () => set({ view: null }),
  }));
