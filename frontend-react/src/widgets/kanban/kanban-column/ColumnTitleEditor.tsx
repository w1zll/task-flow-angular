'use client';

import { Check, Close } from '@mui/icons-material';
import { Box, IconButton, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

interface ColumnTitleEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const ColumnTitleEditor = ({
  value,
  onChange,
  onSubmit,
  onCancel,
}: ColumnTitleEditorProps) => {
  const t = useTranslations('KanbanColumn');

  return (
    <TextField
      autoFocus
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSubmit();
        if (event.key === 'Escape') onCancel();
      }}
      sx={{ flex: 1, mr: 1 }}
      slotProps={{
        htmlInput: {
          'aria-label': t('columnTitle'),
          style: { fontWeight: 600 },
        },
        input: {
          endAdornment: (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <IconButton
                size="small"
                aria-label={t('saveColumnTitle')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onSubmit}
              >
                <Check fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={t('cancelColumnTitle')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onCancel}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          ),
        },
      }}
    />
  );
};

export default ColumnTitleEditor;
