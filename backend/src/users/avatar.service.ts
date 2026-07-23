import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  isAllowedAvatarMimeType,
} from '@/storage/avatar-upload.constants';
import {
  STORAGE_ADAPTER,
} from '@/storage/storage.types';
import type {
  AvatarUploadFile,
  StorageAdapter,
} from '@/storage/storage.types';
import { User } from './entities/user.entity';

export const DEFAULT_AVATAR_PROVIDER = 'dicebear';
export const DEFAULT_AVATAR_STYLE = 'glyphs';

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(STORAGE_ADAPTER)
    private readonly storage: StorageAdapter,
  ) {}

  getDefaultAvatarUrl(userId: string) {
    return `https://api.dicebear.com/10.x/${DEFAULT_AVATAR_STYLE}/svg?seed=${encodeURIComponent(userId)}`;
  }

  async initializeAvatar(
    user: User,
    file?: AvatarUploadFile,
  ): Promise<User> {
    if (file) return this.replaceWithUpload(user, file);
    return this.replaceWithDefault(user);
  }

  async updateAvatar(user: User, file: AvatarUploadFile): Promise<User> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }
    return this.replaceWithUpload(user, file);
  }

  async resetAvatar(user: User): Promise<User> {
    return this.replaceWithDefault(user);
  }

  async removeStoredAvatar(user: User): Promise<void> {
    if (
      user.avatarStorageKey &&
      user.avatarProvider === this.storage.provider
    ) {
      await this.storage.deleteAvatar(user.avatarStorageKey);
    }
  }

  private async replaceWithUpload(
    user: User,
    file: AvatarUploadFile,
  ): Promise<User> {
    this.validate(file);
    const previous = {
      provider: user.avatarProvider,
      key: user.avatarStorageKey,
    };
    const stored = await this.storage.uploadAvatar(file, user.id);

    try {
      user.avatar = stored.url;
      user.avatarProvider = stored.provider;
      user.avatarStorageKey = stored.key;
      const saved = await this.userRepo.save(user);
      await this.deletePrevious(previous.provider, previous.key);
      return saved;
    } catch (error) {
      await this.storage.deleteAvatar(stored.key).catch(() => undefined);
      throw error;
    }
  }

  private async replaceWithDefault(user: User): Promise<User> {
    const previous = {
      provider: user.avatarProvider,
      key: user.avatarStorageKey,
    };
    user.avatar = this.getDefaultAvatarUrl(user.id);
    user.avatarProvider = DEFAULT_AVATAR_PROVIDER;
    user.avatarStorageKey = null;
    const saved = await this.userRepo.save(user);
    await this.deletePrevious(previous.provider, previous.key);
    return saved;
  }

  private validate(file: AvatarUploadFile) {
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException('Avatar file must not exceed 2 MB');
    }
    if (!isAllowedAvatarMimeType(file.mimetype)) {
      throw new BadRequestException(
        `Avatar must use one of these MIME types: ${AVATAR_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private async deletePrevious(provider?: string, key?: string) {
    if (key && provider === this.storage.provider) {
      await this.storage.deleteAvatar(key).catch(() => undefined);
    }
  }
}
