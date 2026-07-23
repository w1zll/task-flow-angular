'use client';

import { ArrowBack } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface BoardNotFoundStateProps {
  onBack: () => void;
}

const BoardNotFoundState = ({ onBack }: BoardNotFoundStateProps) => {
  const t = useTranslations('BoardPage');

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: 2,
        }}
      >
        <Typography variant="h5" color="text.secondary">
          {t('notFound')}
        </Typography>
        <Button variant="contained" startIcon={<ArrowBack />} onClick={onBack}>
          {t('backToBoards')}
        </Button>
      </Box>
    </Box>
  );
};

export default BoardNotFoundState;
