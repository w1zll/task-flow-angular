import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthenticationCompletionService } from '@core/auth/authentication-completion.service';
import { AuthStore } from '@core/auth/auth.store';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingSkeleton } from '@shared/ui/loading-skeleton/loading-skeleton';

const OAUTH_ERROR_CODES = [
  'account_exists',
  'email_unverified',
  'access_denied',
  'expired',
  'identity_in_use',
  'provider_unavailable',
] as const;

type OAuthErrorCode = (typeof OAUTH_ERROR_CODES)[number];

const isOAuthErrorCode = (value: string | null): value is OAuthErrorCode =>
  OAUTH_ERROR_CODES.some((code) => code === value);

@Component({
  selector: 'app-oauth-callback-page',
  imports: [AppButton, LoadingSkeleton, TranslocoPipe],
  templateUrl: './oauth-callback-page.html',
  styleUrl: './oauth-callback-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallbackPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly completion = inject(AuthenticationCompletionService);

  protected readonly loading = signal(true);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly canRetryRequest = signal(false);

  ngOnInit(): void {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error !== null) {
      const safeError: OAuthErrorCode = isOAuthErrorCode(error) ? error : 'provider_unavailable';
      this.errorKey.set(`auth.oauth.errors.${safeError}`);
      this.loading.set(false);
      return;
    }

    void this.complete();
  }

  protected retry(): void {
    if (this.canRetryRequest()) {
      void this.complete();
      return;
    }

    void this.router.navigate(['/auth/login']);
  }

  private async complete(): Promise<void> {
    this.loading.set(true);
    this.errorKey.set(null);
    this.canRetryRequest.set(false);

    try {
      const user = await this.auth.completeOAuth();
      const destination = await this.completion.finishAuthentication(user);
      await this.router.navigateByUrl(destination);
    } catch {
      this.errorKey.set('auth.oauth.errors.session');
      this.canRetryRequest.set(true);
      this.loading.set(false);
    }
  }
}
