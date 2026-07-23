'use client';

import type { Task } from '@/shared/api/api';
import { Box, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';
import type { PatchTaskField, TaskDraft } from './types';

interface TaskCustomFieldsSectionProps {
  form: TaskDraft;
  canEdit: boolean;
  onPatch: PatchTaskField;
}

const toNullableNumber = (value: string) =>
  value === '' ? null : Number(value);

export const MAX_ESTIMATE_MINUTES = 100_000;
export const MAX_STORY_POINTS = 1_000;
export const MAX_ESTIMATE_HOURS =
  Math.floor((MAX_ESTIMATE_MINUTES / 60) * 10) / 10;

const TaskCustomFieldsSection = ({
  form,
  canEdit,
  onPatch,
}: TaskCustomFieldsSectionProps) => {
  const t = useTranslations('TaskDetail');
  const isEstimateInvalid =
    form.estimateMinutes !== null &&
    form.estimateMinutes !== undefined &&
    (!Number.isFinite(form.estimateMinutes) ||
      form.estimateMinutes < 0 ||
      form.estimateMinutes > MAX_ESTIMATE_MINUTES);
  const isStoryPointsInvalid =
    form.storyPoints !== null &&
    form.storyPoints !== undefined &&
    (!Number.isFinite(form.storyPoints) ||
      form.storyPoints < 0 ||
      form.storyPoints > MAX_STORY_POINTS);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        '& > *': {
          flex: { xs: '1 1 100%', sm: '1 1 180px' },
        },
      }}
    >
      <TextField
        label={t('estimateHours')}
        type="number"
        size="small"
        value={
          form.estimateMinutes === null || form.estimateMinutes === undefined
            ? ''
            : Math.round((form.estimateMinutes / 60) * 10) / 10
        }
        disabled={!canEdit}
        onChange={(event) => {
          const hours = toNullableNumber(event.target.value);
          onPatch(
            'estimateMinutes',
            (hours === null
              ? null
              : Math.round(hours * 60)) as Task['estimateMinutes'],
          );
        }}
        error={isEstimateInvalid}
        helperText={
          isEstimateInvalid
            ? t('estimateLimitHint', { max: MAX_ESTIMATE_HOURS })
            : undefined
        }
        slotProps={{
          htmlInput: {
            min: 0,
            max: MAX_ESTIMATE_HOURS,
            step: 0.5,
          },
        }}
      />

      <TextField
        label={t('storyPoints')}
        type="number"
        size="small"
        value={form.storyPoints ?? ''}
        disabled={!canEdit}
        onChange={(event) =>
          onPatch(
            'storyPoints',
            ((event.target.value === ''
              ? null
              : Math.round(Number(event.target.value))) as Task['storyPoints']),
          )
        }
        error={isStoryPointsInvalid}
        helperText={
          isStoryPointsInvalid
            ? t('storyPointsLimitHint', { max: MAX_STORY_POINTS })
            : undefined
        }
        slotProps={{
          htmlInput: {
            min: 0,
            max: MAX_STORY_POINTS,
            step: 1,
          },
        }}
      />
    </Box>
  );
};

export default TaskCustomFieldsSection;
