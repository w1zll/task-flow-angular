'use client';

import type { Team } from '@/shared/api/api';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import SmoothColorField from './SmoothColorField';
import type { TeamForm } from './types';

interface TeamEditorDialogProps {
  open: boolean;
  editingTeam: Team | null;
  form: TeamForm;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onFormChange: <K extends keyof TeamForm>(
    key: K,
    value: TeamForm[K],
  ) => void;
  onColorInput: (color: string) => void;
  onColorCommit: (color: string) => void;
}

const TeamEditorDialog = ({
  open,
  editingTeam,
  form,
  isSaving,
  onClose,
  onSave,
  onFormChange,
  onColorInput,
  onColorCommit,
}: TeamEditorDialogProps) => {
  const t = useTranslations('WorkspaceTeams');
  const titleId = 'team-editor-dialog-title';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id={titleId}>
        {editingTeam ? t('editTitle') : t('createTitle')}
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField
          autoFocus
          label={t('name')}
          value={form.name}
          onChange={(event) => onFormChange('name', event.target.value)}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <TextField
          label={t('teamDescription')}
          multiline
          minRows={3}
          value={form.description}
          onChange={(event) =>
            onFormChange('description', event.target.value)
          }
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        <SmoothColorField
          label={t('color')}
          value={form.color}
          previewLabel={form.name.trim() || t('preview')}
          onInputColor={onColorInput}
          onCommitColor={onColorCommit}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={!form.name.trim() || isSaving}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamEditorDialog;
