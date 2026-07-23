import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

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
  protected readonly locale = inject(LocaleService);
  protected readonly theme = inject(ThemeService);

  protected changeLanguage(event: Event): void {
    this.locale.setLanguage((event.target as HTMLSelectElement).value);
  }

  protected changeTheme(event: Event): void {
    this.theme.setMode((event.target as HTMLSelectElement).value as ThemeMode);
  }
}
