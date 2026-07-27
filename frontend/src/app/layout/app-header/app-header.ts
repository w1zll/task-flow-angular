import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiSelect } from '@taiga-ui/kit';

import { AuthStore } from '@core/auth/auth.store';
import { LocaleService } from '@core/i18n/locale';
import { ThemeMode, ThemeService } from '@core/theme/theme';

@Component({
  selector: 'app-header',
  imports: [FormsModule, RouterLink, TranslocoPipe, TuiButton, TuiSelect],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  protected readonly auth = inject(AuthStore);
  protected readonly locale = inject(LocaleService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  protected readonly languages = ['ru', 'en'] as const;
  protected readonly themes: readonly ThemeMode[] = ['system', 'light', 'dark'];
  protected readonly stringifyLanguage = (language: string): string => language.toUpperCase();
  protected readonly stringifyTheme = (theme: ThemeMode): string => {
    const labels =
      this.locale.language() === 'ru'
        ? { system: 'Системная', light: 'Светлая', dark: 'Тёмная' }
        : { system: 'System', light: 'Light', dark: 'Dark' };

    return labels[theme];
  };

  protected changeLanguage(event: Event): void {
    this.locale.setLanguage((event.target as HTMLSelectElement).value);
  }

  protected setLanguage(language: string): void {
    this.locale.setLanguage(language);
  }

  protected changeTheme(event: Event): void {
    this.theme.setMode((event.target as HTMLSelectElement).value as ThemeMode);
  }

  protected setTheme(theme: ThemeMode): void {
    this.theme.setMode(theme);
  }

  protected async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      await this.router.navigateByUrl('/');
    }
  }
}
