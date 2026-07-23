'use client';

import { ContentCopy } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import type { InviteForm } from './types';

interface CreateInviteDialogProps {
  open: boolean;
  form: InviteForm;
  createdLink: string;
  currentUserRole: 'owner' | 'admin';
  isCreating: boolean;
  disabled?: boolean;
  onClose: () => void;
  onFormChange: <K extends keyof InviteForm>(
    key: K,
    value: InviteForm[K],
  ) => void;
  onCreate: () => void;
  onCopyLink: () => void;
}

const CreateInviteDialog = ({
  open,
  form,
  createdLink,
  currentUserRole,
  isCreating,
  disabled = false,
  onClose,
  onFormChange,
  onCreate,
  onCopyLink,
}: CreateInviteDialogProps) => {
  const t = useTranslations('WorkspaceInvites');
  const titleId = 'create-invite-dialog-title';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id={titleId}>{t('dialogTitle')}</DialogTitle>
      <DialogContent
        sx={{
          pt: '12px !important',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {createdLink ? (
          <>
            <Alert severity="success">{t('createdDescription')}</Alert>
            <TextField
              label={t('link')}
              value={createdLink}
              fullWidth
              slotProps={{ htmlInput: { readOnly: true } }}
            />
            <Button
              variant="contained"
              startIcon={<ContentCopy />}
              onClick={onCopyLink}
            >
              {t('copy')}
            </Button>
          </>
        ) : (
          <>
            <TextField
              select
              label={t('defaultRole')}
              value={form.defaultRole}
              disabled={disabled}
              onChange={(event) =>
                onFormChange(
                  'defaultRole',
                  event.target.value as InviteForm['defaultRole'],
                )
              }
            >
              <MenuItem value="member">{t('role.member')}</MenuItem>
              {currentUserRole === 'owner' && (
                <MenuItem value="admin">{t('role.admin')}</MenuItem>
              )}
            </TextField>
            <TextField
              label={t('expiresInDays')}
              type="number"
              value={form.expiresInDays}
              disabled={disabled}
              onChange={(event) =>
                onFormChange('expiresInDays', event.target.value)
              }
              slotProps={{ htmlInput: { min: 1, max: 30 } }}
            />
            <TextField
              label={t('maxUses')}
              type="number"
              value={form.maxUses}
              disabled={disabled}
              onChange={(event) => onFormChange('maxUses', event.target.value)}
              helperText={t('maxUsesHint')}
              slotProps={{ htmlInput: { min: 1, max: 1000 } }}
            />
            <TextField
              label={t('allowedEmail')}
              type="email"
              value={form.allowedEmail}
              disabled={disabled}
              onChange={(event) =>
                onFormChange('allowedEmail', event.target.value)
              }
              helperText={t('allowedEmailHint')}
            />
            <TextField
              label={t('allowedDomain')}
              placeholder="example.com"
              value={form.allowedEmailDomain}
              disabled={disabled}
              onChange={(event) =>
                onFormChange('allowedEmailDomain', event.target.value)
              }
              helperText={t('allowedDomainHint')}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>
          {createdLink ? t('done') : t('cancel')}
        </Button>
        {!createdLink && (
          <Button
            variant="contained"
            onClick={onCreate}
            disabled={
              isCreating ||
              disabled ||
              Number(form.expiresInDays) < 1 ||
              Number(form.expiresInDays) > 30
            }
          >
            {isCreating ? t('creating') : t('createAction')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateInviteDialog;
