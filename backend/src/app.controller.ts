import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto } from './common/dto/health-response.dto';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({ type: String })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/health')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
