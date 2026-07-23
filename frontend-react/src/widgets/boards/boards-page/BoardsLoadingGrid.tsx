'use client';

import { Grid, Skeleton } from '@mui/material';

const BoardsLoadingGrid = () => (
  <Grid container spacing={2}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
        <Skeleton variant="rounded" height={160} />
      </Grid>
    ))}
  </Grid>
);

export default BoardsLoadingGrid;
