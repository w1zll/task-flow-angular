import { MAX_AVATAR_SIZE_BYTES } from '@/storage/avatar-upload.constants';
import { OAuthProvider } from '../entities/auth-identity.entity';
import { OAuthAvatarService } from './oauth-avatar.service';
import type { OAuthProfile } from './oauth.types';

describe('OAuthAvatarService', () => {
  const service = new OAuthAvatarService();
  const profile = (
    provider: OAuthProvider,
    avatarUrl: string,
  ): OAuthProfile => ({
    provider,
    avatarUrl,
    subject: 'provider-user-1',
    email: 'user@example.com',
    emailVerified: true,
    displayName: 'User',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloads an allowlisted provider avatar as a validated upload file', async () => {
    const body = Buffer.from('image-content');
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': String(body.length),
        },
      }),
    );

    const file = await service.download(
      profile(
        OAuthProvider.Google,
        'https://lh3.googleusercontent.com/a/provider-avatar',
      ),
    );

    expect(file).toMatchObject({
      mimetype: 'image/jpeg',
      originalname: 'google-avatar.jpg',
      size: body.length,
    });
    expect(file?.buffer).toEqual(body);
  });

  it('rejects non-provider hosts without making a request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      service.download(
        profile(OAuthProvider.GitHub, 'https://example.com/avatar.png'),
      ),
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back when provider metadata exceeds the avatar limit', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('small-body'), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': String(MAX_AVATAR_SIZE_BYTES + 1),
        },
      }),
    );

    await expect(
      service.download(
        profile(
          OAuthProvider.GitHub,
          'https://avatars.githubusercontent.com/u/12345',
        ),
      ),
    ).resolves.toBeUndefined();
  });
});
