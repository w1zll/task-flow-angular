'use client';

import type { Board, BoardMember } from '@/shared/api/api';
import {
  useCreateTaskComment,
  useTaskComments,
} from '@/shared/queries/notifications.queries';
import UserAvatar from '@/shared/ui/UserAvatar';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';

interface TaskCommentsSectionProps {
  taskId: string;
  board: Board;
  canEdit: boolean;
}

const uniqueMembers = (members?: BoardMember[]) => {
  const seen = new Set<string>();
  return (members ?? []).filter((member) => {
    if (seen.has(member.userId)) return false;
    seen.add(member.userId);
    return true;
  });
};

const TaskCommentsSection = ({
  taskId,
  board,
  canEdit,
}: TaskCommentsSectionProps) => {
  const t = useTranslations('TaskComments');
  const { enqueueSnackbar } = useSnackbar();
  const comments = useTaskComments(taskId);
  const createComment = useCreateTaskComment(taskId);
  const [body, setBody] = useState('');
  const [mentionedMembers, setMentionedMembers] = useState<BoardMember[]>([]);
  const members = useMemo(() => uniqueMembers(board.members), [board.members]);
  const canSubmit = canEdit && body.trim().length > 0 && !createComment.isPending;

  const handleMentionChange = (nextMembers: BoardMember[]) => {
    const addedMembers = nextMembers.filter(
      (member) =>
        !mentionedMembers.some((current) => current.userId === member.userId),
    );
    setMentionedMembers(nextMembers);

    if (!addedMembers.length) return;
    setBody((currentBody) => {
      const additions = addedMembers
        .map((member) => `@${member.user.name}`)
        .filter((mention) => !currentBody.includes(mention));
      if (!additions.length) return currentBody;
      return `${currentBody}${currentBody.trim() ? ' ' : ''}${additions.join(
        ' ',
      )} `;
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    createComment.mutate(
      {
        body,
        mentionedUserIds: mentionedMembers.map((member) => member.userId),
      },
      {
        onSuccess: () => {
          setBody('');
          setMentionedMembers([]);
        },
        onError: () => {
          enqueueSnackbar(t('createError'), { variant: 'error' });
        },
      },
    );
  };

  return (
    <Stack spacing={1.5}>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        {comments.isLoading && <CircularProgress size={16} />}
      </Stack>

      <Stack spacing={1.25}>
        {comments.data?.length ? (
          comments.data.map((comment) => (
            <Stack
              key={comment.id}
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'flex-start' }}
            >
              <UserAvatar
                name={comment.author.name}
                src={comment.author.avatar}
                size={30}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {comment.author.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(comment.createdAt).toLocaleString()}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {comment.body}
                </Typography>
              </Box>
            </Stack>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            {comments.isLoading ? t('loading') : t('empty')}
          </Typography>
        )}
      </Stack>

      {canEdit ? (
        <Stack spacing={1}>
          <TextField
            value={body}
            onChange={(event) => setBody(event.target.value)}
            label={t('newComment')}
            placeholder={t('placeholder')}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 5000 } }}
          />
          <Autocomplete
            multiple
            size="small"
            options={members}
            value={mentionedMembers}
            onChange={(_, value) => handleMentionChange(value)}
            getOptionLabel={(option) => option.user.name}
            isOptionEqualToValue={(option, value) =>
              option.userId === value.userId
            }
            renderInput={(params) => (
              <TextField {...params} label={t('mentions')} />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ gap: 1 }}>
                <UserAvatar
                  name={option.user.name}
                  src={option.user.avatar}
                  size={24}
                />
                {option.user.name}
              </Box>
            )}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {createComment.isPending ? t('sending') : t('send')}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('readOnly')}
        </Typography>
      )}
    </Stack>
  );
};

export default TaskCommentsSection;
