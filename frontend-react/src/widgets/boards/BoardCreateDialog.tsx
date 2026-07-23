'use client';

import { Board, Workspace } from '@/shared/api/api';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import { useCreateBoard } from '@/shared/queries/boards.queries';
import { useSwitchWorkspace } from '@/shared/queries/workspaces.queries';
import { useAuthStore } from '@/shared/store/root.store';
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type BoardTemplate = 'empty' | 'scrum';

export const BOARD_COLORS = [
  '#669266',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#14b8a6',
  '#f97316',
];

const createInitialForm = (workspaceId = '') => ({
  title: '',
  description: '',
  color: BOARD_COLORS[0],
  template: 'empty' as BoardTemplate,
  workspaceId,
});

interface Props {
  open: boolean;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  lockWorkspace?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onCreated?: (board: Board) => void;
}

const BoardCreateDialog = ({
  open,
  workspaces,
  defaultWorkspaceId,
  lockWorkspace = false,
  disabled = false,
  onClose,
  onCreated,
}: Props) => {
  const t = useTranslations('Boards');
  const router = useRouter();
  const createBoard = useCreateBoard();
  const switchWorkspace = useSwitchWorkspace();
  const setActiveWorkspace = useAuthStore(
    (state) => state.setActiveWorkspace,
  );
  const fallbackWorkspaceId = useMemo(
    () =>
      defaultWorkspaceId ||
      workspaces.find((workspace) => workspace.isActive)?.id ||
      workspaces[0]?.id ||
      '',
    [defaultWorkspaceId, workspaces],
  );
  const [form, setForm] = useState(createInitialForm(fallbackWorkspaceId));
  const titleId = 'board-create-dialog-title';

  useStableBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      setForm(createInitialForm(fallbackWorkspaceId));
    }
  }, [fallbackWorkspaceId, open]);

  const closeDialog = () => {
    if (createBoard.isPending || switchWorkspace.isPending) return;
    onClose();
  };

  const handleCreate = () => {
    if (disabled) return;
    const title = form.title.trim();
    const workspaceId = form.workspaceId || fallbackWorkspaceId;
    if (!title || !workspaceId) return;

    createBoard.mutate(
      {
        title,
        description: form.description.trim() || undefined,
        color: form.color,
        template: form.template,
        workspaceId,
      },
      {
        onSuccess: (board) => {
          onClose();
          onCreated?.(board);

          const openBoard = () =>
            router.push(`/workspaces/${board.workspaceId}/boards/${board.id}`);
          const workspace = workspaces.find(
            (item) => item.id === board.workspaceId,
          );

          if (workspace && !workspace.isActive) {
            switchWorkspace.mutate(board.workspaceId, {
              onSuccess: (updatedWorkspace) => {
                setActiveWorkspace(updatedWorkspace.id);
                openBoard();
                router.refresh();
              },
              onError: openBoard,
            });
            return;
          }

          openBoard();
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
      <DialogTitle id={titleId} sx={{ fontWeight: 600 }}>
        {t('dialogTitle')}
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
          label={t('boardTitle')}
          fullWidth
          required
          value={form.title}
          disabled={disabled}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              title: event.target.value,
            }))
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleCreate();
          }}
        />
        {!lockWorkspace && (
          <FormControl fullWidth>
            <InputLabel>{t('workspace')}</InputLabel>
            <Select
              label={t('workspace')}
              value={form.workspaceId}
              disabled={disabled}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  workspaceId: event.target.value,
                }))
              }
            >
              {workspaces.map((workspace) => (
                <MenuItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <TextField
          label={t('boardDescription')}
          fullWidth
          multiline
          rows={2}
          value={form.description}
          disabled={disabled}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              description: event.target.value,
            }))
          }
        />
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block' }}
          >
            {t('template')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={form.template}
            disabled={disabled}
            onChange={(_, template: BoardTemplate | null) => {
              if (template) {
                setForm((previous) => ({ ...previous, template }));
              }
            }}
            aria-label={t('template')}
          >
            <ToggleButton value="empty">{t('templateEmpty')}</ToggleButton>
            <ToggleButton value="scrum">{t('templateScrum')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block' }}
          >
            {t('color')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {BOARD_COLORS.map((color) => (
              <ButtonBase
                key={color}
                aria-label={t('selectColor', { color })}
                aria-pressed={form.color === color}
                onClick={() =>
                  setForm((previous) => ({ ...previous, color }))
                }
                disabled={disabled}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: color,
                  cursor: 'pointer',
                  border:
                    form.color === color
                      ? '3px solid'
                      : '3px solid transparent',
                  borderColor:
                    form.color === color ? 'text.primary' : 'transparent',
                  transition: 'transform 0.15s',
                  '&:hover': { transform: 'scale(1.12)' },
                  '&.Mui-focusVisible': {
                    outline: '3px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
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
          disabled={
            createBoard.isPending ||
            switchWorkspace.isPending ||
            disabled ||
            !form.title.trim() ||
            !(form.workspaceId || fallbackWorkspaceId)
          }
        >
          {createBoard.isPending ? t('creating') : t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BoardCreateDialog;
