import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { InMemoryRateLimiterService } from '@/common/rate-limit/in-memory-rate-limiter.service';
import { User } from '@/users/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CreateWorkspaceInviteDto,
  CreatedWorkspaceInviteResponseDto,
  WorkspaceInvitePreviewDto,
  WorkspaceInviteResponseDto,
} from './dto/workspace-invite.dto';
import { WorkspaceResponseDto } from './dto/workspace.dto';
import { WorkspaceInvitesService } from './workspace-invites.service';

@ApiTags('workspace invites')
@Controller('api')
export class WorkspaceInvitesController {
  constructor(
    private readonly invitesService: WorkspaceInvitesService,
    private readonly rateLimiter: InMemoryRateLimiterService,
  ) {}

  @Post('workspaces/:workspaceId/invites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a public workspace invite link' })
  @ApiCreatedResponse({ type: CreatedWorkspaceInviteResponseDto })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInviteDto,
    @CurrentUser() user: User,
  ) {
    return this.invitesService.create(workspaceId, dto, user.id);
  }

  @Get('workspaces/:workspaceId/invites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active workspace invite links' })
  @ApiOkResponse({ type: WorkspaceInviteResponseDto, isArray: true })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitesService.listActive(workspaceId, user.id);
  }

  @Delete('workspaces/:workspaceId/invites/:inviteId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a workspace invite link' })
  @ApiNoContentResponse()
  revoke(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: User,
  ) {
    return this.invitesService.revoke(workspaceId, inviteId, user.id);
  }

  @Get('workspace-invites/:token')
  @ApiOperation({ summary: 'Preview a public workspace invite' })
  @ApiOkResponse({ type: WorkspaceInvitePreviewDto })
  preview(@Param('token') token: string, @Req() req: Request) {
    this.rateLimiter.consume(
      `workspace-invite-preview:${this.getClientAddress(req)}`,
      30,
      60_000,
    );
    return this.invitesService.preview(token);
  }

  @Post('workspace-invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a public workspace invite' })
  @ApiOkResponse({ type: WorkspaceResponseDto })
  accept(
    @Param('token') token: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    this.rateLimiter.consume(
      `workspace-invite-accept:${user.id}:${this.getClientAddress(req)}`,
      10,
      60_000,
    );
    return this.invitesService.accept(token, user);
  }

  private getClientAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
