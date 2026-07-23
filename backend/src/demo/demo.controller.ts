import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { setTokenCookies } from '@/auth/auth-cookies';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';
import { User } from '@/users/entities/user.entity';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { detectRequestLocale } from '@/common/locale/request-locale';
import { DemoWorkspaceSessionDto } from './dto/demo.dto';
import { DemoService } from './demo.service';
import { getRequestSessionMetadata } from '@/auth/session-metadata';

const getClientKey = (req: Request) =>
  req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';

@ApiTags('demo')
@Controller()
export class DemoController {
  constructor(
    private readonly demoService: DemoService,
    private readonly authService: AuthService,
    private readonly rateLimiter: InMemoryRateLimiterService,
  ) {}

  @Post('api/auth/demo-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open the showcase demo workspace' })
  @ApiOkResponse({ type: DemoWorkspaceSessionDto })
  async demoLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DemoWorkspaceSessionDto> {
    this.rateLimiter.consume(
      `demo-login:${getClientKey(req)}`,
      10,
      10 * 60 * 1000,
    );
    const demo = await this.demoService.startDemoSession(
      detectRequestLocale(req),
    );
    const tokens = await this.authService.issueTokenPair(
      demo.user,
      getRequestSessionMetadata(req),
    );
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      user: tokens.user,
      workspaceId: demo.workspaceId,
      boardId: demo.boardId,
    };
  }

  @Post('api/demo/workspace/reset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset the current demo workspace' })
  @ApiOkResponse({ type: DemoWorkspaceSessionDto })
  async resetWorkspace(
    @Req() req: Request,
    @CurrentUser() user: User,
  ): Promise<DemoWorkspaceSessionDto> {
    this.rateLimiter.consume(
      `demo-reset:${user.id}:${getClientKey(req)}`,
      5,
      10 * 60 * 1000,
    );
    const demo = await this.demoService.resetDemoWorkspace(
      user.id,
      detectRequestLocale(req),
    );

    return {
      user: {
        id: demo.user.id,
        email: demo.user.email,
        name: demo.user.name,
        avatar: demo.user.avatar,
        activeWorkspaceId: demo.user.activeWorkspaceId,
      },
      workspaceId: demo.workspaceId,
      boardId: demo.boardId,
    };
  }

  @Post('api/demo/workspace-invites/:token/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a temporary account for a demo invite' })
  @ApiParam({ name: 'token' })
  @ApiOkResponse({ type: DemoWorkspaceSessionDto })
  async registerFromDemoInvite(
    @Param('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DemoWorkspaceSessionDto> {
    this.rateLimiter.consume(
      `demo-invite-register:${token}:${getClientKey(req)}`,
      10,
      10 * 60 * 1000,
    );
    const demo = await this.demoService.registerDemoInviteGuest(
      token,
      detectRequestLocale(req),
    );
    const tokens = await this.authService.issueTokenPair(
      demo.user,
      getRequestSessionMetadata(req),
    );
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      user: tokens.user,
      workspaceId: demo.workspaceId,
      boardId: demo.boardId,
    };
  }
}
