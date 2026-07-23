import { HttpException } from '@nestjs/common';
import { InMemoryRateLimiterService } from './in-memory-rate-limiter.service';

describe('InMemoryRateLimiterService', () => {
  it('rejects requests after the configured limit', () => {
    const service = new InMemoryRateLimiterService();

    service.consume('invite-preview:127.0.0.1', 2, 60_000);
    service.consume('invite-preview:127.0.0.1', 2, 60_000);

    expect(() =>
      service.consume('invite-preview:127.0.0.1', 2, 60_000),
    ).toThrow(HttpException);
  });

  it('keeps separate buckets for different keys', () => {
    const service = new InMemoryRateLimiterService();

    service.consume('first', 1, 60_000);

    expect(() => service.consume('second', 1, 60_000)).not.toThrow();
  });
});
