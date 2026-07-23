import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FrontendCacheService {
  private readonly logger = new Logger(FrontendCacheService.name);

  constructor(private readonly configService: ConfigService) {}

  async revalidateBoard(boardId: string): Promise<void> {
    const secret = this.configService.get<string>('FRONTEND_REVALIDATE_SECRET');
    const endpoint = this.getRevalidateEndpoint();

    if (!secret || !endpoint) return;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ boardId }),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Frontend cache revalidation failed for board ${boardId}: ${response.status}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Frontend cache revalidation failed for board ${boardId}: ${message}`,
      );
    }
  }

  private getRevalidateEndpoint(): string | null {
    const explicitUrl = this.configService.get<string>('FRONTEND_REVALIDATE_URL');
    if (explicitUrl) return explicitUrl;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) return null;

    return `${frontendUrl.replace(/\/$/, '')}/api/cache/revalidate-board`;
  }
}
