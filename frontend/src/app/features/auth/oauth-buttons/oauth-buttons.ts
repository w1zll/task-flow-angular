import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { AuthApi } from '@core/api/clients/auth-api';
import { BackendAvailabilityStore } from '@core/backend/backend-availability.store';
import { PendingWorkspaceInviteService } from '@core/invites/pending-workspace-invite.service';
import { AppButton } from '@shared/ui/app-button/app-button';

export type OAuthProvider = 'google' | 'github';

@Component({
  selector: 'app-oauth-buttons',
  imports: [AppButton, TranslocoPipe],
  templateUrl: './oauth-buttons.html',
  styleUrl: './oauth-buttons.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthButtons implements OnInit {
  private readonly authApi = inject(AuthApi);
  private readonly backend = inject(BackendAvailabilityStore);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly pendingInvite = inject(PendingWorkspaceInviteService);
  private readonly route = inject(ActivatedRoute);

  protected readonly providers = signal<readonly OAuthProvider[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly redirectingProvider = signal<OAuthProvider | null>(null);

  ngOnInit(): void {
    void this.loadProviders();
  }

  protected startOAuth(provider: OAuthProvider): void {
    if (!this.isBrowser || this.redirectingProvider()) return;

    this.rememberPendingInvite();
    this.redirectingProvider.set(provider);
    this.document.location.assign(`/api/auth/oauth/${provider}/start`);
  }

  protected retry(): void {
    void this.loadProviders();
  }

  private async loadProviders(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);

    try {
      await this.backend.waitUntilReady();
      const response = await firstValueFrom(this.authApi.providers());
      this.providers.set(
        response.providers.filter(
          (provider): provider is OAuthProvider => provider === 'google' || provider === 'github',
        ),
      );
    } catch {
      this.providers.set([]);
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private rememberPendingInvite(): void {
    const next = this.route.snapshot.queryParamMap.get('next');
    const match = next?.match(/^\/invite\/([^/?#]+)$/u);
    if (!match?.[1]) return;

    try {
      this.pendingInvite.save(decodeURIComponent(match[1]));
    } catch {}
  }
}
