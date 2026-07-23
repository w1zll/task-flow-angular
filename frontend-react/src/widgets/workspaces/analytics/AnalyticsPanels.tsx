'use client';

import { Box, Paper, Skeleton, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  helper: string;
  tone?: 'default' | 'warning' | 'success';
  isLoading: boolean;
}

export const AnalyticsStatCard = ({
  icon,
  label,
  value,
  helper,
  tone = 'default',
  isLoading,
}: StatCardProps) => {
  const theme = useTheme();
  const color =
    tone === 'warning'
      ? theme.palette.warning.main
      : tone === 'success'
        ? theme.palette.success.main
        : theme.palette.primary.main;

  return (
    <Paper
      variant="outlined"
      sx={{ height: '100%', minWidth: 0, p: { xs: 1.75, sm: 2 }, borderRadius: '8px' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color,
            bgcolor: alpha(color, 0.12),
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 800 }}>
            {isLoading ? <Skeleton width={56} /> : value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', overflowWrap: 'anywhere' }}
          >
            {isLoading ? <Skeleton width={130} /> : helper}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

interface ChartPanelProps {
  title: string;
  description: string;
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}

export const AnalyticsChartPanel = ({
  title,
  description,
  isLoading,
  isEmpty,
  emptyText,
  children,
}: ChartPanelProps) => (
  <Paper
    variant="outlined"
    sx={{ height: '100%', minWidth: 0, p: { xs: 1.75, sm: 2 }, borderRadius: '8px' }}
  >
    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
      {title}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.25, mb: 1.5, overflowWrap: 'anywhere' }}
    >
      {description}
    </Typography>
    {isLoading ? (
      <Skeleton variant="rounded" height={250} />
    ) : isEmpty ? (
      <Box sx={{ height: 250, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      </Box>
    ) : (
      <Box sx={{ minWidth: 0, height: 270 }}>{children}</Box>
    )}
  </Paper>
);
