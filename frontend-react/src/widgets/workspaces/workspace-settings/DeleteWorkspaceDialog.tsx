'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface DeleteWorkspaceDialogProps {
  open: boolean;
  workspaceName: string;
  isDeleting: boolean;
  onRequestClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteWorkspaceDialog = ({
  open,
  workspaceName,
  isDeleting,
  onRequestClose,
  onCancel,
  onConfirm,
}: DeleteWorkspaceDialogProps) => {
  const t = useTranslations('WorkspaceSettings');
  const titleId = 'delete-workspace-dialog-title';
  const descriptionId = 'delete-workspace-dialog-description';

  return (
    <Dialog
      open={open}
      onClose={onRequestClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>{t('deleteWorkspaceTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>
          {t('deleteWorkspaceConfirm', {
            name: workspaceName,
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button autoFocus disabled={isDeleting} onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={isDeleting}
          onClick={onConfirm}
        >
          {isDeleting ? t('deletingWorkspace') : t('deleteWorkspace')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteWorkspaceDialog;
