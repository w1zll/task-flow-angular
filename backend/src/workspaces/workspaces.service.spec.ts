import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Board } from '@/boards/entities/board.entity';
import { User } from '@/users/entities/user.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { Workspace } from './entities/workspace.entity';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let workspaceRepo: jest.Mocked<Partial<Repository<Workspace>>>;
  let memberRepo: jest.Mocked<Partial<Repository<WorkspaceMember>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;

  const workspace = {
    id: 'workspace-1',
    name: 'Product Team',
    ownerId: 'user-1',
    isPersonal: false,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
  } as Workspace;

  beforeEach(() => {
    workspaceRepo = {
      create: jest.fn((data) => data as Workspace),
      save: jest.fn(async (value: Workspace) => ({
        ...value,
        id: value.id ?? 'workspace-1',
        createdAt: value.createdAt ?? new Date(),
        updatedAt: value.updatedAt ?? new Date(),
      })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    memberRepo = {
      create: jest.fn((data) => data as WorkspaceMember),
      save: jest.fn(async (value: WorkspaceMember) => ({
        ...value,
        id: value.id ?? 'membership-1',
      })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    service = new WorkspacesService(
      workspaceRepo as Repository<Workspace>,
      memberRepo as Repository<WorkspaceMember>,
      userRepo as Repository<User>,
    );
  });

  it('creates a localized personal workspace and makes it active', async () => {
    const user = {
      id: 'user-1',
      name: 'Ирина',
      activeWorkspaceId: null,
    } as User;

    const result = await service.createPersonalWorkspace(user, 'ru');

    expect(workspaceRepo.create).toHaveBeenCalledWith({
      name: 'Пространство Ирина',
      ownerId: 'user-1',
      isPersonal: true,
    });
    expect(memberRepo.create).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: WorkspaceRole.OWNER,
    });
    expect(userRepo.update).toHaveBeenCalledWith('user-1', {
      activeWorkspaceId: 'workspace-1',
    });
    expect(user.activeWorkspaceId).toBe('workspace-1');
    expect(result.id).toBe('workspace-1');
  });

  it('lists memberships and marks the active workspace', async () => {
    userRepo.findOne!.mockResolvedValue({
      id: 'user-1',
      activeWorkspaceId: 'workspace-1',
    } as User);
    memberRepo.find!.mockResolvedValue([
      {
        id: 'membership-1',
        workspaceId: 'workspace-1',
        role: WorkspaceRole.OWNER,
        workspace,
      } as WorkspaceMember,
      {
        id: 'membership-2',
        workspaceId: 'workspace-2',
        role: WorkspaceRole.MEMBER,
        workspace: { ...workspace, id: 'workspace-2', name: 'Design' },
      } as WorkspaceMember,
    ]);

    const result = await service.findAll('user-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'workspace-1',
        currentUserRole: WorkspaceRole.OWNER,
        isActive: true,
      }),
      expect.objectContaining({
        id: 'workspace-2',
        currentUserRole: WorkspaceRole.MEMBER,
        isActive: false,
      }),
    ]);
  });

  it('switches only to a workspace where the user is a member', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!.mockResolvedValue({
      id: 'membership-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: WorkspaceRole.MEMBER,
    } as WorkspaceMember);

    const result = await service.switchActive('workspace-1', 'user-1');

    expect(userRepo.update).toHaveBeenCalledWith('user-1', {
      activeWorkspaceId: 'workspace-1',
    });
    expect(result.isActive).toBe(true);
  });

  it('rejects switching to another workspace', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.switchActive('workspace-1', 'stranger-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  it('reports a missing workspace', async () => {
    workspaceRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.assertMember('missing-workspace', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows the owner to change a member role', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!
      .mockResolvedValueOnce({
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember)
      .mockResolvedValueOnce({
        id: 'membership-2',
        workspaceId: workspace.id,
        userId: 'user-2',
        role: WorkspaceRole.MEMBER,
        user: {
          id: 'user-2',
          name: 'Member',
          email: 'member@example.com',
        },
      } as WorkspaceMember);

    const result = await service.updateMemberRole(
      workspace.id,
      'membership-2',
      WorkspaceRole.ADMIN,
      workspace.ownerId,
    );

    expect(memberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: WorkspaceRole.ADMIN }),
    );
    expect(result.role).toBe(WorkspaceRole.ADMIN);
  });

  it('does not allow an admin to change workspace roles', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!.mockResolvedValue({
      workspaceId: workspace.id,
      userId: 'admin-1',
      role: WorkspaceRole.ADMIN,
    } as WorkspaceMember);

    await expect(
      service.updateMemberRole(
        workspace.id,
        'membership-2',
        WorkspaceRole.ADMIN,
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes a member and their board access inside the workspace', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!
      .mockResolvedValueOnce({
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember)
      .mockResolvedValueOnce({
        id: 'membership-2',
        workspaceId: workspace.id,
        userId: 'user-2',
        role: WorkspaceRole.MEMBER,
      } as WorkspaceMember);

    const deleteQuery = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };
    const removeMembership = jest.fn();
    const transferBoardOwnership = jest.fn();
    Object.defineProperty(memberRepo, 'manager', {
      value: {
        transaction: jest.fn(async (callback) =>
          callback({
            getRepository: jest.fn((entity) => {
              if (entity === WorkspaceMember) {
                return { remove: removeMembership };
              }
              if (entity === Board) {
                return { update: transferBoardOwnership };
              }
              if (entity === BoardMember) {
                return { createQueryBuilder: () => deleteQuery };
              }
              throw new Error('Unexpected repository');
            }),
          }),
        ),
      },
    });

    await service.removeMember(
      workspace.id,
      'membership-2',
      workspace.ownerId,
    );

    expect(transferBoardOwnership).toHaveBeenCalledWith(
      {
        workspaceId: workspace.id,
        ownerId: 'user-2',
      },
      {
        ownerId: workspace.ownerId,
      },
    );
    expect(deleteQuery.execute).toHaveBeenCalled();
    expect(removeMembership).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'membership-2' }),
    );
  });

  it('allows an admin to remove only ordinary members', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!
      .mockResolvedValueOnce({
        workspaceId: workspace.id,
        userId: 'admin-1',
        role: WorkspaceRole.ADMIN,
      } as WorkspaceMember)
      .mockResolvedValueOnce({
        id: 'membership-2',
        workspaceId: workspace.id,
        userId: 'admin-2',
        role: WorkspaceRole.ADMIN,
      } as WorkspaceMember);

    await expect(
      service.removeMember(workspace.id, 'membership-2', 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never removes the workspace owner', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!
      .mockResolvedValueOnce({
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember)
      .mockResolvedValueOnce({
        id: 'owner-membership',
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember);

    await expect(
      service.removeMember(
        workspace.id,
        'owner-membership',
        workspace.ownerId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows only the owner to delete a workspace and switches active workspace to a fallback', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!.mockResolvedValue({
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      role: WorkspaceRole.OWNER,
    } as WorkspaceMember);
    memberRepo.find!.mockResolvedValue([
      {
        workspaceId: workspace.id,
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember,
      {
        workspaceId: 'workspace-2',
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
      } as WorkspaceMember,
    ]);
    userRepo.findOne!.mockResolvedValue({
      id: workspace.ownerId,
      activeWorkspaceId: workspace.id,
    } as User);

    const deleteWorkspace = jest.fn();
    const updateUser = jest.fn();
    Object.defineProperty(workspaceRepo, 'manager', {
      value: {
        transaction: jest.fn(async (callback) =>
          callback({
            getRepository: jest.fn((entity) => {
              if (entity === Workspace) {
                return { delete: deleteWorkspace };
              }
              if (entity === User) {
                return { update: updateUser };
              }
              throw new Error('Unexpected repository');
            }),
          }),
        ),
      },
    });

    await service.remove(workspace.id, workspace.ownerId);

    expect(deleteWorkspace).toHaveBeenCalledWith(workspace.id);
    expect(updateUser).toHaveBeenCalledWith(workspace.ownerId, {
      activeWorkspaceId: 'workspace-2',
    });
  });

  it('does not allow a non-owner to delete a workspace', async () => {
    workspaceRepo.findOne!.mockResolvedValue(workspace);
    memberRepo.findOne!.mockResolvedValue({
      workspaceId: workspace.id,
      userId: 'admin-1',
      role: WorkspaceRole.ADMIN,
    } as WorkspaceMember);

    await expect(
      service.remove(workspace.id, 'admin-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
