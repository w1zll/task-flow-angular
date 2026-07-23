import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLocale } from '@/common/locale/request-locale';
import { User } from '@/users/entities/user.entity';
import { toPublicUser } from '@/users/public-user';
import { CreateWorkspaceDto } from './dto/workspace.dto';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceRole } from './entities/workspace-role.enum';
import { Workspace } from './entities/workspace.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Board } from '@/boards/entities/board.entity';

export interface WorkspaceAccess {
  workspace: Workspace;
  role: WorkspaceRole;
}

export type WorkspaceWithAccess = Workspace & {
  currentUserRole: WorkspaceRole;
  isActive: boolean;
};

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly memberRepo: Repository<WorkspaceMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createPersonalWorkspace(
    user: User,
    locale: AppLocale = 'en',
  ): Promise<Workspace> {
    const workspace = await this.createOwnedWorkspace(
      this.getPersonalWorkspaceName(user.name, locale),
      user.id,
      true,
    );
    await this.userRepo.update(user.id, {
      activeWorkspaceId: workspace.id,
    });
    user.activeWorkspaceId = workspace.id;
    return workspace;
  }

  async create(
    dto: CreateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceWithAccess> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Workspace name is required');
    }
    const workspace = await this.createOwnedWorkspace(
      name,
      userId,
      false,
    );
    await this.userRepo.update(userId, {
      activeWorkspaceId: workspace.id,
    });
    return this.attachAccess(
      workspace,
      WorkspaceRole.OWNER,
      workspace.id,
    );
  }

  async findAll(userId: string): Promise<WorkspaceWithAccess[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, activeWorkspaceId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
      order: { createdAt: 'ASC' },
    });
    let activeWorkspaceId = user.activeWorkspaceId;
    if (
      memberships.length > 0 &&
      !memberships.some(
        (membership) => membership.workspaceId === activeWorkspaceId,
      )
    ) {
      activeWorkspaceId = memberships[0].workspaceId;
      await this.userRepo.update(userId, { activeWorkspaceId });
    }

    return memberships.map((membership) =>
      this.attachAccess(
        membership.workspace,
        membership.role,
        activeWorkspaceId,
      ),
    );
  }

  async getActiveWorkspace(userId: string): Promise<WorkspaceAccess> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, activeWorkspaceId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.activeWorkspaceId) {
      const activeMembership = await this.memberRepo.findOne({
        where: {
          workspaceId: user.activeWorkspaceId,
          userId,
        },
        relations: ['workspace'],
      });
      if (activeMembership) {
        return {
          workspace: activeMembership.workspace,
          role: activeMembership.role,
        };
      }
    }

    const fallback = await this.memberRepo.findOne({
      where: { userId },
      relations: ['workspace'],
      order: { createdAt: 'ASC' },
    });
    if (!fallback) {
      throw new NotFoundException('Workspace membership not found');
    }

    await this.userRepo.update(userId, {
      activeWorkspaceId: fallback.workspaceId,
    });
    return {
      workspace: fallback.workspace,
      role: fallback.role,
    };
  }

  async switchActive(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceWithAccess> {
    const access = await this.assertMember(workspaceId, userId);
    await this.userRepo.update(userId, { activeWorkspaceId: workspaceId });
    return this.attachAccess(access.workspace, access.role, workspaceId);
  }

  async assertMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceAccess> {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this workspace',
      );
    }

    return { workspace, role: membership.role };
  }

  async listMembers(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember[]> {
    await this.assertMember(workspaceId, userId);
    const members = await this.memberRepo.find({
      where: { workspaceId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return members.map((member) => ({
      ...member,
      user: toPublicUser(member.user),
    })) as WorkspaceMember[];
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: WorkspaceRole.ADMIN | WorkspaceRole.MEMBER,
    userId: string,
  ): Promise<WorkspaceMember> {
    const access = await this.assertMember(workspaceId, userId);
    if (access.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Only the workspace owner can change member roles',
      );
    }

    const member = await this.memberRepo.findOne({
      where: { id: memberId, workspaceId },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException('Workspace member not found');
    if (
      member.role === WorkspaceRole.OWNER ||
      member.userId === access.workspace.ownerId
    ) {
      throw new ForbiddenException('The workspace owner role cannot change');
    }

    member.role = role;
    const saved = await this.memberRepo.save(member);
    saved.user = toPublicUser(member.user) as User;
    return saved;
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    const access = await this.assertMember(workspaceId, userId);
    if (
      access.role !== WorkspaceRole.OWNER &&
      access.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can remove members',
      );
    }

    const member = await this.memberRepo.findOne({
      where: { id: memberId, workspaceId },
    });
    if (!member) throw new NotFoundException('Workspace member not found');
    if (
      member.role === WorkspaceRole.OWNER ||
      member.userId === access.workspace.ownerId
    ) {
      throw new ForbiddenException('The workspace owner cannot be removed');
    }
    if (member.userId === userId) {
      throw new ForbiddenException(
        'Use a dedicated leave workspace action to remove yourself',
      );
    }
    if (
      access.role === WorkspaceRole.ADMIN &&
      member.role !== WorkspaceRole.MEMBER
    ) {
      throw new ForbiddenException('Admins can remove only workspace members');
    }

    await this.memberRepo.manager.transaction(async (manager) => {
      await manager.getRepository(Board).update(
        {
          workspaceId,
          ownerId: member.userId,
        },
        {
          ownerId: access.workspace.ownerId,
        },
      );
      await manager
        .getRepository(BoardMember)
        .createQueryBuilder()
        .delete()
        .where('"userId" = :targetUserId', {
          targetUserId: member.userId,
        })
        .andWhere(
          '"boardId" IN (SELECT "id" FROM "boards" WHERE "workspaceId" = :workspaceId)',
          { workspaceId },
        )
        .execute();
      await manager.getRepository(WorkspaceMember).remove(member);
    });
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    const access = await this.assertMember(workspaceId, userId);
    if (
      access.role !== WorkspaceRole.OWNER ||
      access.workspace.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'Only the workspace owner can delete this workspace',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, activeWorkspaceId: true },
    });
    const fallbackMembership = (
      await this.memberRepo.find({
        where: { userId },
        order: { createdAt: 'ASC' },
      })
    ).find((membership) => membership.workspaceId !== workspaceId);

    await this.workspaceRepo.manager.transaction(async (manager) => {
      await manager.getRepository(Workspace).delete(workspaceId);
      await manager.getRepository(User).update(userId, {
        activeWorkspaceId:
          user?.activeWorkspaceId === workspaceId
            ? (fallbackMembership?.workspaceId ?? null)
            : (user?.activeWorkspaceId ?? null),
      });
    });
  }

  private async createOwnedWorkspace(
    name: string,
    ownerId: string,
    isPersonal: boolean,
  ): Promise<Workspace> {
    const workspace = await this.workspaceRepo.save(
      this.workspaceRepo.create({
        name,
        ownerId,
        isPersonal,
      }),
    );

    try {
      await this.memberRepo.save(
        this.memberRepo.create({
          workspaceId: workspace.id,
          userId: ownerId,
          role: WorkspaceRole.OWNER,
        }),
      );
    } catch (error) {
      await this.workspaceRepo.remove(workspace);
      throw error;
    }

    return workspace;
  }

  private attachAccess(
    workspace: Workspace,
    role: WorkspaceRole,
    activeWorkspaceId: string | null,
  ): WorkspaceWithAccess {
    return Object.assign(workspace, {
      currentUserRole: role,
      isActive: workspace.id === activeWorkspaceId,
    });
  }

  private getPersonalWorkspaceName(
    userName: string,
    locale: AppLocale,
  ): string {
    const name = userName.trim();
    return locale === 'ru'
      ? `Пространство ${name}`.slice(0, 120)
      : `${name}'s Workspace`.slice(0, 120);
  }
}
