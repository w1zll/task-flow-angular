import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AvatarService } from './avatar.service';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorageModule],
  providers: [AvatarService],
  exports: [TypeOrmModule, AvatarService],
})
export class UsersModule {}
