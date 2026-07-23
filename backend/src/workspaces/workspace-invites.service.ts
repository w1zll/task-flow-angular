import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import {
  CreateWorkspaceInviteDto,
  CreatedWorkspaceInviteResponseDto,
  WorkspaceInvitePreviewDto,
  WorkspaceInviteResponseDto,
} from './dto/workspace-invite.dto';
import {
  WorkspaceInviteAuditEvent,
  WorkspaceInviteAuditEventType,
} from './entities/workspace-invite-audit-event.entity';
import { WorkspaceInvite } from './entities/workspace-invite.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceWithAccess, WorkspacesService } from './workspaces.service';

const DEFAULT_DEMO_OWNER_EMAIL = 'demo-owner@taskflow.local';

@Injectable()
export class WorkspaceInvitesService {
  constructor(
    @InjectRepository(WorkspaceInvite)
    private readonly inviteRepo: Repository<WorkspaceInvite>,
    @InjectRepository(WorkspaceInviteAuditEvent)
    private readonly auditRepo: Repository<WorkspaceInviteAuditEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly workspacesService: WorkspacesService,
    private readonly config: ConfigService,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateWorkspaceInviteDto,
    userId: string,
  ): Promise<CreatedWorkspaceInviteResponseDto> {
    const access = await this.assertCanManageInvites(workspaceId, userId);
    const defaultRole = dto.defaultRole ?? WorkspaceRole.MEMBER;

    if (defaultRole === WorkspaceRole.OWNER) {
      throw new BadRequestException('Owner role cannot be assigned by invite');
    }
    if (
      defaultRole === WorkspaceRole.ADMIN &&
      access.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException('Only workspace owners can invite admins');
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + (dto.expiresInDays ?? 7));

    const invite = await this.inviteRepo.save(
      this.inviteRepo.create({
        workspaceId,
        tokenHash: this.hashToken(token),
        createdById: userId,
        defaultRole,
        expiresAt,
        maxUses: dto.maxUses ?? null,
        allowedEmail: this.normalizeOptionalEmail(dto.allowedEmail),
        allowedEmailDomain: this.normalizeOptionalDomain(
          dto.allowedEmailDomain,
        ),
      }),
    );
    const creator = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!creator) throw new NotFoundException('User not found');

    await this.auditRepo.save(
      this.auditRepo.create({
        workspaceId,
        inviteId: invite.id,
        actorUserId: userId,
        event: WorkspaceInviteAuditEventType.CREATED,
        metadata: {
          defaultRole,
          expiresAt: expiresAt.toISOString(),
          maxUses: invite.maxUses,
          hasEmailRestriction: Boolean(
            invite.allowedEmail || invite.allowedEmailDomain,
          ),
        },
      }),
    );

