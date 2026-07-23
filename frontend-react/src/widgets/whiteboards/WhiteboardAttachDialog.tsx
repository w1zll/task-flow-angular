'use client';

import type { Whiteboard } from '@/shared/api/api';
import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import {
  useUpdateWhiteboard,
  useWorkspaceWhiteboards,
} from '@/shared/queries/whiteboards.queries';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface Props {
  open: boolean;
  workspaceId: string;
  boardId: string;
  onClose: () => void;
  onAttached?: (whiteboard: Whiteboard) => void;
}

const WhiteboardAttachDialog = ({
  open,
  workspaceId,
  boardId,
  onClose,
  onAttached,
}: Props) => {
  const t = useTranslations('Whiteboards');
  const whiteboards = useWorkspaceWhiteboards(workspaceId, undefined, open);
  const updateWhiteboard = useUpdateWhiteboard(workspaceId);
  const [selectedId, setSelectedId] = useState('');
  const candidates =
    whiteboards.data?.filter((whiteboard) => whiteboard.boardId !== boardId) ??
    [];
  const selected = candidates.find((whiteboard) => whiteboard.id === selectedId);

  useStableBodyScrollLock(open);

  const handleAttach = () => {
    if (!selected) return;
    updateWhiteboard.mutate(
      {
        whiteboardId: selected.id,
        data: { boardId },
      },
      {
        onSuccess: (whiteboard) => {
          setSelectedId('');
          onClose();
          onAttached?.(whiteboard);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('attachTitle')}</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {candidates.length ? (
          <List dense sx={{ mx: -1 }}>
            {candidates.map((whiteboard) => (
              <ListItemButton
                key={whiteboard.id}
                selected={selectedId === whiteboard.id}
                onClick={() => setSelectedId(whiteboard.id)}
                sx={{ borderRadius: '6px' }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: whiteboard.color,
                    mr: 1.25,
                    flexShrink: 0,
                  }}
                />
                <ListItemText
                  primary={whiteboard.title}
                  secondary={
                    whiteboard.boardId ? t('linkedElsewhere') : t('unlinked')
                  }
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" variant="body2">
            {whiteboards.isLoading ? t('loading') : t('noAttachCandidates')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button
          variant="contained"
          disabled={!selected || updateWhiteboard.isPending}
          onClick={handleAttach}
        >
          {updateWhiteboard.isPending ? t('attaching') : t('attach')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WhiteboardAttachDialog;
