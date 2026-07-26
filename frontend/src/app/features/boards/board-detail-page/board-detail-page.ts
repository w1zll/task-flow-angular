import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { BoardResponseDto, ColumnResponseDto, TaskResponseDto } from '@core/api/generated';
import { BoardMembersDialog } from '@features/board-members/board-members-dialog/board-members-dialog';
import { BoardCatalogStore } from '@features/boards/board-catalog.store';
import {
  ColumnEditorDialog,
  ColumnEditorDialogData,
} from '@features/kanban/column-editor-dialog/column-editor-dialog';
import {
  DeleteConfirmDialog,
  DeleteConfirmDialogData,
} from '@features/kanban/delete-confirm-dialog/delete-confirm-dialog';
import {
  KanbanColumn,
  TaskMoveEvent,
  TaskReorderEvent,
} from '@features/kanban/kanban-column/kanban-column';
import { KanbanStore, MoveDirection } from '@features/kanban/kanban.store';
import {
  TaskEditorDialog,
  TaskEditorDialogData,
} from '@features/kanban/task-editor-dialog/task-editor-dialog';
import { AppButton } from '@shared/ui/app-button/app-button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-board-detail-page',
  imports: [AppButton, ErrorState, KanbanColumn, LoadingSkeleton, RouterLink, TranslocoPipe],
  templateUrl: './board-detail-page.html',
  styleUrl: './board-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly store = inject(BoardCatalogStore);
  protected readonly kanban = inject(KanbanStore);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly parentParamMap = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });

  protected readonly boardId = computed(() => this.paramMap().get('boardId') ?? '');
  protected readonly workspaceId = computed(() => this.parentParamMap().get('workspaceId') ?? '');
  protected readonly board = signal<BoardResponseDto | null>(null);
  protected readonly columns = computed(() =>
    [...(this.board()?.columns ?? [])].sort((a, b) => a.order - b.order),
  );
  protected readonly activeColumnId = signal('');
  protected readonly activeColumn = computed(() => {
    const columns = this.columns();
    return columns.find((column) => column.id === this.activeColumnId()) ?? columns[0] ?? null;
  });
  protected readonly loading = signal(true);
  protected readonly errorKey = signal<string | null>(null);
  private loadEpoch = 0;

  constructor() {
    effect(() => {
      const boardId = this.boardId();
      const workspaceId = this.workspaceId();
      if (boardId && workspaceId) {
        untracked(() => void this.load(boardId, workspaceId));
      }
    });
  }

  protected retry(): void {
    const boardId = this.boardId();
    const workspaceId = this.workspaceId();
    if (boardId && workspaceId) void this.load(boardId, workspaceId, true);
  }

  protected async openMembers(): Promise<void> {
    const currentBoard = this.board();
    if (!currentBoard) return;

    try {
      const freshBoard = await this.store.detail(currentBoard.id, true);
      this.setBoard(freshBoard);
      await firstValueFrom(
        this.dialog.open(BoardMembersDialog, {
          ariaLabelledBy: 'board-members-title',
          data: freshBoard,
        }).closed,
      );

      this.setBoard(await this.store.detail(freshBoard.id));
    } catch (error) {
      this.board.set(null);
      this.errorKey.set(this.store.errorFor(error));
    }
  }

  protected openCreateColumn(): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<ColumnEditorDialogData>(ColumnEditorDialog, {
      mode: 'create',
      board,
    });
  }

  protected openRenameColumn(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<ColumnEditorDialogData>(ColumnEditorDialog, {
      mode: 'rename',
      board,
      column,
    });
  }

  protected openDeleteColumn(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<DeleteConfirmDialogData>(DeleteConfirmDialog, {
      kind: 'column',
      board,
      column,
    });
  }

  protected openCreateTask(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<TaskEditorDialogData>(TaskEditorDialog, {
      board,
      columnId: column.id,
      canEdit: board.capabilities.canEditBoardContent,
    });
  }

  protected openTask(task: TaskResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<TaskEditorDialogData>(TaskEditorDialog, {
      board,
      columnId: task.columnId,
      task,
      canEdit: board.capabilities.canEditBoardContent,
    });
  }

  protected openDeleteTask(task: TaskResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<DeleteConfirmDialogData>(DeleteConfirmDialog, {
      kind: 'task',
      board,
      task,
    });
  }

  protected moveColumn(column: ColumnResponseDto, direction: MoveDirection): void {
    const board = this.board();
    if (!board) return;
    void this.applyMutation(this.kanban.moveColumn(board, column.id, direction));
  }

  protected moveTask(event: TaskMoveEvent): void {
    const board = this.board();
    if (!board) return;
    void this.applyMutation(this.kanban.moveTask(board, event.task, event.columnId));
  }

  protected reorderTask(event: TaskReorderEvent): void {
    const board = this.board();
    if (!board) return;
    void this.applyMutation(this.kanban.reorderTask(board, event.task, event.direction));
  }

  protected toggleTask(task: TaskResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.applyMutation(
      this.kanban.updateTask(board.id, task.id, { isCompleted: !task.isCompleted }),
    );
  }

  protected selectActiveColumn(event: Event): void {
    this.activeColumnId.set((event.target as HTMLSelectElement).value);
  }

  private async load(boardId: string, workspaceId: string, force = false): Promise<void> {
    const epoch = ++this.loadEpoch;
    this.loading.set(true);
    this.errorKey.set(null);

    try {
      const board = await this.store.detail(boardId, force);
      if (epoch !== this.loadEpoch) return;
      if (board.workspaceId !== workspaceId) {
        await this.router.navigate(['/workspaces', board.workspaceId, 'boards', board.id], {
          replaceUrl: true,
        });
        return;
      }
      this.setBoard(board);
    } catch (error) {
      if (epoch !== this.loadEpoch) return;
      this.board.set(null);
      this.errorKey.set(this.store.errorFor(error));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  private setBoard(board: BoardResponseDto): void {
    this.board.set(board);
    const columns = [...(board.columns ?? [])].sort((a, b) => a.order - b.order);
    if (!columns.some((column) => column.id === this.activeColumnId())) {
      this.activeColumnId.set(columns[0]?.id ?? '');
    }
  }

  private async applyMutation(mutation: Promise<BoardResponseDto>): Promise<void> {
    try {
      this.setBoard(await mutation);
    } catch {}
  }

  private async openBoardDialog<T>(
    component: typeof ColumnEditorDialog | typeof DeleteConfirmDialog | typeof TaskEditorDialog,
    data: T,
  ): Promise<void> {
    this.kanban.clearError();
    const result = await firstValueFrom(
      this.dialog.open<BoardResponseDto>(component, {
        ariaLabelledBy:
          component === ColumnEditorDialog
            ? 'column-editor-title'
            : component === DeleteConfirmDialog
              ? 'kanban-delete-title'
              : 'task-editor-title',
        data,
      }).closed,
    );
    if (result) this.setBoard(result);
  }
}