    return {
      ...this.toResponse(Object.assign(invite, { createdBy: creator })),
      token,
    };
  }

  async listActive(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceInviteResponseDto[]> {
    await this.assertCanManageInvites(workspaceId, userId);

    const invites = await this.inviteRepo
      .createQueryBuilder('invite')
      .leftJoinAndSelect('invite.createdBy', 'createdBy')
      .where('invite.workspaceId = :workspaceId', { workspaceId })
      .andWhere('invite.revokedAt IS NULL')
      .andWhere('invite.expiresAt > NOW()')
      .andWhere(
        '(invite.maxUses IS NULL OR invite.usesCount < invite.maxUses)',
      )
      .orderBy('invite.createdAt', 'DESC')
      .getMany();

    return invites.map((invite) => this.toResponse(invite));
  }

  async revoke(
    workspaceId: string,
    inviteId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageInvites(workspaceId, userId);
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, workspaceId },
    });
    if (!invite) throw new NotFoundException('Workspace invite not found');
    if (invite.revokedAt) return;

    invite.revokedAt = new Date();
    await this.inviteRepo.save(invite);
    await this.auditRepo.save(
      this.auditRepo.create({
        workspaceId,
        inviteId,
        actorUserId: userId,
        event: WorkspaceInviteAuditEventType.REVOKED,
        metadata: null,
      }),
    );
  }

  async preview(token: string): Promise<WorkspaceInvitePreviewDto> {
    const invite = await this.findInviteByToken(token);
    this.assertInviteIsUsable(invite);

    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      inviterName: invite.createdBy.name,
      expiresAt: invite.expiresAt,
      defaultRole: invite.defaultRole,
      emailRestricted: Boolean(
        invite.allowedEmail || invite.allowedEmailDomain,
      ),
      isDemoInvite: this.isDemoInvite(invite),
    };
  }

  async accept(token: string, user: User): Promise<WorkspaceWithAccess> {
    return this.dataSource.transaction(async (manager) => {
      const inviteRepo = manager.getRepository(WorkspaceInvite);
      const memberRepo = manager.getRepository(WorkspaceMember);
      const auditRepo = manager.getRepository(WorkspaceInviteAuditEvent);
      const userRepo = manager.getRepository(User);
      const workspaceRepo = manager.getRepository(Workspace);

      const invite = await inviteRepo
        .createQueryBuilder('invite')
        .setLock('pessimistic_write')
        .where('invite.tokenHash = :tokenHash', {
          tokenHash: this.hashToken(token),
        })
        .getOne();
      if (!invite) throw new NotFoundException('Workspace invite not found');
      const workspace = await workspaceRepo.findOne({
        where: { id: invite.workspaceId },
      });
      if (!workspace) throw new NotFoundException('Workspace not found');

      this.assertInviteIsUsable(invite);
      this.assertEmailAllowed(invite, user.email);

      const existingMembership = await memberRepo.findOne({
        where: { workspaceId: invite.workspaceId, userId: user.id },
      });
      const role = existingMembership?.role ?? invite.defaultRole;

      if (!existingMembership) {
        await memberRepo.save(
          memberRepo.create({
            workspaceId: invite.workspaceId,
            userId: user.id,
            role,
          }),
        );
        invite.usesCount += 1;
        await inviteRepo.save(invite);
        await auditRepo.save(
          auditRepo.create({
            workspaceId: invite.workspaceId,
            inviteId: invite.id,
            actorUserId: user.id,
            event: WorkspaceInviteAuditEventType.ACCEPTED,
            metadata: { assignedRole: role },
          }),
        );
      }

      await userRepo.update(user.id, {
        activeWorkspaceId: invite.workspaceId,
      });

      return Object.assign(workspace, {
        currentUserRole: role,
        isActive: true,
      });
    });
  }

  private async assertCanManageInvites(workspaceId: string, userId: string) {
    const access = await this.workspacesService.assertMember(
      workspaceId,
      userId,
    );
    if (
      access.role !== WorkspaceRole.OWNER &&
      access.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can manage invites',
      );
    }
    return access;
  }

  private async findInviteByToken(token: string): Promise<WorkspaceInvite> {
    const invite = await this.inviteRepo.findOne({
      where: { tokenHash: this.hashToken(token) },
      relations: ['workspace', 'createdBy'],
    });
    if (!invite) throw new NotFoundException('Workspace invite not found');
    return invite;
  }

  private assertInviteIsUsable(invite: WorkspaceInvite): void {
    if (
      invite.revokedAt ||
      invite.expiresAt.getTime() <= Date.now() ||
      (invite.maxUses !== null && invite.usesCount >= invite.maxUses)
    ) {
      throw new NotFoundException('Workspace invite is no longer available');
    }
  }

  private assertEmailAllowed(invite: WorkspaceInvite, email: string): void {
    const normalizedEmail = email.trim().toLowerCase();
    if (invite.allowedEmail && invite.allowedEmail !== normalizedEmail) {
      throw new ForbiddenException(
        'This invite is restricted to another email address',
      );
    }
    if (
      invite.allowedEmailDomain &&
      !normalizedEmail.endsWith(`@${invite.allowedEmailDomain}`)
    ) {
      throw new ForbiddenException(
        'Your email domain is not allowed by this invite',
      );
    }
  }

  private toResponse(invite: WorkspaceInvite): WorkspaceInviteResponseDto {
    return {
      id: invite.id,
      workspaceId: invite.workspaceId,
      defaultRole: invite.defaultRole,
      createdById: invite.createdById,
      createdByName: invite.createdBy?.name ?? '',
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usesCount: invite.usesCount,
      revokedAt: invite.revokedAt,
      allowedEmailDomain: invite.allowedEmailDomain,
      hasSpecificEmailRestriction: Boolean(invite.allowedEmail),
      createdAt: invite.createdAt,
    };
  }

  private isDemoInvite(invite: WorkspaceInvite): boolean {
    return Boolean(
      invite.workspace?.isDemoTemplate ||
        invite.workspace?.isDemoInstance ||
        invite.createdBy?.email === this.demoOwnerEmail,
    );
  }

  private get demoOwnerEmail() {
    return (
      this.config.get<string>('DEMO_OWNER_EMAIL') ??
      DEFAULT_DEMO_OWNER_EMAIL
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeOptionalEmail(value?: string | null): string | null {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizeOptionalDomain(value?: string | null): string | null {
    const normalized = value?.trim().toLowerCase().replace(/^@/, '');
    return normalized || null;
  }
}
