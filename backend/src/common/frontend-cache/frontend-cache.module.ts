import { Global, Module } from '@nestjs/common';
import { FrontendCacheService } from './frontend-cache.service';

@Global()
@Module({
  providers: [FrontendCacheService],
  exports: [FrontendCacheService],
})
export class FrontendCacheModule {}
