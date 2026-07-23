import {
  DestroyRef,
  DOCUMENT,
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

const THEME_STORAGE_KEY = 'taskflow.theme';
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly systemPrefersDark = signal(false);

  readonly mode = signal<ThemeMode>('system');
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const mode = this.mode();

    return mode === 'system' ? (this.systemPrefersDark() ? 'dark' : 'light') : mode;
  });

  constructor() {
    if (this.isBrowser) {
      this.initializeBrowserPreference();
    }

    effect(() => {
      const mode = this.mode();
      const resolvedTheme = this.resolvedTheme();
      const root = this.document.documentElement;

      root.setAttribute('data-theme', resolvedTheme);
      root.style.colorScheme = resolvedTheme;

      if (this.isBrowser) {
        this.writeStoredMode(mode);
      }
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private initializeBrowserPreference(): void {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const storedMode = this.readStoredMode();
    const onPreferenceChange = (event: MediaQueryListEvent): void => {
      this.systemPrefersDark.set(event.matches);
    };

    this.systemPrefersDark.set(mediaQuery.matches);
    this.mode.set(storedMode);
    mediaQuery.addEventListener('change', onPreferenceChange);
    this.destroyRef.onDestroy(() => {
      mediaQuery.removeEventListener('change', onPreferenceChange);
    });
  }

  private readStoredMode(): ThemeMode {
    try {
      const storedMode = localStorage.getItem(THEME_STORAGE_KEY);

      return isThemeMode(storedMode) ? storedMode : 'system';
    } catch {
      return 'system';
    }
  }

  private writeStoredMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
    }
  }
}
