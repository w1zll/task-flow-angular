import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiSelect } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import {
  BoardMemberResponseDto,
  BoardResponseDto,
  WorkspaceMemberResponseDto,
} from '@core/api/generated';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';
import { BoardMembersStore } from '@features/board-members/board-members.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

type BoardMemberRole = 'editor' | 'viewer';

@Component({
  selector: 'app-board-members-dialog',
  imports: [AppButton, FormsModule, LoadingSkeleton, ReactiveFormsModule, TranslocoPipe, TuiSelect],
  templateUrl: './board-members-dialog.html',
  styleUrl: './board-members-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardMembersDialog implements OnInit {
  private readonly dialog =
    inject<TuiDialogContext<readonly BoardMemberResponseDto[], BoardResponseDto>>(
      POLYMORPHEUS_CONTEXT,
    );
  protected readonly board = this.dialog.data;
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);
  private readonly cache = inject(QueryCacheStore);
  protected readonly store = inject(BoardMembersStore);

  private readonly membersQuery = this.cache.entry<readonly BoardMemberResponseDto[]>(
    queryKeys.boardMembers(this.board.id),
  );
  private readonly workspaceMembersQuery = this.cache.entry<readonly WorkspaceMemberResponseDto[]>(
    queryKeys.workspaceMembers(this.board.workspaceId),
  );
  protected readonly members = computed(() => this.membersQuery()?.data ?? []);
  protected readonly workspaceMembers = computed(() => this.workspaceMembersQuery()?.data ?? []);
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
  protected readonly candidateIds = computed(() => this.candidates().map(({ userId }) => userId));
  protected readonly roles: readonly BoardMemberRole[] = ['editor', 'viewer'];
  protected readonly stringifyCandidate = (id: string): string => {
    const candidate = this.candidates().find(({ userId }) => userId === id);

    return candidate ? `${candidate.user.name} · ${candidate.user.email}` : id;
  };
  protected readonly stringifyRole = (role: BoardMemberRole): string =>
    this.transloco.translate(`workspaces.roles.${role}`);
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
      await this.store.add(this.board.id, value.userId, value.role);
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
      await this.store.updateRole(this.board.id, memberId, role);
    } catch {}
  }

  protected changeRoleValue(member: BoardMemberResponseDto, role: BoardMemberRole): void {
    void this.updateRole(member, role);
  }

  private async updateRole(member: BoardMemberResponseDto, role: BoardMemberRole): Promise<void> {
    const memberId = member.id;
    if (!this.canManage || !memberId || member.role === 'owner' || role === member.role) return;

    this.store.clearError();
    try {
      await this.store.updateRole(this.board.id, memberId, role);
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
      this.confirmRemoveId.set(null);
    } catch {}
  }

  protected retry(): void {
    void this.load(true);
  }

  protected close(): void {
    this.dialog.completeWith(this.members());
  }

  private async load(force = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.store.clearError();

    try {
      await this.store.load(this.board.id, this.board.workspaceId, force);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
