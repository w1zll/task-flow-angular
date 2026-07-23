'use client';

import { LabelOutlined } from '@mui/icons-material';
import { Box, Chip } from '@mui/material';

interface TaskLabelsProps {
  labels?: string[];
}

const TaskLabels = ({ labels }: TaskLabelsProps) => {
  if (!labels?.length) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
      {labels.slice(0, 3).map((label) => (
        <Chip
          key={label}
          label={label}
          size="small"
          icon={<LabelOutlined sx={{ fontSize: '12px !important' }} />}
          sx={{
            height: 20,
            fontSize: 11,
            maxWidth: '100%',
            '& .MuiChip-label': {
              px: 0.75,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      ))}
    </Box>
  );
};

export default TaskLabels;
