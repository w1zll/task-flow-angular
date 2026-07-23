import {
  MAX_AVATAR_SIZE_BYTES,
  validateAvatarFile,
} from './avatar';

describe('validateAvatarFile', () => {
  it('accepts supported image types within the size limit', () => {
    const file = new File(['avatar'], 'avatar.webp', {
      type: 'image/webp',
    });

    expect(validateAvatarFile(file)).toBeNull();
  });

  it('rejects SVG avatars', () => {
    const file = new File(['<svg />'], 'avatar.svg', {
      type: 'image/svg+xml',
    });

    expect(validateAvatarFile(file)).toBe('type');
  });

  it('rejects avatars larger than 2 MB', () => {
    const file = new File(
      [new Uint8Array(MAX_AVATAR_SIZE_BYTES + 1)],
      'avatar.png',
      { type: 'image/png' },
    );

    expect(validateAvatarFile(file)).toBe('size');
  });
});
