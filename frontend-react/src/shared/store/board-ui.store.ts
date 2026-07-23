'use client';

import { create } from 'zustand';

interface BoardUIState {
  isDragging: boolean;
  draggingTaskId: string | null;
  suppressNextClickTaskId: string | null;
  openTaskId: string | null;
  isAddingColumn: boolean;
  addingTaskInColumnId: string | null;
  startDrag: (taskId: string) => void;
  endDrag: () => void;
  suppressNextTaskClick: (taskId: string) => void;
  consumeSuppressedTaskClick: (taskId: string) => boolean;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  setAddingColumn: (value: boolean) => void;
  setAddingTaskInColumn: (columnId: string | null) => void;
}

export const useBoardUIStore = create<BoardUIState>((set) => ({
  isDragging: false,
  draggingTaskId: null,
  suppressNextClickTaskId: null,
  openTaskId: null,
  isAddingColumn: false,
  addingTaskInColumnId: null,
  startDrag: (taskId) => set({ isDragging: true, draggingTaskId: taskId }),
  endDrag: () => set({ isDragging: false, draggingTaskId: null }),
  suppressNextTaskClick: (taskId) => set({ suppressNextClickTaskId: taskId }),
  consumeSuppressedTaskClick: (taskId) => {
    let shouldSuppress = false;
    set((state) => {
      shouldSuppress = state.suppressNextClickTaskId === taskId;
      return shouldSuppress ? { suppressNextClickTaskId: null } : {};
    });
    return shouldSuppress;
  },
  openTask: (taskId) => set({ openTaskId: taskId }),
  closeTask: () => set({ openTaskId: null }),
  setAddingColumn: (value) => set({ isAddingColumn: value }),
  setAddingTaskInColumn: (columnId) =>
    set({ addingTaskInColumnId: columnId }),
}));
