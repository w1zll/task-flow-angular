'use client';

import { setLocaleAction } from '@/shared/actions/locale.action';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import { syncOfflineDocumentLocale } from '@/shared/lib/offline-navigation-cache';
import { Button, ButtonGroup } from '@mui/material';
import { Locale, useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useTransition } from 'react';

const LocaleSwitcher = () => {
  const locale = useLocale();
  const t = useTranslations('Header');
  const router = useRouter();
  const isOffline = useIsOffline();
  const { enqueueSnackbar } = useSnackbar();
  const [isPending, startTransition] = useTransition();

  const handleChange = (newLocale: Locale) => {
    if (isOffline) {
      enqueueSnackbar(t('localeOfflineUnavailable'), { variant: 'warning' });
      return;
    }

    startTransition(async () => {
      await setLocaleAction(newLocale);
      await syncOfflineDocumentLocale(newLocale);
      router.refresh();
    });
  };

  return (
    <ButtonGroup size="small" disabled={isPending}>
      <Button
        variant={locale === 'en' ? 'contained' : 'outlined'}
        onClick={() => handleChange('en')}
      >
        EN
      </Button>
      <Button
        variant={locale === 'ru' ? 'contained' : 'outlined'}
        onClick={() => handleChange('ru')}
      >
        RU
      </Button>
    </ButtonGroup>
  );
};

export default LocaleSwitcher;
