import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthStore } from '@core/auth/auth.store';
import { LocaleService } from '@core/i18n/locale';
import { ThemeMode, ThemeService } from '@core/theme/theme';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  protected readonly auth = inject(AuthStore);
  protected readonly locale = inject(LocaleService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected changeLanguage(event: Event): void {
    this.locale.setLanguage((event.target as HTMLSelectElement).value);
  }

  protected changeTheme(event: Event): void {
    this.theme.setMode((event.target as HTMLSelectElement).value as ThemeMode);
  }

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/');
    }
  }
}
