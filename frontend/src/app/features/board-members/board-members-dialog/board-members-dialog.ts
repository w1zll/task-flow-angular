import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  BoardMemberResponseDto,
  BoardResponseDto,
  WorkspaceMemberResponseDto,
} from '@core/api/generated';
import { BoardMembersStore } from '@features/board-members/board-members.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

type BoardMemberRole = 'editor' | 'viewer';

@Component({
  selector: 'app-board-members-dialog',
  imports: [AppButton, LoadingSkeleton, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './board-members-dialog.html',
  styleUrl: './board-members-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardMembersDialog implements OnInit {
  protected readonly board = inject<BoardResponseDto>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<readonly BoardMemberResponseDto[]>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(BoardMembersStore);

  protected readonly members = signal<readonly BoardMemberResponseDto[]>([]);
  protected readonly workspaceMembers = signal<readonly WorkspaceMemberResponseDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly confirmRemoveId = signal<string | null>(null);
  protected readonly canManage = this.board.capabilities.canManageBoardMembers;
  protected readonly owner = computed(() =>
    this.members().find((member) => member.role === 'owner'),
  );
  protected readonly regularMembers = computed(() =>
    this.members().filter((member) => member.role !== 'owner'),
  );
  protected readonly candidates = computed(() => {
    const memberUserIds = new Set(this.members().map((member) => member.userId));
    return this.workspaceMembers().filter((member) => !memberUserIds.has(member.userId));
  });
  protected readonly addForm = this.formBuilder.nonNullable.group({
    userId: ['', Validators.required],
    role: ['editor' as BoardMemberRole, Validators.required],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async addMember(): Promise<void> {
    this.store.clearError();
    if (!this.canManage || this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const value = this.addForm.getRawValue();
    try {
      const member = await this.store.add(this.board.id, value.userId, value.role);
      this.members.update((members) => [
        ...members.filter((item) => item.userId !== member.userId),
        member,
      ]);
      this.addForm.reset({ userId: '', role: 'editor' });
    } catch {}
  }

  protected async changeRole(member: BoardMemberResponseDto, event: Event): Promise<void> {
    const memberId = member.id;
    if (!this.canManage || !memberId || member.role === 'owner') return;

    const role = (event.target as HTMLSelectElement).value as BoardMemberRole;
    if (role === member.role) return;

    this.store.clearError();
    try {
      const updated = await this.store.updateRole(this.board.id, memberId, role);
      this.members.update((members) =>
        members.map((item) => (item.id === memberId ? updated : item)),
      );
    } catch {}
  }

  protected requestRemove(member: BoardMemberResponseDto): void {
    if (member.id) this.confirmRemoveId.set(member.id);
  }

  protected cancelRemove(): void {
    this.confirmRemoveId.set(null);
  }

  protected async removeMember(member: BoardMemberResponseDto): Promise<void> {
    const memberId = member.id;
    if (!this.canManage || !memberId || member.role === 'owner') return;

    this.store.clearError();
    try {
      await this.store.remove(this.board.id, memberId);
      this.members.update((members) => members.filter((item) => item.id !== memberId));
      this.confirmRemoveId.set(null);
    } catch {}
  }

  protected retry(): void {
    void this.load(true);
  }

  protected close(): void {
    this.dialogRef.close(this.members());
  }

  private async load(force = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.store.clearError();

    try {
      const result = await this.store.load(this.board.id, this.board.workspaceId, force);
      this.members.set(result.members);
      this.workspaceMembers.set(result.workspaceMembers);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
