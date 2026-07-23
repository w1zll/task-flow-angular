'use client';

import { Drawer } from '@mui/material';
import type { ReactNode } from 'react';

export const drawerWidth = 286;

interface WorkspaceDesktopDrawerProps {
  children: ReactNode;
}

const WorkspaceDesktopDrawer = ({
  children,
}: WorkspaceDesktopDrawerProps) => (
  <Drawer
    variant="permanent"
    open
    sx={{
      display: { xs: 'none', md: 'block' },
      width: drawerWidth,
      flexShrink: 0,
      '& .MuiDrawer-paper': {
        position: 'sticky',
        top: 0,
        width: drawerWidth,
        height: {
          xs: 'calc(100dvh - 56px)',
          sm: 'calc(100dvh - 64px)',
        },
        borderRight: '1px solid',
        borderColor: 'divider',
      },
    }}
  >
    {children}
  </Drawer>
);

export default WorkspaceDesktopDrawer;
