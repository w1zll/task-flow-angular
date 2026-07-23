import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const LANGUAGES = ['ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'ru';

const LANGUAGE_STORAGE_KEY = 'taskflow.language';

export const isLanguage = (value: string | null): value is Language =>
  LANGUAGES.some((language) => language === value);

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly language = signal<Language>(this.resolveInitialLanguage());

  constructor() {
    effect(() => {
      const language = this.language();

      this.document.documentElement.lang = language;
      this.transloco.setActiveLang(language);

      if (this.isBrowser) {
        this.writeStoredLanguage(language);
      }
    });
  }

  setLanguage(language: string): void {
    if (isLanguage(language)) {
      this.language.set(language);
    }
  }

  private resolveInitialLanguage(): Language {
    if (!this.isBrowser) {
      return DEFAULT_LANGUAGE;
    }

    try {
      const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (isLanguage(storedLanguage)) {
        return storedLanguage;
      }
    } catch {
    }

    return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  }

  private writeStoredLanguage(language: Language): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
    }
  }
}
