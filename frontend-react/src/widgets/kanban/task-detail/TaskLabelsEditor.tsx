'use client';

import { Label } from '@mui/icons-material';
import { Box, Button, Chip, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { LABEL_PRESETS } from './taskDetailOptions';

interface TaskLabelsEditorProps {
  labels: string[];
  labelInput: string;
  canEdit: boolean;
  onLabelInputChange: (value: string) => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
}

const TaskLabelsEditor = ({
  labels,
  labelInput,
  canEdit,
  onLabelInputChange,
  onAddLabel,
  onRemoveLabel,
}: TaskLabelsEditorProps) => {
  const t = useTranslations('TaskDetail');
  const customLabels = labels.filter((label) => !LABEL_PRESETS.includes(label));

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <Label sx={{ fontSize: 14 }} /> {t('labels')}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        {LABEL_PRESETS.map((preset) => {
          const active = labels.includes(preset);
          return (
            <Chip
              key={preset}
              label={preset}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              color={active ? 'primary' : 'default'}
              onClick={
                canEdit
                  ? () => (active ? onRemoveLabel(preset) : onAddLabel(preset))
                  : undefined
              }
              sx={{
                cursor: canEdit ? 'pointer' : 'default',
                fontSize: 11,
              }}
            />
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder={t('newLabel')}
          value={labelInput}
          disabled={!canEdit}
          onChange={(event) => onLabelInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAddLabel(labelInput);
            }
          }}
          sx={{ flex: 1 }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={() => onAddLabel(labelInput)}
          disabled={!canEdit}
        >
          {t('add')}
        </Button>
      </Box>

      {customLabels.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {customLabels.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              color="secondary"
              onDelete={canEdit ? () => onRemoveLabel(label) : undefined}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TaskLabelsEditor;
