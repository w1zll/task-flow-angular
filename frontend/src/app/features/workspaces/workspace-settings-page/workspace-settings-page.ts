import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TuiDialogService, TuiInput } from '@taiga-ui/core';
import { TuiSelect } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { WorkspaceInvitesApi } from '@core/api/clients/workspace-invites-api';
import { WorkspacesApi } from '@core/api/clients/workspaces-api';
import {
  WorkspaceInviteResponseDto,
  WorkspaceMemberResponseDto,
  WorkspaceResponseDto,
} from '@core/api/generated';
import { AuthStore } from '@core/auth/auth.store';
import { QueryCacheStore } from '@core/cache/query-cache.store';
import { queryKeys } from '@core/cache/query-key';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import {
  WorkspaceDeleteDialog,
  WorkspaceDeleteResult,
} from '@features/workspaces/workspace-delete-dialog/workspace-delete-dialog';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

type MemberRole = 'admin' | 'member';

@Component({
  selector: 'app-workspace-settings-page',
  imports: [
    AppButton,
    FormsModule,
    LoadingSkeleton,
    LocalizedDatePipe,
    ReactiveFormsModule,
    TranslocoPipe,
    TuiCardLarge,
    TuiInput,
    TuiSelect,
  ],
  templateUrl: './workspace-settings-page.html',
  styleUrl: './workspace-settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(TuiDialogService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly workspacesApi = inject(WorkspacesApi);
  private readonly invitesApi = inject(WorkspaceInvitesApi);
  private readonly cache = inject(QueryCacheStore);
  private readonly workspaceStore = inject(WorkspaceStore);
  protected readonly auth = inject(AuthStore);

  protected readonly workspaceId = this.route.parent?.snapshot.paramMap.get('workspaceId') ?? '';
  protected readonly workspace = computed(() =>
    this.workspaceStore.workspaces().find((item) => item.id === this.workspaceId),
  );
  protected readonly inviteRoles = computed<readonly MemberRole[]>(() =>
    this.workspace()?.currentUserRole === 'owner' ? ['member', 'admin'] : ['member'],
  );
  protected readonly memberRoles: readonly MemberRole[] = ['admin', 'member'];
  protected readonly stringifyRole = (role: MemberRole): string =>
    this.transloco.translate(`workspaces.roles.${role}`);
  private readonly membersQuery = this.cache.entry<readonly WorkspaceMemberResponseDto[]>(
    queryKeys.workspaceMembers(this.workspaceId),
  );
  private readonly invitesQuery = this.cache.entry<readonly WorkspaceInviteResponseDto[]>(
    queryKeys.workspaceInvites(this.workspaceId),
  );
  protected readonly members = computed(() => this.membersQuery()?.data ?? []);
  protected readonly invites = computed(() => this.invitesQuery()?.data ?? []);
  protected readonly loading = signal(true);
  protected readonly loadErrorKey = signal<string | null>(null);
  protected readonly mutationErrorKey = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly confirmRemoveId = signal<string | null>(null);
  protected readonly createdInviteUrl = signal<string | null>(null);
  protected readonly copyStatusKey = signal<string | null>(null);

  protected readonly canManageInvites = computed(() => {
    const role = this.workspace()?.currentUserRole;
    return role === 'owner' || role === 'admin';
  });

  protected readonly inviteForm = this.formBuilder.group({
    defaultRole: this.formBuilder.nonNullable.control<MemberRole>('member'),
    expiresInDays: this.formBuilder.nonNullable.control(7, [
      Validators.required,
      Validators.min(1),
      Validators.max(30),
    ]),
    maxUses: this.formBuilder.control<number | null>(null, [
      Validators.min(1),
      Validators.max(1000),
    ]),
    allowedEmail: this.formBuilder.nonNullable.control('', [Validators.email]),
    allowedEmailDomain: this.formBuilder.nonNullable.control('', [
      Validators.pattern(/^(?!-)(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/u),
    ]),
  });

  ngOnInit(): void {
    void this.load();
  }

  protected canChangeRole(member: WorkspaceMemberResponseDto): boolean {
    return this.workspace()?.currentUserRole === 'owner' && member.role !== 'owner';
  }

  protected canRemove(member: WorkspaceMemberResponseDto): boolean {
    if (member.role === 'owner' || member.userId === this.auth.user()?.id) return false;

    const role = this.workspace()?.currentUserRole;
    return role === 'owner' || (role === 'admin' && member.role === 'member');
  }

  protected async changeRole(member: WorkspaceMemberResponseDto, event: Event): Promise<void> {
    const role = (event.target as HTMLSelectElement).value as MemberRole;
    await this.updateMemberRole(member, role);
  }

  protected changeRoleValue(member: WorkspaceMemberResponseDto, role: MemberRole): void {
    void this.updateMemberRole(member, role);
  }

  private async updateMemberRole(
    member: WorkspaceMemberResponseDto,
    role: MemberRole,
  ): Promise<void> {
    if (role === member.role || !this.canChangeRole(member)) return;

    this.busyId.set(member.id);
    this.mutationErrorKey.set(null);
    try {
      const updated = await firstValueFrom(
        this.workspacesApi.updateMemberRole({
          id: this.workspaceId,
          memberId: member.id,
          body: { role },
        }),
      );
      this.cache.update<readonly WorkspaceMemberResponseDto[]>(
        queryKeys.workspaceMembers(this.workspaceId),
        (members = []) => members.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      this.mutationErrorKey.set(this.errorKey(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected requestRemove(memberId: string): void {
    this.confirmRemoveId.set(memberId);
  }

  protected cancelRemove(): void {
    this.confirmRemoveId.set(null);
  }

  protected async removeMember(member: WorkspaceMemberResponseDto): Promise<void> {
    if (!this.canRemove(member)) return;

    this.busyId.set(member.id);
    this.mutationErrorKey.set(null);
    try {
      await firstValueFrom(
        this.workspacesApi.removeMember({ id: this.workspaceId, memberId: member.id }),
      );
      this.cache.update<readonly WorkspaceMemberResponseDto[]>(
        queryKeys.workspaceMembers(this.workspaceId),
        (members = []) => members.filter((item) => item.id !== member.id),
      );
      this.confirmRemoveId.set(null);
    } catch (error) {
      this.mutationErrorKey.set(this.errorKey(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async createInvite(): Promise<void> {
    this.createdInviteUrl.set(null);
    this.copyStatusKey.set(null);
    this.mutationErrorKey.set(null);
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.busyId.set('create-invite');
    const value = this.inviteForm.getRawValue();
    try {
      const created = await firstValueFrom(
        this.invitesApi.create({
          workspaceId: this.workspaceId,
          body: {
            defaultRole: value.defaultRole,
            expiresInDays: value.expiresInDays,
            maxUses: value.maxUses,
            allowedEmail: value.allowedEmail.trim() || null,
            allowedEmailDomain: value.allowedEmailDomain.trim().replace(/^@/u, '') || null,
          },
        }),
      );
      this.cache.update<readonly WorkspaceInviteResponseDto[]>(
        queryKeys.workspaceInvites(this.workspaceId),
        (invites = []) => [created, ...invites.filter((invite) => invite.id !== created.id)],
      );
      this.createdInviteUrl.set(this.inviteUrl(created.token));
      this.inviteForm.reset({
        defaultRole: 'member',
        expiresInDays: 7,
        maxUses: null,
        allowedEmail: '',
        allowedEmailDomain: '',
      });
    } catch (error) {
      this.mutationErrorKey.set(this.errorKey(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async copyInvite(): Promise<void> {
    const url = this.createdInviteUrl();
    if (!url || !isPlatformBrowser(this.platformId)) return;

    try {
      await navigator.clipboard.writeText(url);
      this.copyStatusKey.set('invites.settings.copied');
    } catch {
      this.copyStatusKey.set('invites.settings.copyFailed');
    }
  }

  protected async revokeInvite(invite: WorkspaceInviteResponseDto): Promise<void> {
    this.busyId.set(invite.id);
    this.mutationErrorKey.set(null);
    try {
      await firstValueFrom(
        this.invitesApi.revoke({ workspaceId: this.workspaceId, inviteId: invite.id }),
      );
      this.cache.update<readonly WorkspaceInviteResponseDto[]>(
        queryKeys.workspaceInvites(this.workspaceId),
        (invites = []) => invites.filter((item) => item.id !== invite.id),
      );
    } catch (error) {
      this.mutationErrorKey.set(this.errorKey(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async openDeleteDialog(workspace: WorkspaceResponseDto): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open<WorkspaceDeleteResult | undefined>(
        new PolymorpheusComponent(WorkspaceDeleteDialog),
        {
          closable: false,
          data: workspace,
          label: this.transloco.translate('workspaces.delete.title'),
          size: 's',
        },
      ),
      { defaultValue: undefined },
    );
    if (!result) return;

    await this.router.navigate(
      result.fallbackId ? ['/workspaces', result.fallbackId, 'boards'] : ['/workspaces'],
    );
  }

  protected retry(): void {
    void this.load(true);
  }

  private async load(force = false): Promise<void> {
    this.loading.set(true);
    this.loadErrorKey.set(null);
    await this.workspaceStore.load(force);

    try {
      const membersPromise = firstValueFrom(
        this.cache.execute(
          queryKeys.workspaceMembers(this.workspaceId),
          () => this.workspacesApi.members({ id: this.workspaceId }),
          { staleTime: 30_000, force },
        ),
      );
      const invitesPromise = this.canManageInvites()
        ? firstValueFrom(
            this.cache.execute(
              queryKeys.workspaceInvites(this.workspaceId),
              () => this.invitesApi.list({ workspaceId: this.workspaceId }),
              { staleTime: 30_000, force },
            ),
          )
        : Promise.resolve([] as readonly WorkspaceInviteResponseDto[]);
      await Promise.all([membersPromise, invitesPromise]);
    } catch (error) {
      this.loadErrorKey.set(this.errorKey(error));
    } finally {
      this.loading.set(false);
    }
  }

  private inviteUrl(token: string): string {
    const path = `/invite/${encodeURIComponent(token)}`;
    return isPlatformBrowser(this.platformId) ? `${location.origin}${path}` : path;
  }

  private errorKey(error: unknown): string {
    if (!(error instanceof ApiError)) return 'workspaces.errors.unknown';
    if (error.kind === 'forbidden') return 'workspaces.errors.forbidden';
    if (error.kind === 'not-found') return 'workspaces.errors.notFound';
    if (error.kind === 'validation') return 'workspaces.errors.invalidData';
    if (error.kind === 'network' || error.kind === 'server') {
      return 'workspaces.errors.unavailable';
    }
    return 'workspaces.errors.unknown';
  }
}
