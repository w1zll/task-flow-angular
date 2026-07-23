import type { Board, Workspace } from '@/shared/api/api';

export interface WorkspaceBoardGroup {
  workspace: Workspace;
  boards: Board[];
}

export interface BoardMenuAnchor {
  el: HTMLElement;
  board: Board;
}
