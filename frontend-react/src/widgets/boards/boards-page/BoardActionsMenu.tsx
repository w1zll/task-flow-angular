'use client';

import { Delete } from '@mui/icons-material';
import { Menu, MenuItem } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { BoardMenuAnchor } from './types';

interface BoardActionsMenuProps {
  anchor: BoardMenuAnchor | null;
  onClose: () => void;
  onDelete: (boardId: string) => void;
}

const BoardActionsMenu = ({
  anchor,
  onClose,
  onDelete,
}: BoardActionsMenuProps) => {
  const t = useTranslations('Boards');

  return (
    <Menu open={!!anchor} anchorEl={anchor?.el} onClose={onClose}>
      <MenuItem
        onClick={() => {
          if (anchor) {
            onDelete(anchor.board.id);
          }
        }}
        sx={{ color: 'error.main' }}
      >
        <Delete fontSize="small" sx={{ mr: 1 }} /> {t('delete')}
      </MenuItem>
    </Menu>
  );
};

export default BoardActionsMenu;
