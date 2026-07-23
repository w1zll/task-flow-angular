import { Injectable } from '@nestjs/common';
import { HealthResponseDto } from './common/dto/health-response.dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
