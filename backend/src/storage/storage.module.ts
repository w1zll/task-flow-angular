import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { ImageKitStorageAdapter } from './imagekit-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { StorageController } from './storage.controller';
import {
  STORAGE_ADAPTER,
  StorageAdapter,
  StorageProvider,
} from './storage.types';

@Module({
  controllers: [StorageController],
  providers: [
    LocalStorageAdapter,
    CloudinaryStorageAdapter,
    ImageKitStorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      inject: [
        ConfigService,
        LocalStorageAdapter,
        CloudinaryStorageAdapter,
        ImageKitStorageAdapter,
      ],
      useFactory: (
        config: ConfigService,
        local: LocalStorageAdapter,
        cloudinary: CloudinaryStorageAdapter,
        imagekit: ImageKitStorageAdapter,
      ): StorageAdapter => {
        const provider = (
          config.get<string>('STORAGE_PROVIDER') ?? 'local'
        ).toLowerCase() as StorageProvider;

        if (provider === 'cloudinary') return cloudinary;
        if (provider === 'imagekit') return imagekit;
        if (provider === 'local') return local;
        throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
      },
    },
  ],
  exports: [STORAGE_ADAPTER, LocalStorageAdapter],
})
export class StorageModule {}
