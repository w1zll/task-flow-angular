'use client';

import type { Task } from '@/shared/api/api';
import { CalendarToday, Flag } from '@mui/icons-material';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { PRIORITY_OPTIONS } from './taskDetailOptions';
import type { PatchTaskField, TaskDraft } from './types';

interface TaskPriorityDateFieldsProps {
  form: TaskDraft;
  canEdit: boolean;
  onPatch: PatchTaskField;
}

const TaskPriorityDateFields = ({
  form,
  canEdit,
  onPatch,
}: TaskPriorityDateFieldsProps) => {
  const t = useTranslations('TaskDetail');
  const tPriority = useTranslations('TaskCard');

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>{t('priority')}</InputLabel>
        <Select
          label={t('priority')}
          value={form.priority ?? 'medium'}
          disabled={!canEdit}
          onChange={(event) =>
            onPatch('priority', event.target.value as Task['priority'])
          }
          renderValue={(value) => {
            const option = PRIORITY_OPTIONS.find((item) => item.value === value);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Flag sx={{ fontSize: 14, color: option?.color }} />
                <span>
                  {option ? tPriority(`priority.${option.value}` as const) : ''}
                </span>
              </Box>
            );
          }}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Flag sx={{ fontSize: 14, color: option.color, mr: 1 }} />
              {tPriority(`priority.${option.value}` as const)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t('dueDate')}
        type="date"
        size="small"
        sx={{ minWidth: 160 }}
        value={form.dueDate ?? ''}
        disabled={!canEdit}
        onChange={(event) =>
          onPatch(
            'dueDate',
            (event.target.value || null) as Task['dueDate'],
          )
        }
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: (
              <CalendarToday
                sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }}
              />
            ),
          },
        }}
      />
    </>
  );
};

export default TaskPriorityDateFields;
