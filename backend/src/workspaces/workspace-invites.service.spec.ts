import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '@/users/entities/user.entity';
import {
  WorkspaceInviteAuditEvent,
  WorkspaceInviteAuditEventType,
} from './entities/workspace-invite-audit-event.entity';
import { WorkspaceInvite } from './entities/workspace-invite.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceInvitesService } from './workspace-invites.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspaceInvitesService', () => {
  let service: WorkspaceInvitesService;
  let inviteRepo: jest.Mocked<Partial<Repository<WorkspaceInvite>>>;
  let auditRepo: jest.Mocked<
    Partial<Repository<WorkspaceInviteAuditEvent>>
  >;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let workspacesService: jest.Mocked<Partial<WorkspacesService>>;
  let config: { get: jest.Mock };

  const workspace = {
    id: 'workspace-1',
    name: 'Product Team',
    ownerId: 'owner-1',
  } as Workspace;
  const creator = {
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
  } as User;

  const createInvite = (
    overrides: Partial<WorkspaceInvite> = {},
  ): WorkspaceInvite =>
    ({
      id: 'invite-1',
      workspaceId: workspace.id,
      workspace,
      tokenHash: 'hash',
      createdById: creator.id,
      createdBy: creator,
      defaultRole: WorkspaceRole.MEMBER,
      expiresAt: new Date(Date.now() + 60_000),
      maxUses: null,
      usesCount: 0,
      revokedAt: null,
      allowedEmail: null,
      allowedEmailDomain: null,
      createdAt: new Date('2026-06-25T00:00:00.000Z'),
      updatedAt: new Date('2026-06-25T00:00:00.000Z'),
      ...overrides,
    }) as WorkspaceInvite;

  beforeEach(() => {
    inviteRepo = {
      create: jest.fn((value) => value as WorkspaceInvite),
      save: jest.fn(async (value: WorkspaceInvite) =>
        createInvite({ ...value }),
      ),
      findOne: jest.fn(),
    };
    auditRepo = {
      create: jest.fn((value) => value as WorkspaceInviteAuditEvent),
      save: jest.fn(async (value: WorkspaceInviteAuditEvent) => value),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(creator),
    };
    dataSource = {
      transaction: jest.fn(),
    };
    workspacesService = {
      assertMember: jest.fn().mockResolvedValue({
        workspace,
        role: WorkspaceRole.OWNER,
      }),
    };
    config = {
      get: jest.fn().mockReturnValue(undefined),
    };

    service = new WorkspaceInvitesService(
      inviteRepo as Repository<WorkspaceInvite>,
      auditRepo as Repository<WorkspaceInviteAuditEvent>,
      userRepo as Repository<User>,
      dataSource as DataSource,
      workspacesService as WorkspacesService,
      config as any,
    );
  });

  it('stores only a token hash and returns the raw token once', async () => {
    const result = await service.create(
      workspace.id,
      { expiresInDays: 3 },
      creator.id,
    );

    const stored = inviteRepo.create!.mock.calls[0][0];
    expect(result.token).toHaveLength(43);
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.tokenHash).not.toBe(result.token);
    expect(result.createdByName).toBe('Owner');
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: WorkspaceInviteAuditEventType.CREATED,
      }),
    );
  });

  it('allows only an owner to create an admin invite', async () => {
    workspacesService.assertMember!.mockResolvedValue({
      workspace,
      role: WorkspaceRole.ADMIN,
    });

    await expect(
      service.create(
        workspace.id,
        { defaultRole: WorkspaceRole.ADMIN },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('previews an active invite without exposing a specific email', async () => {
    inviteRepo.findOne!.mockResolvedValue(
      createInvite({ allowedEmail: 'person@example.com' }),
    );

    const result = await service.preview('raw-token');

    expect(result).toEqual({
      workspaceId: workspace.id,
      workspaceName: 'Product Team',
      inviterName: 'Owner',
      expiresAt: expect.any(Date),
      defaultRole: WorkspaceRole.MEMBER,
      emailRestricted: true,
      isDemoInvite: false,
    });
    expect(result).not.toHaveProperty('allowedEmail');
  });

  it('rejects expired invites', async () => {
    inviteRepo.findOne!.mockResolvedValue(
      createInvite({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(service.preview('expired-token')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('adds a member, increments usage, activates workspace and audits accept', async () => {
    const invite = createInvite({ maxUses: 2 });
    const transactionInviteRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(invite),
      })),
      save: jest.fn(async (value) => value),
    };
    const transactionMemberRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const transactionAuditRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const transactionUserRepo = {
      update: jest.fn(),
    };
    const transactionWorkspaceRepo = {
      findOne: jest.fn().mockResolvedValue(workspace),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === WorkspaceInvite) return transactionInviteRepo;
        if (entity === WorkspaceMember) return transactionMemberRepo;
        if (entity === WorkspaceInviteAuditEvent) return transactionAuditRepo;
        if (entity === User) return transactionUserRepo;
        if (entity === Workspace) return transactionWorkspaceRepo;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource.transaction!.mockImplementation(async (callback: any) =>
      callback(manager),
    );

    const result = await service.accept('raw-token', {
      id: 'user-2',
      email: 'user@example.com',
    } as User);

    expect(transactionMemberRepo.create).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      userId: 'user-2',
      role: WorkspaceRole.MEMBER,
    });
    expect(invite.usesCount).toBe(1);
    expect(transactionUserRepo.update).toHaveBeenCalledWith('user-2', {
      activeWorkspaceId: workspace.id,
    });
    expect(transactionAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: WorkspaceInviteAuditEventType.ACCEPTED,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: workspace.id,
        currentUserRole: WorkspaceRole.MEMBER,
        isActive: true,
      }),
    );
  });

  it('accepts idempotently for an existing workspace member', async () => {
    const invite = createInvite();
    const transactionInviteRepo = {
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(invite),
      })),
      save: jest.fn(),
    };
    const transactionMemberRepo = {
      findOne: jest.fn().mockResolvedValue({
        role: WorkspaceRole.ADMIN,
      }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const transactionAuditRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    const transactionUserRepo = {
      update: jest.fn(),
    };
    const transactionWorkspaceRepo = {
      findOne: jest.fn().mockResolvedValue(workspace),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === WorkspaceInvite) return transactionInviteRepo;
        if (entity === WorkspaceMember) return transactionMemberRepo;
        if (entity === WorkspaceInviteAuditEvent) return transactionAuditRepo;
        if (entity === User) return transactionUserRepo;
        if (entity === Workspace) return transactionWorkspaceRepo;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource.transaction!.mockImplementation(async (callback: any) =>
      callback(manager),
    );

    const result = await service.accept('raw-token', {
      id: 'user-2',
      email: 'user@example.com',
    } as User);

    expect(transactionMemberRepo.save).not.toHaveBeenCalled();
    expect(transactionInviteRepo.save).not.toHaveBeenCalled();
    expect(transactionAuditRepo.save).not.toHaveBeenCalled();
    expect(result.currentUserRole).toBe(WorkspaceRole.ADMIN);
    expect(transactionUserRepo.update).toHaveBeenCalled();
  });
});
