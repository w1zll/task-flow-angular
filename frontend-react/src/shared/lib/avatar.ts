export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';

const ALLOWED_AVATAR_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export type AvatarValidationError = 'size' | 'type';

export const validateAvatarFile = (
  file: File,
): AvatarValidationError | null => {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) return 'type';
  if (file.size > MAX_AVATAR_SIZE_BYTES) return 'size';
  return null;
};
