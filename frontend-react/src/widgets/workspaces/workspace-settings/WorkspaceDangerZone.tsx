'use client';

import { DeleteOutlined } from '@mui/icons-material';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface WorkspaceDangerZoneProps {
  onDeleteWorkspace: () => void;
}

const WorkspaceDangerZone = ({
  onDeleteWorkspace,
}: WorkspaceDangerZoneProps) => {
  const t = useTranslations('WorkspaceSettings');

  return (
    <Paper
      variant="outlined"
      sx={{
        borderColor: 'error.main',
        borderRadius: '6px',
        mt: 3,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" color="error" sx={{ fontWeight: 600 }}>
          {t('dangerZoneTitle')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ overflowWrap: 'anywhere' }}
        >
          {t('deleteWorkspaceDescription')}
        </Typography>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlined />}
          onClick={onDeleteWorkspace}
          sx={{ mt: 2 }}
        >
          {t('deleteWorkspace')}
        </Button>
      </Box>
    </Paper>
  );
};

export default WorkspaceDangerZone;
