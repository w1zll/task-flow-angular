import { Injectable, Logger } from '@nestjs/common';
import {
  MAX_AVATAR_SIZE_BYTES,
  isAllowedAvatarMimeType,
} from '@/storage/avatar-upload.constants';
import type { AvatarUploadFile } from '@/storage/storage.types';
import { OAuthProvider } from '../entities/auth-identity.entity';
import type { OAuthProfile } from './oauth.types';

const MAX_REDIRECTS = 2;
const DOWNLOAD_TIMEOUT_MS = 5_000;

@Injectable()
export class OAuthAvatarService {
  private readonly logger = new Logger(OAuthAvatarService.name);

  async download(profile: OAuthProfile): Promise<AvatarUploadFile | undefined> {
    if (!profile.avatarUrl) return undefined;

    try {
      let url = this.validateUrl(profile.provider, profile.avatarUrl);
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        try {
          const response = await fetch(url, {
            redirect: 'manual',
            signal: controller.signal,
            headers: { Accept: 'image/png,image/jpeg,image/webp' },
          });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location || redirect === MAX_REDIRECTS) {
              throw new Error('Invalid provider avatar redirect');
            }
            url = this.validateUrl(
              profile.provider,
              new URL(location, url).toString(),
            );
            continue;
          }
          if (!response.ok || !response.body) {
            throw new Error('Provider avatar download failed');
          }
          return await this.toUploadFile(response, profile.provider);
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch {
      this.logger.warn(
        `${profile.provider} avatar could not be imported; using the default avatar`,
      );
    }

    return undefined;
  }

  private validateUrl(provider: OAuthProvider, value: string): string {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      (url.port && url.port !== '443') ||
      url.username ||
      url.password
    ) {
      throw new Error('Unsafe provider avatar URL');
    }
    const hostname = url.hostname.toLowerCase();
    const allowed =
      provider === OAuthProvider.Google
        ? hostname === 'googleusercontent.com' ||
          hostname.endsWith('.googleusercontent.com')
        : hostname === 'avatars.githubusercontent.com';
    if (!allowed) throw new Error('Unexpected provider avatar host');
    return url.toString();
  }

  private async toUploadFile(
    response: Response,
    provider: OAuthProvider,
  ): Promise<AvatarUploadFile> {
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_AVATAR_SIZE_BYTES) {
      throw new Error('Provider avatar is too large');
    }
    const mimetype = (response.headers.get('content-type') ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!isAllowedAvatarMimeType(mimetype)) {
      throw new Error('Unsupported provider avatar type');
    }

    const reader = response.body!.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AVATAR_SIZE_BYTES) {
        await reader.cancel();
        throw new Error('Provider avatar is too large');
      }
      chunks.push(Buffer.from(value));
    }

    const extension =
      mimetype === 'image/png'
        ? 'png'
        : mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    return {
      buffer: Buffer.concat(chunks),
      mimetype,
      originalname: `${provider}-avatar.${extension}`,
      size,
    };
  }
}
