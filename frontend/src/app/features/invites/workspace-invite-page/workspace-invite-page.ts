import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '@core/api/api-error';
import { WorkspaceInvitesApi } from '@core/api/clients/workspace-invites-api';
import { WorkspaceInvitePreviewDto } from '@core/api/generated';
import { AuthStore } from '@core/auth/auth.store';
import { PendingWorkspaceInviteService } from '@core/invites/pending-workspace-invite.service';
import { WorkspaceStore } from '@features/workspaces/workspace.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

@Component({
  selector: 'app-workspace-invite-page',
  imports: [AppButton, DatePipe, LoadingSkeleton, RouterLink, TranslocoPipe],
  templateUrl: './workspace-invite-page.html',
  styleUrl: './workspace-invite-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceInvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitesApi = inject(WorkspaceInvitesApi);
  private readonly pendingInvite = inject(PendingWorkspaceInviteService);
  private readonly workspaces = inject(WorkspaceStore);
  protected readonly auth = inject(AuthStore);

  protected readonly preview = signal<WorkspaceInvitePreviewDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly accepting = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly nextUrl = `/invite/${encodeURIComponent(this.token)}`;

  ngOnInit(): void {
    void this.load();
  }

  protected rememberInvite(): void {
    this.pendingInvite.save(this.token);
  }

  protected async accept(): Promise<void> {
    if (this.accepting()) return;
    this.accepting.set(true);
    this.errorKey.set(null);

    try {
      const workspace = await this.pendingInvite.accept(this.token);
      if (!workspace) return;

      this.workspaces.integrateAcceptedWorkspace(workspace);
      await this.router.navigate(['/workspaces', workspace.id, 'boards']);
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'not-found') {
        this.clearCurrentPendingToken();
      }
      this.errorKey.set(this.acceptErrorKey(error));
    } finally {
      this.accepting.set(false);
    }
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.errorKey.set(null);

    if (!this.token) {
      this.errorKey.set('invites.errors.unavailable');
      this.loading.set(false);
      return;
    }

    try {
      const [preview] = await Promise.all([
        firstValueFrom(this.invitesApi.preview({ token: this.token })),
        this.auth.bootstrap(),
      ]);
      this.preview.set(preview);
      if (!this.auth.isAuthenticated()) this.pendingInvite.save(this.token);
    } catch (error) {
      this.preview.set(null);
      if (error instanceof ApiError && error.kind === 'not-found') {
        this.clearCurrentPendingToken();
      }
      this.errorKey.set(this.previewErrorKey(error));
    } finally {
      this.loading.set(false);
    }
  }

  private previewErrorKey(error: unknown): string {
    if (error instanceof ApiError && error.kind === 'not-found') {
      return 'invites.errors.expiredOrInvalid';
    }
    return 'invites.errors.unavailable';
  }

  private acceptErrorKey(error: unknown): string {
    if (!(error instanceof ApiError)) return 'invites.errors.accept';
    if (error.kind === 'not-found') return 'invites.errors.expiredOrInvalid';
    if (error.kind === 'forbidden') return 'invites.errors.restricted';
    return 'invites.errors.accept';
  }

  private clearCurrentPendingToken(): void {
    if (this.pendingInvite.peek() === this.token) this.pendingInvite.clear();
  }
}
