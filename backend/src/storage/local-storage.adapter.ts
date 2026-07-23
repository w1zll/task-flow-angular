import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  AVATAR_EXTENSION_BY_MIME,
  isAllowedAvatarMimeType,
} from './avatar-upload.constants';
import {
  TASK_ATTACHMENT_EXTENSION_BY_MIME,
  isAllowedTaskAttachmentMimeType,
} from './task-attachment.constants';
import {
  AvatarUploadFile,
  StoredFile,
  StorageAdapter,
  TaskAttachmentUploadContext,
  TaskAttachmentUploadFile,
} from './storage.types';

const AVATAR_KEY_PATTERN = /^[a-zA-Z0-9-]+\.(png|jpg|webp)$/;
const ATTACHMENT_KEY_PATTERN = /^[a-zA-Z0-9-]+\.(png|jpg|webp|gif|pdf)$/;

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  readonly provider = 'local' as const;
  private readonly avatarDirectory: string;
  private readonly attachmentDirectory: string;

  constructor(config: ConfigService) {
    const storageRoot = resolve(
      config.get<string>('LOCAL_STORAGE_PATH') ?? join(process.cwd(), 'uploads'),
    );
    this.avatarDirectory = join(storageRoot, 'avatars');
    this.attachmentDirectory = join(storageRoot, 'task-attachments');
  }

  async uploadAvatar(
    file: AvatarUploadFile,
    userId: string,
  ): Promise<StoredFile> {
    if (!isAllowedAvatarMimeType(file.mimetype)) {
      throw new Error('Unsupported avatar MIME type');
    }

    await mkdir(this.avatarDirectory, { recursive: true });
    const extension = AVATAR_EXTENSION_BY_MIME[file.mimetype];
    const key = `${userId}-${randomUUID()}.${extension}`;
    await writeFile(join(this.avatarDirectory, key), file.buffer, {
      flag: 'wx',
    });

    return {
      url: `/api/storage/avatars/${key}`,
      key,
      provider: this.provider,
    };
  }

  async deleteAvatar(key: string): Promise<void> {
    if (!this.isSafeKey(key)) return;

    try {
      await unlink(join(this.avatarDirectory, key));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async uploadAttachment(
    file: TaskAttachmentUploadFile,
    context: TaskAttachmentUploadContext,
  ): Promise<StoredFile> {
    if (!isAllowedTaskAttachmentMimeType(file.mimetype)) {
      throw new Error('Unsupported task attachment MIME type');
    }

    await mkdir(this.attachmentDirectory, { recursive: true });
    const extension = TASK_ATTACHMENT_EXTENSION_BY_MIME[file.mimetype];
    const key = `${context.workspaceId}-${context.taskId}-${randomUUID()}.${extension}`;
    await writeFile(join(this.attachmentDirectory, key), file.buffer, {
      flag: 'wx',
    });

    return {
      url: `/api/storage/task-attachments/${key}`,
      key,
      provider: this.provider,
    };
  }

  async deleteAttachment(key: string): Promise<void> {
    if (!this.isSafeAttachmentKey(key)) return;

    try {
      await unlink(join(this.attachmentDirectory, key));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async readAvatar(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.isSafeKey(key)) {
      throw new NotFoundException('Avatar not found');
    }

    try {
      const buffer = await readFile(join(this.avatarDirectory, key));
      return {
        buffer,
        contentType: this.contentTypeForKey(key),
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundException('Avatar not found');
      }
      throw error;
    }
  }

  async readAttachment(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.isSafeAttachmentKey(key)) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      const buffer = await readFile(join(this.attachmentDirectory, key));
      return {
        buffer,
        contentType: this.attachmentContentTypeForKey(key),
      };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundException('Attachment not found');
      }
      throw error;
    }
  }

  private isSafeKey(key: string) {
    return basename(key) === key && AVATAR_KEY_PATTERN.test(key);
  }

  private isSafeAttachmentKey(key: string) {
    return basename(key) === key && ATTACHMENT_KEY_PATTERN.test(key);
  }

  private contentTypeForKey(key: string) {
    if (key.endsWith('.png')) return 'image/png';
    if (key.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  private attachmentContentTypeForKey(key: string) {
    if (key.endsWith('.png')) return 'image/png';
    if (key.endsWith('.webp')) return 'image/webp';
    if (key.endsWith('.gif')) return 'image/gif';
    if (key.endsWith('.pdf')) return 'application/pdf';
    return 'image/jpeg';
  }
}
