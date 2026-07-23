import { BadRequestException } from '@nestjs/common';

export const MAX_TASK_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_WORKSPACE_ATTACHMENT_STORAGE_BYTES = 200 * 1024 * 1024;

export const TASK_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export const TASK_ATTACHMENT_EXTENSION_BY_MIME: Record<
  (typeof TASK_ATTACHMENT_MIME_TYPES)[number],
  string
> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

export const isAllowedTaskAttachmentMimeType = (
  mimeType: string,
): mimeType is (typeof TASK_ATTACHMENT_MIME_TYPES)[number] =>
  TASK_ATTACHMENT_MIME_TYPES.includes(
    mimeType as (typeof TASK_ATTACHMENT_MIME_TYPES)[number],
  );

export const isImageAttachmentMimeType = (mimeType: string) =>
  mimeType.startsWith('image/');

export const taskAttachmentUploadOptions = {
  limits: {
    fileSize: MAX_TASK_ATTACHMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!isAllowedTaskAttachmentMimeType(file.mimetype)) {
      callback(
        new BadRequestException(
          'Task attachments must be images or PDF files',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
