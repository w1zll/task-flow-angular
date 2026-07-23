import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LocalStorageAdapter } from './local-storage.adapter';

@ApiTags('storage')
@Controller('api/storage')
export class StorageController {
  constructor(private readonly localStorage: LocalStorageAdapter) {}

  @Get('avatars/:key')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Read a locally stored avatar' })
  @ApiOkResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async avatar(
    @Param('key') key: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const avatar = await this.localStorage.readAvatar(key);
    response.setHeader('Content-Type', avatar.contentType);
    return new StreamableFile(avatar.buffer);
  }
}
