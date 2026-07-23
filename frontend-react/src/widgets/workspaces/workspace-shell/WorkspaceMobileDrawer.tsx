'use client';

import { Drawer } from '@mui/material';
import type { ReactNode } from 'react';
import { drawerWidth } from './WorkspaceDesktopDrawer';

interface WorkspaceMobileDrawerProps {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
}

const WorkspaceMobileDrawer = ({
  open,
  children,
  onClose,
}: WorkspaceMobileDrawerProps) => (
  <Drawer
    variant="temporary"
    open={open}
    onClose={onClose}
    ModalProps={{ keepMounted: true }}
    sx={{
      display: { xs: 'block', md: 'none' },
      '& .MuiDrawer-paper': {
        width: Math.min(drawerWidth, 320),
      },
    }}
  >
    {children}
  </Drawer>
);

export default WorkspaceMobileDrawer;
