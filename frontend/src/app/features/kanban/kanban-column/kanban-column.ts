import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ColumnResponseDto, TaskResponseDto } from '@core/api/generated';
import { MoveDirection } from '@features/kanban/kanban.store';
import { TaskCard } from '@features/kanban/task-card/task-card';
import { AppButton } from '@shared/ui/app-button/app-button';

export interface TaskMoveEvent {
  readonly task: TaskResponseDto;
  readonly columnId: string;
}

export interface TaskReorderEvent {
  readonly task: TaskResponseDto;
  readonly direction: MoveDirection;
}

@Component({
  selector: 'app-kanban-column',
  imports: [AppButton, TaskCard, TranslocoPipe],
  templateUrl: './kanban-column.html',
  styleUrl: './kanban-column.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanColumn {
  readonly column = input.required<ColumnResponseDto>();
  readonly columns = input.required<readonly ColumnResponseDto[]>();
  readonly index = input.required<number>();
  readonly canEditTasks = input(false);
  readonly canManageColumns = input(false);
  readonly filterActive = input(false);
  readonly busyId = input<string | null>(null);

  readonly createTask = output<void>();
  readonly rename = output<void>();
  readonly remove = output<void>();
  readonly moveColumn = output<MoveDirection>();
  readonly editTask = output<TaskResponseDto>();
  readonly removeTask = output<TaskResponseDto>();
  readonly toggleTask = output<TaskResponseDto>();
  readonly moveTask = output<TaskMoveEvent>();
  readonly reorderTask = output<TaskReorderEvent>();

  protected readonly tasks = computed(() =>
    [...(this.column().tasks ?? [])].sort((a, b) => a.order - b.order),
  );
}
