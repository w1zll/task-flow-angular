'use client';

import type { Task, TaskAttachment } from '@/shared/api/api';
import {
  useDeleteTaskAttachment,
  useUploadTaskAttachment,
} from '@/shared/queries/boards.queries';
import {
  DeleteOutlineRounded,
  InsertDriveFileOutlined,
  OpenInNewRounded,
  PictureAsPdfOutlined,
  UploadFileRounded,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

interface TaskAttachmentsSectionProps {
  task: Task;
  boardId: string;
  canEdit: boolean;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${Math.round((size / 1024 / 1024) * 10) / 10} MB`;
};

const sortAttachments = (attachments?: TaskAttachment[]) =>
  [...(attachments ?? [])].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

type UploadProgressState = {
  fileName: string;
  value: number;
} | null;

const TaskAttachmentsSection = ({
  task,
  boardId,
  canEdit,
}: TaskAttachmentsSectionProps) => {
  const t = useTranslations('TaskDetail');
  const { enqueueSnackbar } = useSnackbar();
  const uploadAttachment = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState>(null);
  const attachments = useMemo(
    () => sortAttachments(task.attachments),
    [task.attachments],
  );
  const isUploadPending = uploadAttachment.isPending;

  const validateFile = (file: File) => {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      enqueueSnackbar(t('attachmentTypeError'), { variant: 'error' });
      return false;
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      enqueueSnackbar(t('attachmentSizeError'), { variant: 'error' });
      return false;
    }

    return true;
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!canEdit || isUploadPending) return;

    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    for (const file of selectedFiles) {
      if (!validateFile(file)) continue;

      setUploadProgress({ fileName: file.name, value: 0 });
      try {
        await uploadAttachment.mutateAsync({
          taskId: task.id,
          file,
          boardId,
          onProgress: (value) =>
            setUploadProgress({ fileName: file.name, value }),
        });
      } catch {
        enqueueSnackbar(t('attachmentUploadError'), { variant: 'error' });
      }
    }

    setUploadProgress(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (!files.length) return;
    void uploadFiles(files);
  };

  const handlePickFiles = () => {
    if (!canEdit || isUploadPending) return;
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit || isUploadPending) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit || isUploadPending) return;
    event.preventDefault();
    setIsDragging(false);
    void uploadFiles(event.dataTransfer.files);
  };

  return (
    <Stack spacing={1.25}>
      <Divider />
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('attachments')}
        </Typography>
      </Stack>

      {canEdit && (
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            border: '1px dashed',
            borderColor: isDragging ? 'primary.main' : 'divider',
            borderRadius: 1,
            bgcolor: isDragging ? 'action.hover' : 'transparent',
            p: 1.5,
            transition: 'border-color 120ms ease, background-color 120ms ease',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', minWidth: 0 }}
            >
              <UploadFileRounded color={isDragging ? 'primary' : 'action'} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {isDragging
                    ? t('dropAttachmentsActive')
                    : t('dropAttachments')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('attachmentDropHint')}
                </Typography>
              </Box>
            </Stack>

            <Button
              type="button"
              variant="outlined"
              size="small"
              startIcon={<UploadFileRounded fontSize="small" />}
              disabled={isUploadPending}
              onClick={handlePickFiles}
              sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
            >
              {isUploadPending ? t('uploading') : t('upload')}
            </Button>
          </Stack>

          <input
            ref={fileInputRef}
            hidden
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={handleFileChange}
          />

          {uploadProgress && (
            <Box sx={{ mt: 1.25 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('uploadingFile', { file: uploadProgress.fileName })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('uploadProgress', { progress: uploadProgress.value })}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={uploadProgress.value}
              />
            </Box>
          )}
        </Box>
      )}

      {attachments.length ? (
        <Stack spacing={1}>
          {attachments.map((attachment) => (
            <Box
              key={attachment.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: attachment.isImage
                  ? '56px minmax(0, 1fr) auto'
                  : 'auto minmax(0, 1fr) auto',
                gap: 1.25,
                alignItems: 'center',
                py: 0.75,
              }}
            >
              {attachment.isImage ? (
                <Box
                  component="img"
                  src={attachment.url}
                  alt={attachment.fileName}
                  sx={{
                    width: 56,
                    height: 42,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ) : attachment.mimeType === 'application/pdf' ? (
                <PictureAsPdfOutlined color="error" />
              ) : (
                <InsertDriveFileOutlined color="action" />
              )}

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {attachment.fileName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(attachment.size)}
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.25}>
                <Tooltip title={t('openAttachment')}>
                  <IconButton
                    size="small"
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('openAttachment')}
                  >
                    <OpenInNewRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canEdit && (
                  <Tooltip title={t('deleteAttachment')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() =>
                          deleteAttachment.mutate(
                            {
                              taskId: task.id,
                              attachmentId: attachment.id,
                              boardId,
                            },
                            {
                              onError: () =>
                                enqueueSnackbar(t('attachmentDeleteError'), {
                                  variant: 'error',
                                }),
                            },
                          )
                        }
                        aria-label={t('deleteAttachment')}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('attachmentsEmpty')}
        </Typography>
      )}
    </Stack>
  );
};

export default TaskAttachmentsSection;
