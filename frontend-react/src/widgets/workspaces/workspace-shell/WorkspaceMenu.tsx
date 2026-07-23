'use client';

import type { Workspace } from '@/shared/api/api';
import { Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface WorkspaceMenuProps {
  anchorEl: HTMLElement | null;
  selectedWorkspaceId: string;
  workspaces: Workspace[];
  onClose: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
}

const WorkspaceMenu = ({
  anchorEl,
  selectedWorkspaceId,
  workspaces,
  onClose,
  onSelectWorkspace,
}: WorkspaceMenuProps) => {
  const t = useTranslations('WorkspaceShell');

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{ paper: { sx: { minWidth: 260 } } }}
    >
      {workspaces.map((item) => (
        <MenuItem
          key={item.id}
          selected={item.id === selectedWorkspaceId}
          onClick={() => onSelectWorkspace(item.id)}
        >
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.isPersonal
                ? t('personal')
                : t(`role.${item.currentUserRole}`)}
            </Typography>
          </Stack>
        </MenuItem>
      ))}
    </Menu>
  );
};

export default WorkspaceMenu;
