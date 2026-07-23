'use client';

import { Box, Button, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

interface AddColumnComposerProps {
  title: string;
  isCreating: boolean;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const AddColumnComposer = ({
  title,
  isCreating,
  onTitleChange,
  onSubmit,
  onCancel,
}: AddColumnComposerProps) => {
  const t = useTranslations('BoardPage');

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 280 },
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRadius: '6px',
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TextField
        autoFocus
        size="small"
        fullWidth
        placeholder={t('columnTitle')}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onSubmit}
          disabled={isCreating}
        >
          {t('add')}
        </Button>
        <Button size="small" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </Box>
    </Box>
  );
};

export default AddColumnComposer;
