'use client';

import { DriveFileMoveOutlined } from '@mui/icons-material';
import {
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface TaskMoveColumnOption {
  id: string;
  title: string;
}

interface TaskMoveMenuProps {
  columns: TaskMoveColumnOption[];
  currentColumnId?: string;
  isDisabled: boolean;
  onMove: (columnId: string) => void;
}

const TaskMoveMenu = ({
  columns,
  currentColumnId,
  isDisabled,
  onMove,
}: TaskMoveMenuProps) => {
  const t = useTranslations('TaskCard');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const targetColumns = columns.filter((column) => column.id !== currentColumnId);
  const isOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={t('moveTask')}>
        <span>
          <IconButton
            size="small"
            disabled={isDisabled || targetColumns.length === 0}
            aria-label={t('moveTask')}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={(event) => {
              event.stopPropagation();
              setAnchorEl(event.currentTarget);
            }}
            sx={{
              width: { xs: 44, md: 32 },
              height: { xs: 44, md: 32 },
            }}
          >
            <DriveFileMoveOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={() => setAnchorEl(null)}
        onClick={(event) => event.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 280,
            },
          },
        }}
      >
        {targetColumns.map((column) => (
          <MenuItem
            key={column.id}
            onClick={() => {
              setAnchorEl(null);
              onMove(column.id);
            }}
            sx={{ minHeight: 44 }}
          >
            <ListItemText
              primary={column.title}
              slotProps={{
                primary: {
                  sx: {
                    overflowWrap: 'anywhere',
                  },
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TaskMoveMenu;
