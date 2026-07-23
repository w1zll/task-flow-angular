import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class InMemoryRateLimiterService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private requestsSinceCleanup = 0;

  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    this.cleanupExpiredBuckets(now);

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (current.count >= limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }

  private cleanupExpiredBuckets(now: number): void {
    this.requestsSinceCleanup += 1;
    if (this.requestsSinceCleanup < 100) return;

    this.requestsSinceCleanup = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
