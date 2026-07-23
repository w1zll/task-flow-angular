import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  NotFoundException,
  ConflictException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  AvatarUploadDto,
  LoginDto,
  RegisterDto,
  RegisterRequestDto,
  SessionDto,
  UserDto,
  WsTokenResponseDto,
  AuthMethodsDto,
  OAuthProvidersDto,
} from './dto/auth.dto';
import type { Request, Response } from 'express';
import { User } from '@/users/entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { MessageDto } from '@/common/dto/message-response.dto';
import { detectRequestLocale } from '@/common/locale/request-locale';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarUploadOptions } from '@/storage/avatar-upload.constants';
import type { AvatarUploadFile } from '@/storage/storage.types';
import {
  clearTokenCookies,
  clearOAuthAttemptCookie,
  OAUTH_ATTEMPT_COOKIE,
  REFRESH_COOKIE,
  setOAuthAttemptCookie,
  setTokenCookies,
} from './auth-cookies';
import { describeSession, getRequestSessionMetadata } from './session-metadata';
import { OAuthService } from './oauth/oauth.service';
import { OAuthProvider } from './entities/auth-identity.entity';
import { OAuthFlowError } from './oauth/oauth.types';
import { ConfigService } from '@nestjs/config';
import { OAuthIntent } from './entities/oauth-attempt.entity';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: InMemoryRateLimiterService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'List configured social sign-in providers' })
  @ApiOkResponse({ type: OAuthProvidersDto })
  providers(): OAuthProvidersDto {
    return { providers: this.oauthService.getEnabledProviders() };
  }

  @Get('oauth/:provider/start')
  @ApiOperation({ summary: 'Start Google or GitHub sign-in' })
  @ApiParam({ name: 'provider', enum: OAuthProvider })
  async startOAuth(
    @Param('provider') providerValue: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const provider = this.parseProvider(providerValue);
    this.rateLimiter.consume(
      `oauth-start:${provider}:${req.ip ?? 'unknown'}`,
      10,
      10 * 60_000,
    );
    const result = await this.oauthService.startLogin(provider);
    setOAuthAttemptCookie(res, result.attemptCookie);
    return res.redirect(HttpStatus.FOUND, result.authorizationUrl);
  }

  @Get('oauth/:provider/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect Google or GitHub to the current account' })
  @ApiParam({ name: 'provider', enum: OAuthProvider })
  async linkOAuth(
    @Param('provider') providerValue: string,
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const provider = this.parseProvider(providerValue);
    this.rateLimiter.consume(
      `oauth-link:${provider}:${user.id}:${req.ip ?? 'unknown'}`,
      10,
      10 * 60_000,
    );
    const result = await this.oauthService.startLink(provider, user);
    setOAuthAttemptCookie(res, result.attemptCookie);
    return res.redirect(HttpStatus.FOUND, result.authorizationUrl);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'Complete Google or GitHub authorization' })
  @ApiParam({ name: 'provider', enum: OAuthProvider })
  async oauthCallback(
    @Param('provider') providerValue: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const provider = this.parseProvider(providerValue);
    this.rateLimiter.consume(
      `oauth-callback:${provider}:${req.ip ?? 'unknown'}`,
      30,
      10 * 60_000,
    );
    const frontendCallback = `${this.frontendUrl()}/auth/oauth/callback`;
    try {
      const result = await this.oauthService.complete(provider, {
        code,
        state,
        providerError,
        attemptCookie: req.cookies?.[OAUTH_ATTEMPT_COOKIE],
        locale: detectRequestLocale(req),
        sessionMetadata: getRequestSessionMetadata(req),
      });
      clearOAuthAttemptCookie(res);
      if (result.intent === OAuthIntent.Login && result.authResult) {
        setTokenCookies(
          res,
          result.authResult.accessToken,
          result.authResult.refreshToken,
        );
        return res.redirect(HttpStatus.FOUND, frontendCallback);
      }
      return res.redirect(
        HttpStatus.FOUND,
        `${frontendCallback}?linked=${provider}`,
      );
    } catch (error) {
      clearOAuthAttemptCookie(res);
      const codeValue =
        error instanceof OAuthFlowError
          ? error.code
          : 'provider_unavailable';
      if (error instanceof OAuthFlowError && error.intent === OAuthIntent.Link) {
        return res.redirect(
          HttpStatus.FOUND,
          `${this.frontendUrl()}/profile?oauthError=${codeValue}`,
        );
      }
      return res.redirect(
        HttpStatus.FOUND,
        `${frontendCallback}?error=${codeValue}`,
      );
    }
  }

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available sign-in methods' })
  @ApiOkResponse({ type: AuthMethodsDto })
  methods(@CurrentUser() user: User): Promise<AuthMethodsDto> {
    return this.oauthService.getMethods(user.id);
  }

  @Delete('identities/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a social sign-in method' })
  @ApiParam({ name: 'provider', enum: OAuthProvider })
  async unlinkOAuth(
    @Param('provider') providerValue: string,
    @CurrentUser() user: User,
  ) {
    try {
      await this.oauthService.unlinkIdentity(
        user,
        this.parseProvider(providerValue),
      );
    } catch (error) {
      if (error instanceof OAuthFlowError && error.code === 'last_method') {
        throw new ConflictException({
          code: 'last_method',
          message: 'The last sign-in method cannot be disconnected',
        });
      }
      throw error;
    }
  }

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: RegisterRequestDto })
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() avatarFile: AvatarUploadFile | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      dto,
      detectRequestLocale(req),
      avatarFile,
      getRequestSessionMetadata(req),
    );
    setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация пользователя' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      getRequestSessionMetadata(req),
    );
    setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление токенов' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    try {
      const result = await this.authService.refresh(
        refreshToken,
        getRequestSessionMetadata(req),
      );
      setTokenCookies(res, result.accessToken, result.refreshToken);
      return { user: result.user };
    } catch (error) {
      clearTokenCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Выход пользователя - удалиение токенов и очищение куки',
  })
  @ApiOkResponse({ type: MessageDto })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(refreshToken);
    clearTokenCookies(res);
    return { message: 'Выход выполнен' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получение информации о текущем пользователе' })
  @ApiOkResponse({
    type: UserDto,
  })
  async me(@CurrentUser() user: User) {
    return this.toUserDto(user);
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AvatarUploadDto })
  @ApiOperation({ summary: 'Upload a new profile avatar' })
  @ApiOkResponse({ type: UserDto })
  async updateAvatar(
    @CurrentUser() user: User,
    @UploadedFile() avatarFile: AvatarUploadFile,
  ) {
    const updated = await this.authService.updateAvatar(user, avatarFile);
    return this.toUserDto(updated);
  }

  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset profile avatar to the default' })
  @ApiOkResponse({ type: UserDto })
  async resetAvatar(@CurrentUser() user: User) {
    const updated = await this.authService.resetAvatar(user);
    return this.toUserDto(updated);
  }

  @Get('ws-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить короткоживущий токен для WebSocket' })
  @ApiOkResponse({ type: WsTokenResponseDto })
  async wsToken(@CurrentUser() user: User): Promise<WsTokenResponseDto> {
    return {
      token: this.authService.generateWebSocketToken(user),
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить активные сессии пользователя' })
  @ApiOkResponse({ type: SessionDto, isArray: true })
  async sessions(@CurrentUser() user: User, @Req() req: Request) {
    const sessions = await this.authService.getSessions(
      user.id,
      req.cookies?.[REFRESH_COOKIE],
    );
    return sessions.map(({ session, current }) => ({
      id: session.id,
      current,
      ...describeSession(session.userAgent),
      ipAddress: session.ipAddress ?? null,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    }));
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить все сессии, кроме текущей' })
  async revokeOtherSessions(@CurrentUser() user: User, @Req() req: Request) {
    await this.authService.revokeOtherSessions(
      user.id,
      req.cookies?.[REFRESH_COOKIE],
    );
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Завершить активную сессию' })
  async revokeSession(@Param('id') id: string, @CurrentUser() user: User) {
    await this.authService.revokeSession(user.id, id);
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      activeWorkspaceId: user.activeWorkspaceId,
    };
  }

  private parseProvider(value: string): OAuthProvider {
    if (value === OAuthProvider.Google || value === OAuthProvider.GitHub) {
      return value;
    }
    throw new NotFoundException('OAuth provider not found');
  }

  private frontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }
}
