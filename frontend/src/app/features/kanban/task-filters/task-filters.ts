import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  TaskFilterAssignee,
  TaskFilterDue,
  TaskFilterPriority,
  TaskFilterState,
  TaskFilterStatus,
  defaultTaskFilters,
} from './task-filter.model';

@Component({
  selector: 'app-task-filters',
  imports: [TranslocoPipe],
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFilters {
  readonly filters = input.required<TaskFilterState>();
  readonly assignees = input<readonly TaskFilterAssignee[]>([]);
  readonly labels = input<readonly string[]>([]);
  readonly filtersChange = output<TaskFilterState>();

  protected readonly priorityValues: readonly TaskFilterPriority[] = [
    'low',
    'medium',
    'high',
    'urgent',
  ];
  protected readonly statusValues: readonly TaskFilterStatus[] = ['all', 'open', 'completed'];
  protected readonly dueValues: readonly TaskFilterDue[] = [
    'all',
    'overdue',
    'none',
    'today',
    'week',
  ];

  protected setSearch(event: Event): void {
    this.patch({ search: (event.target as HTMLInputElement).value.trim().slice(0, 200) });
  }

  protected setAssignee(event: Event): void {
    this.patch({ assigneeId: (event.target as HTMLSelectElement).value || null });
  }

  protected setStatus(event: Event): void {
    this.patch({ status: (event.target as HTMLSelectElement).value as TaskFilterStatus });
  }

  protected setDue(event: Event): void {
    this.patch({ due: (event.target as HTMLSelectElement).value as TaskFilterDue });
  }

  protected setFlag(key: 'mine' | 'unassigned', event: Event): void {
    this.patch({ [key]: (event.target as HTMLInputElement).checked });
  }

  protected togglePriority(priority: TaskFilterPriority): void {
    const selected = this.filters().priorities.includes(priority);
    this.patch({
      priorities: selected
        ? this.filters().priorities.filter((value) => value !== priority)
        : [...this.filters().priorities, priority],
    });
  }

  protected toggleLabel(label: string): void {
    const selected = this.filters().labels.includes(label);
    this.patch({
      labels: selected
        ? this.filters().labels.filter((value) => value !== label)
        : [...this.filters().labels, label],
    });
  }

  protected reset(): void {
    this.filtersChange.emit(defaultTaskFilters);
  }

  protected assigneeName(id: string): string {
    return this.assignees().find((assignee) => assignee.id === id)?.name ?? id;
  }

  protected patch(patch: Partial<TaskFilterState>): void {
    this.filtersChange.emit({ ...this.filters(), ...patch });
  }
}
