import { BadRequestException } from '@nestjs/common';

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export const AVATAR_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const AVATAR_EXTENSION_BY_MIME: Record<
  (typeof AVATAR_MIME_TYPES)[number],
  string
> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const isAllowedAvatarMimeType = (
  mimeType: string,
): mimeType is (typeof AVATAR_MIME_TYPES)[number] =>
  AVATAR_MIME_TYPES.includes(
    mimeType as (typeof AVATAR_MIME_TYPES)[number],
  );

export const avatarUploadOptions = {
  limits: {
    fileSize: MAX_AVATAR_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!isAllowedAvatarMimeType(file.mimetype)) {
      callback(
        new BadRequestException(
          'Avatar must be a PNG, JPEG, or WebP image',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
