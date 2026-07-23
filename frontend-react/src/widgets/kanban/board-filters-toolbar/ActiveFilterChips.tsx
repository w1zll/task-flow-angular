'use client';

import { alpha, Chip, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { ActiveFilterChip } from './types';

interface ActiveFilterChipsProps {
  activeChips: ActiveFilterChip[];
  isReorderDisabled: boolean;
}

const ActiveFilterChips = ({
  activeChips,
  isReorderDisabled,
}: ActiveFilterChipsProps) => {
  const t = useTranslations('BoardPage.filters');

  if (!activeChips.length && !isReorderDisabled) return null;

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
      {activeChips.map((chip) => (
        <Chip
          key={chip.key}
          size="small"
          label={chip.label}
          onDelete={chip.onDelete}
        />
      ))}
      {isReorderDisabled && (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={t('reorderDisabled')}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
          }}
        />
      )}
    </Stack>
  );
};

export default ActiveFilterChips;
