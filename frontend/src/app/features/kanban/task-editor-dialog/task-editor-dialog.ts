import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiCheckbox, TuiDialogContext, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiSelect, TuiTextarea } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import {
  BoardResponseDto,
  CreateTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from '@core/api/generated';
import { KanbanStore } from '@features/kanban/kanban.store';
import { AppButton } from '@shared/ui/app-button/app-button';

export interface TaskEditorDialogData {
  readonly board: BoardResponseDto;
  readonly columnId: string;
  readonly task?: TaskResponseDto;
  readonly canEdit: boolean;
}

const dateInputValue = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : '';

const labelsFromInput = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  );

@Component({
  selector: 'app-task-editor-dialog',
  imports: [
    AppButton,
    ReactiveFormsModule,
    TranslocoPipe,
    TuiCheckbox,
    TuiInput,
    TuiSelect,
    TuiTextarea,
    TuiTextfield,
  ],
  templateUrl: './task-editor-dialog.html',
  styleUrl: './task-editor-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditorDialog {
  private readonly dialog =
    inject<TuiDialogContext<BoardResponseDto | undefined, TaskEditorDialogData>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly data = this.dialog.data;
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);
  protected readonly store = inject(KanbanStore);

  protected readonly isCreate = !this.data.task;
  protected readonly members = [...(this.data.board.members ?? [])].sort((a, b) =>
    a.user.name.localeCompare(b.user.name),
  );
  protected readonly priorities: readonly CreateTaskDto['priority'][] = [
    'low',
    'medium',
    'high',
    'urgent',
  ];
  protected readonly assigneeIds = this.members.map(({ userId }) => userId);
  protected readonly stringifyPriority = (priority: CreateTaskDto['priority']): string =>
    this.transloco.translate(`kanban.priority.${priority}`);
  protected readonly stringifyAssignee = (id: string): string =>
    this.members.find(({ userId }) => userId === id)?.user.name ?? id;
  protected readonly form = this.formBuilder.nonNullable.group({
    title: [
      this.data.task?.title ?? '',
      [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/u)],
    ],
    description: [this.data.task?.description ?? ''],
    priority: [
      this.data.task?.priority ?? ('medium' as CreateTaskDto['priority']),
      [Validators.required],
    ],
    labels: [(this.data.task?.labels ?? []).join(', ')],
    dueDate: [dateInputValue(this.data.task?.dueDate)],
    assigneeId: [this.data.task?.assigneeId ?? ''],
    isCompleted: [this.data.task?.isCompleted ?? false],
  });
  protected readonly busy = computed(() => this.store.busyId() !== null);

  protected async submit(): Promise<void> {
    if (!this.data.canEdit) return;
    this.store.clearError();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const common = {
      title: value.title.trim(),
      description: value.description.trim(),
      priority: value.priority,
      labels: labelsFromInput(value.labels),
      dueDate: value.dueDate || null,
      isCompleted: value.isCompleted,
    };

    try {
      let mutation: Promise<BoardResponseDto>;
      if (this.data.task) {
        const update: UpdateTaskDto = common;
        if (value.assigneeId) update.assigneeId = value.assigneeId;
        mutation = this.store.updateTask(this.data.board.id, this.data.task.id, update);
      } else {
        const create: CreateTaskDto = {
          ...common,
          columnId: this.data.columnId,
          order:
            this.data.board.columns?.find((column) => column.id === this.data.columnId)?.tasks
              ?.length ?? 0,
        };
        if (value.assigneeId) create.assigneeId = value.assigneeId;
        mutation = this.store.createTask(this.data.board.id, create);
      }
      this.dialog.completeWith(undefined);
      await mutation;
    } catch {}
  }

  protected close(): void {
    this.dialog.completeWith(undefined);
  }
}
