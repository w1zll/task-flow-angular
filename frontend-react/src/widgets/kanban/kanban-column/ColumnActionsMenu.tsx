'use client';

import { Delete, Edit } from '@mui/icons-material';
import { Menu, MenuItem } from '@mui/material';
import { useTranslations } from 'next-intl';

interface ColumnActionsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const ColumnActionsMenu = ({
  anchorEl,
  onClose,
  onRename,
  onDelete,
}: ColumnActionsMenuProps) => {
  const t = useTranslations('KanbanColumn');

  return (
    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
      <MenuItem onClick={onRename}>
        <Edit fontSize="small" sx={{ mr: 1 }} /> {t('rename')}
      </MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
        <Delete fontSize="small" sx={{ mr: 1 }} /> {t('delete')}
      </MenuItem>
    </Menu>
  );
};

export default ColumnActionsMenu;
