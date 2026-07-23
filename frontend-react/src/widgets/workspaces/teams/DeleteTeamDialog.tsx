'use client';

import type { Team } from '@/shared/api/api';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface DeleteTeamDialogProps {
  team: Team | null;
  isDeleting: boolean;
  onRequestClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteTeamDialog = ({
  team,
  isDeleting,
  onRequestClose,
  onCancel,
  onConfirm,
}: DeleteTeamDialogProps) => {
  const t = useTranslations('WorkspaceTeams');
  const titleId = 'delete-team-dialog-title';
  const descriptionId = 'delete-team-dialog-description';

  return (
    <Dialog
      open={Boolean(team)}
      onClose={onRequestClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>{t('deleteTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>
          {t('deleteConfirm', { team: team?.name ?? '' })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={!team || isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? t('deleting') : t('delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteTeamDialog;
