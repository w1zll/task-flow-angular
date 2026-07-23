import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

type ImageKitUploadResponse = {
  fileId?: string;
  url?: string;
  message?: string;
};

@Injectable()
export class ImageKitStorageAdapter implements StorageAdapter {
  readonly provider = 'imagekit' as const;

  constructor(private readonly config: ConfigService) {}

  async uploadAvatar(
    file: AvatarUploadFile,
    userId: string,
  ): Promise<StoredFile> {
    if (!isAllowedAvatarMimeType(file.mimetype)) {
      throw new Error('Unsupported avatar MIME type');
    }

    const privateKey = this.getPrivateKey();
    const extension = AVATAR_EXTENSION_BY_MIME[file.mimetype];
    const fileName = `${userId}-${randomUUID()}.${extension}`;
    const form = new FormData();
    const fileBytes = new Uint8Array(file.buffer.byteLength);
    fileBytes.set(file.buffer);

    form.append(
      'file',
      new Blob([fileBytes.buffer], { type: file.mimetype }),
      fileName,
    );
    form.append('fileName', fileName);
    form.append('folder', '/taskflow/avatars');
    form.append('useUniqueFileName', 'false');

    const response = await fetch(
      'https://upload.imagekit.io/api/v1/files/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
        },
        body: form,
      },
    );
    const result = (await response.json()) as ImageKitUploadResponse;

    if (!response.ok || !result.fileId || !result.url) {
      throw new BadGatewayException(
        result.message ?? 'ImageKit avatar upload failed',
      );
    }

    return {
      url: result.url,
      key: result.fileId,
      provider: this.provider,
    };
  }

  async deleteAvatar(key: string): Promise<void> {
    const privateKey = this.getPrivateKey();
    const response = await fetch(
      `https://api.imagekit.io/v1/files/${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new BadGatewayException('ImageKit avatar deletion failed');
    }
  }

  async uploadAttachment(
    file: TaskAttachmentUploadFile,
    context: TaskAttachmentUploadContext,
  ): Promise<StoredFile> {
    if (!isAllowedTaskAttachmentMimeType(file.mimetype)) {
      throw new Error('Unsupported task attachment MIME type');
    }

    const privateKey = this.getPrivateKey();
    const extension = TASK_ATTACHMENT_EXTENSION_BY_MIME[file.mimetype];
    const fileName = `${context.workspaceId}-${context.taskId}-${randomUUID()}.${extension}`;
    const form = new FormData();
    const fileBytes = new Uint8Array(file.buffer.byteLength);
    fileBytes.set(file.buffer);

    form.append(
      'file',
      new Blob([fileBytes.buffer], { type: file.mimetype }),
      fileName,
    );
    form.append('fileName', fileName);
    form.append('folder', '/taskflow/task-attachments');
    form.append('useUniqueFileName', 'false');

    const response = await fetch(
      'https://upload.imagekit.io/api/v1/files/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
        },
        body: form,
      },
    );
    const result = (await response.json()) as ImageKitUploadResponse;

    if (!response.ok || !result.fileId || !result.url) {
      throw new BadGatewayException(
        result.message ?? 'ImageKit attachment upload failed',
      );
    }

    return {
      url: result.url,
      key: result.fileId,
      provider: this.provider,
    };
  }

  async deleteAttachment(key: string): Promise<void> {
    return this.deleteAvatar(key);
  }

  private getPrivateKey() {
    const privateKey = this.config.get<string>('IMAGEKIT_PRIVATE_KEY');
    if (!privateKey) {
      throw new InternalServerErrorException(
        'ImageKit storage is not configured',
      );
    }
    return privateKey;
  }
}
