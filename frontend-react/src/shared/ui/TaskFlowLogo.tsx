'use client';

import { Box, type SxProps, type Theme } from '@mui/material';

interface TaskFlowLogoProps {
  size?: number;
  sx?: SxProps<Theme>;
}

const TaskFlowLogo = ({ size = 32, sx }: TaskFlowLogoProps) => (
  <Box
    component="img"
    src="/icons/taskflow-icon.svg"
    alt="TaskFlow"
    width={size}
    height={size}
    sx={[
      {
        display: 'block',
        width: size,
        height: size,
        flexShrink: 0,
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  />
);

export default TaskFlowLogo;
