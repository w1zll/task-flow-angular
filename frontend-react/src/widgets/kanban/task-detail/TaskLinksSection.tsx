'use client';

import type { Task } from '@/shared/api/api';
import { InsertLinkRounded, OpenInNewRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { TaskDraft } from './types';

interface TaskLinksSectionProps {
  task: Task;
  form: TaskDraft;
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;

const trimUrl = (url: string) => url.replace(/[),.;!?]+$/g, '');

const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const extractTaskLinks = (task: Task, form: TaskDraft) => {
  const text = [
    form.title ?? task.title,
    form.description ?? task.description ?? '',
    ...(task.checklistItems ?? []).map((item) => item.title),
  ].join('\n');
  const urls = text.match(URL_PATTERN)?.map(trimUrl) ?? [];

  return [...new Set(urls)];
};

const TaskLinksSection = ({ task, form }: TaskLinksSectionProps) => {
  const t = useTranslations('TaskDetail');
  const links = useMemo(() => extractTaskLinks(task, form), [form, task]);

  if (!links.length) return null;

  return (
    <Stack spacing={1.25}>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <InsertLinkRounded fontSize="small" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('links')}
        </Typography>
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {links.map((link) => (
          <Button
            key={link}
            href={link}
            target="_blank"
            rel="noreferrer"
            variant="outlined"
            size="small"
            endIcon={<OpenInNewRounded fontSize="small" />}
            sx={{
              maxWidth: '100%',
              justifyContent: 'space-between',
              textTransform: 'none',
            }}
          >
            <Box
              component="span"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getHostname(link)}
            </Box>
          </Button>
        ))}
      </Box>
    </Stack>
  );
};

export default TaskLinksSection;
