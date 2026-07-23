'use client';

import type { Board, Whiteboard } from '@/shared/api/api';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import { useCreateWhiteboard } from '@/shared/queries/whiteboards.queries';
import {
  WHITEBOARD_COLORS,
} from './whiteboard-drawing';
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

interface Props {
  open: boolean;
  workspaceId: string;
  boards?: Board[];
  defaultBoardId?: string | null;
  lockBoard?: boolean;
  onClose: () => void;
  onCreated?: (whiteboard: Whiteboard) => void;
}

const createInitialForm = (boardId?: string | null) => ({
  title: '',
  description: '',
  color: WHITEBOARD_COLORS[1],
  icon: 'draw',
  boardId: boardId ?? '',
});

const WhiteboardCreateDialog = ({
  open,
  workspaceId,
  boards = [],
  defaultBoardId = '',
  lockBoard = false,
  onClose,
  onCreated,
}: Props) => {
  const t = useTranslations('Whiteboards');
  const createWhiteboard = useCreateWhiteboard(workspaceId);
  const [form, setForm] = useState(createInitialForm(defaultBoardId));
  const titleId = 'whiteboard-create-dialog-title';
  const workspaceBoards = useMemo(
    () => boards.filter((board) => board.workspaceId === workspaceId),
    [boards, workspaceId],
  );

  useStableBodyScrollLock(open);

  useEffect(() => {
    if (open) setForm(createInitialForm(defaultBoardId));
  }, [defaultBoardId, open]);

  const closeDialog = () => {
    if (createWhiteboard.isPending) return;
    onClose();
  };

  const handleCreate = () => {
    const title = form.title.trim();
    if (!title) return;

    createWhiteboard.mutate(
      {
        title,
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
        boardId: form.boardId || null,
      },
      {
        onSuccess: (whiteboard) => {
          onClose();
          onCreated?.(whiteboard);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id={titleId} sx={{ fontWeight: 700 }}>
        {t('createTitle')}
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pt: '12px !important',
        }}
      >
        <TextField
          autoFocus
          required
          label={t('whiteboardTitle')}
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleCreate();
          }}
        />
        <TextField
          label={t('whiteboardDescription')}
          value={form.description}
          multiline
          rows={2}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
        {!lockBoard && (
          <FormControl fullWidth>
            <InputLabel>{t('linkedBoard')}</InputLabel>
            <Select
              label={t('linkedBoard')}
              value={form.boardId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  boardId: event.target.value,
                }))
              }
            >
              <MenuItem value="">{t('noLinkedBoard')}</MenuItem>
              {workspaceBoards.map((board) => (
                <MenuItem key={board.id} value={board.id}>
                  {board.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1 }}
          >
            {t('color')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {WHITEBOARD_COLORS.map((color) => (
              <ButtonBase
                key={color}
                aria-label={t('selectColor', { color })}
                aria-pressed={form.color === color}
                onClick={() =>
                  setForm((current) => ({ ...current, color }))
                }
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: color,
                  border:
                    form.color === color
                      ? '3px solid'
                      : '3px solid transparent',
                  borderColor:
                    form.color === color ? 'text.primary' : 'transparent',
                }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeDialog}>{t('cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={createWhiteboard.isPending || !form.title.trim()}
        >
          {createWhiteboard.isPending ? t('creating') : t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhiteboardCreateDialog;
