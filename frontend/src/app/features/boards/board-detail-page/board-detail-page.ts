import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Type,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiSelect } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import { BoardResponseDto, ColumnResponseDto, TaskResponseDto } from '@core/api/generated';
import { AuthStore } from '@core/auth/auth.store';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';
import { BoardRealtime } from '@core/realtime/board-realtime';
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
  TaskFiltersDialog,
  TaskFiltersDialogData,
} from '@features/kanban/task-filters-dialog/task-filters-dialog';
import {
  TaskFilterAssignee,
  TaskFilterState,
  defaultTaskFilters,
  hasTaskFilters,
  parseTaskFilters,
  serializeTaskFilters,
  taskFilterSignature,
  taskMatchesFilters,
} from '@features/kanban/task-filters/task-filter.model';
import { TaskFilters } from '@features/kanban/task-filters/task-filters';
import {
  TaskEditorDialog,
  TaskEditorDialogData,
} from '@features/kanban/task-editor-dialog/task-editor-dialog';
import { AppButton } from '@shared/ui/app-button/app-button';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-board-detail-page',
  imports: [
    AppButton,
    ErrorState,
    FormsModule,
    KanbanColumn,
    LoadingSkeleton,
    RouterLink,
    TaskFilters,
    TranslocoPipe,
    TuiSelect,
  ],
  templateUrl: './board-detail-page.html',
  styleUrl: './board-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(TuiDialogService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(BoardCatalogStore);
  private readonly auth = inject(AuthStore);
  private readonly cache = inject(QueryCacheStore);
  protected readonly realtime = inject(BoardRealtime);
  protected readonly kanban = inject(KanbanStore);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly parentParamMap = toSignal(this.route.parent!.paramMap, {
    initialValue: this.route.parent!.snapshot.paramMap,
  });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly boardId = computed(() => this.paramMap().get('boardId') ?? '');
  protected readonly workspaceId = computed(() => this.parentParamMap().get('workspaceId') ?? '');
  protected readonly board = computed(
    () => this.cache.get<BoardResponseDto>(queryKeys.boardDetail(this.boardId())) ?? null,
  );
  protected readonly columns = computed(() =>
    [...(this.board()?.columns ?? [])].sort((a, b) => a.order - b.order),
  );
  protected readonly filters = computed(() => parseTaskFilters(this.queryParamMap()));
  protected readonly hasActiveFilters = computed(() => hasTaskFilters(this.filters()));
  protected readonly assignees = computed<readonly TaskFilterAssignee[]>(() => {
    const people = new Map<string, string>();
    for (const member of this.board()?.members ?? []) {
      people.set(member.userId, member.user.name);
    }
    for (const column of this.columns()) {
      for (const task of column.tasks ?? []) {
        const id = task.assigneeId ?? task.assignee?.id;
        const name = task.assignee?.name ?? task.assigneeName;
        if (id && name) people.set(id, name);
      }
    }
    return [...people]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
  protected readonly availableLabels = computed(() =>
    Array.from(
      new Set(
        this.columns().flatMap((column) =>
          (column.tasks ?? []).flatMap((task) => task.labels ?? []),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b)),
  );
  protected readonly filteredColumns = computed(() => {
    const filters = this.filters();
    const userId = this.auth.user()?.id ?? null;
    const now = new Date();
    return this.columns().map((column) => ({
      ...column,
      tasks: (column.tasks ?? []).filter((task) => taskMatchesFilters(task, filters, userId, now)),
    }));
  });
  protected readonly filteredColumnIds = computed(() => this.filteredColumns().map(({ id }) => id));
  protected readonly stringifyMobileColumn = (id: string): string => {
    const column = this.filteredColumns().find((item) => item.id === id);

    return column ? `${column.title} (${column.tasks?.length ?? 0})` : id;
  };
  protected readonly totalTaskCount = computed(() =>
    this.columns().reduce((count, column) => count + (column.tasks?.length ?? 0), 0),
  );
  protected readonly visibleTaskCount = computed(() =>
    this.filteredColumns().reduce((count, column) => count + (column.tasks?.length ?? 0), 0),
  );
  protected readonly activeColumnId = signal('');
  protected readonly activeColumn = computed(() => {
    const columns = this.filteredColumns();
    return columns.find((column) => column.id === this.activeColumnId()) ?? columns[0] ?? null;
  });
  protected readonly filterFeedbackTitle = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorKey = signal<string | null>(null);
  private loadEpoch = 0;
  private realtimeCleanup: (() => void) | null = null;

  constructor() {
    effect(() => {
      const boardId = this.boardId();
      const workspaceId = this.workspaceId();
      if (boardId && workspaceId) {
        untracked(() => void this.load(boardId, workspaceId));
      }
    });
    effect(() => {
      const boardId = this.boardId();
      untracked(() => {
        this.realtimeCleanup?.();
        this.realtimeCleanup = boardId ? this.realtime.open(boardId) : null;
      });
    });
    let previousBoardId = '';
    let previousFilterSignature = '';
    let previousVisibleIds = new Set<string>();
    effect(() => {
      const boardId = this.boardId();
      const signature = taskFilterSignature(this.filters());
      const allTasks = this.columns().flatMap((column) => column.tasks ?? []);
      const allTaskById = new Map(allTasks.map((task) => [task.id, task]));
      const visibleIds = new Set(
        this.filteredColumns().flatMap((column) => (column.tasks ?? []).map((task) => task.id)),
      );

      if (boardId !== previousBoardId || signature !== previousFilterSignature) {
        previousBoardId = boardId;
        previousFilterSignature = signature;
        previousVisibleIds = visibleIds;
        untracked(() => this.filterFeedbackTitle.set(null));
        return;
      }

      const hiddenTaskId = [...previousVisibleIds].find(
        (taskId) => !visibleIds.has(taskId) && allTaskById.has(taskId),
      );
      if (hiddenTaskId) {
        untracked(() => this.filterFeedbackTitle.set(allTaskById.get(hiddenTaskId)?.title ?? ''));
      }
      previousVisibleIds = visibleIds;
    });
    this.destroyRef.onDestroy(() => {
      this.realtimeCleanup?.();
      this.realtimeCleanup = null;
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
      this.syncActiveColumn(freshBoard);
      await firstValueFrom(
        this.dialog.open(new PolymorpheusComponent(BoardMembersDialog), {
          closable: false,
          data: freshBoard,
          label: this.transloco.translate('boardMembers.title'),
          size: 'l',
        }),
        { defaultValue: undefined },
      );

      this.syncActiveColumn(await this.store.detail(freshBoard.id));
    } catch (error) {
      this.errorKey.set(this.store.errorFor(error));
    }
  }

  protected setFilters(filters: TaskFilterState): void {
    this.filterFeedbackTitle.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: serializeTaskFilters(filters),
    });
  }

  protected clearFilters(): void {
    this.setFilters(defaultTaskFilters);
  }

  protected async openFilters(): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open<TaskFilterState | undefined>(new PolymorpheusComponent(TaskFiltersDialog), {
        closable: false,
        data: {
          filters: this.filters(),
          assignees: this.assignees(),
          labels: this.availableLabels(),
        } satisfies TaskFiltersDialogData,
        label: this.transloco.translate('kanban.filters.title'),
        size: 'l',
      }),
      { defaultValue: undefined },
    );
    if (result) this.setFilters(result);
  }

  protected dismissFilterFeedback(): void {
    this.filterFeedbackTitle.set(null);
  }

  protected openCreateColumn(): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<ColumnEditorDialogData>(
      ColumnEditorDialog,
      {
        mode: 'create',
        board,
      },
      'kanban.column.create.title',
    );
  }

  protected openRenameColumn(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<ColumnEditorDialogData>(
      ColumnEditorDialog,
      {
        mode: 'rename',
        board,
        column,
      },
      'kanban.column.rename.title',
    );
  }

  protected openDeleteColumn(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<DeleteConfirmDialogData>(
      DeleteConfirmDialog,
      {
        kind: 'column',
        board,
        column,
      },
      'kanban.column.delete.title',
    );
  }

  protected openCreateTask(column: ColumnResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<TaskEditorDialogData>(
      TaskEditorDialog,
      {
        board,
        columnId: column.id,
        canEdit: board.capabilities.canEditBoardContent,
      },
      'kanban.task.create.title',
    );
  }

  protected openTask(task: TaskResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<TaskEditorDialogData>(
      TaskEditorDialog,
      {
        board,
        columnId: task.columnId,
        task,
        canEdit: board.capabilities.canEditBoardContent,
      },
      board.capabilities.canEditBoardContent ? 'kanban.task.edit.title' : 'kanban.task.view.title',
    );
  }

  protected openDeleteTask(task: TaskResponseDto): void {
    const board = this.board();
    if (!board) return;
    void this.openBoardDialog<DeleteConfirmDialogData>(
      DeleteConfirmDialog,
      {
        kind: 'task',
        board,
        task,
      },
      'kanban.task.delete.title',
    );
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

  protected selectActiveColumnId(columnId: string): void {
    this.activeColumnId.set(columnId);
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
      this.syncActiveColumn(board);
    } catch (error) {
      if (epoch !== this.loadEpoch) return;
      this.errorKey.set(this.store.errorFor(error));
    } finally {
      if (epoch === this.loadEpoch) this.loading.set(false);
    }
  }

  private syncActiveColumn(board: BoardResponseDto): void {
    const columns = [...(board.columns ?? [])].sort((a, b) => a.order - b.order);
    if (!columns.some((column) => column.id === this.activeColumnId())) {
      this.activeColumnId.set(columns[0]?.id ?? '');
    }
  }

  private async applyMutation(mutation: Promise<BoardResponseDto>): Promise<void> {
    try {
      this.syncActiveColumn(await mutation);
    } catch {}
  }

  private async openBoardDialog<T>(
    component: typeof ColumnEditorDialog | typeof DeleteConfirmDialog | typeof TaskEditorDialog,
    data: T,
    labelKey: string,
  ): Promise<void> {
    this.kanban.clearError();
    const result = await firstValueFrom(
      this.dialog.open<BoardResponseDto | undefined>(
        new PolymorpheusComponent(component as Type<unknown>),
        {
          closable: false,
          data,
          label: this.transloco.translate(labelKey),
          size: component === TaskEditorDialog ? 'l' : 's',
        },
      ),
      { defaultValue: undefined },
    );
    if (result) this.syncActiveColumn(result);
  }
}
