'use client';

import { Add, MoreHoriz } from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import ColumnTitleEditor from './ColumnTitleEditor';

interface KanbanColumnHeaderProps {
  title: string;
  taskCount: number;
  titleInput: string;
  isEditingTitle: boolean;
  isColumnDragDisabled: boolean;
  canEditBoardContent: boolean;
  canManageColumns: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onTitleInputChange: (title: string) => void;
  onSubmitTitle: () => void;
  onCancelTitleEdit: () => void;
  onStartAddingTask: () => void;
  onOpenMenu: (anchor: HTMLElement) => void;
}

const KanbanColumnHeader = ({
  title,
  taskCount,
  titleInput,
  isEditingTitle,
  isColumnDragDisabled,
  canEditBoardContent,
  canManageColumns,
  dragHandleProps,
  onTitleInputChange,
  onSubmitTitle,
  onCancelTitleEdit,
  onStartAddingTask,
  onOpenMenu,
}: KanbanColumnHeaderProps) => {
  const t = useTranslations('KanbanColumn');

  return (
    <Box
      {...(dragHandleProps ?? {})}
      sx={{
        px: 2,
        pt: 2,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: isColumnDragDisabled ? 'default' : 'grab',
      }}
    >
      {isEditingTitle ? (
        <ColumnTitleEditor
          value={titleInput}
          onChange={onTitleInputChange}
          onSubmit={onSubmitTitle}
          onCancel={onCancelTitleEdit}
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              bgcolor: 'action.selected',
              px: 0.8,
              py: 0.2,
              borderRadius: '4px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {taskCount}
          </Typography>
        </Box>
      )}

      {(canEditBoardContent || canManageColumns) && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          {canEditBoardContent && (
            <Tooltip title={t('addTask')}>
              <IconButton
                size="small"
                onClick={onStartAddingTask}
                aria-label={t('addTask')}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canManageColumns && (
            <Tooltip title={t('columnActions')}>
              <IconButton
                size="small"
                onClick={(event) => onOpenMenu(event.currentTarget)}
                aria-label={t('columnActions')}
                aria-haspopup="menu"
              >
                <MoreHoriz fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

export default KanbanColumnHeader;
