import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import {
  BoardAccess,
  BoardPermissionsService,
} from '@/boards/board-permissions.service';
import { Board } from '@/boards/entities/board.entity';
import { BoardRole } from '@/boards/entities/board-role.enum';
import { WorkspaceRole } from '@/workspaces/entities/workspace-role.enum';
import { WorkspacesService, WorkspaceAccess } from '@/workspaces/workspaces.service';
import {
  CreateWhiteboardDto,
  CreateWhiteboardOperationDto,
  UpdateWhiteboardDto,
} from './dto/whiteboard.dto';
import { WhiteboardOperationType } from './entities/whiteboard-operation-type.enum';
import { WhiteboardOperation } from './entities/whiteboard-operation.entity';
import { WhiteboardSnapshot } from './entities/whiteboard-snapshot.entity';
import { Whiteboard } from './entities/whiteboard.entity';

export interface WhiteboardCapabilities {
  canReadWhiteboard: boolean;
  canDrawWhiteboard: boolean;
  canManageWhiteboard: boolean;
}

export interface WhiteboardAccess {
  role: string;
  capabilities: WhiteboardCapabilities;
}

export interface WhiteboardState {
  whiteboard: Whiteboard;
  snapshot: WhiteboardSnapshot | null;
  operations: WhiteboardOperation[];
  latestSequence: number;
}

const SNAPSHOT_INTERVAL = 200;

@Injectable()
export class WhiteboardsService {
  private readonly logger = new Logger(WhiteboardsService.name);

  constructor(
    @InjectRepository(Whiteboard)
    private readonly whiteboardRepo: Repository<Whiteboard>,
    @InjectRepository(WhiteboardOperation)
    private readonly operationRepo: Repository<WhiteboardOperation>,
    @InjectRepository(WhiteboardSnapshot)
    private readonly snapshotRepo: Repository<WhiteboardSnapshot>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    private readonly dataSource: DataSource,
    private readonly workspacesService: WorkspacesService,
    private readonly boardPermissions: BoardPermissionsService,
  ) {}

  async list(
    workspaceId: string,
    userId: string,
    boardId?: string,
  ): Promise<Whiteboard[]> {
    await this.workspacesService.assertMember(workspaceId, userId);
    if (boardId) {
      await this.assertBoardInWorkspaceAndReadable(workspaceId, boardId, userId);
    }

    const whiteboards = await this.whiteboardRepo.find({
      where: {
        workspaceId,
        ...(boardId ? { boardId } : {}),
      },
      order: { updatedAt: 'DESC' },
    });

    const accessible: Whiteboard[] = [];
    for (const whiteboard of whiteboards) {
      try {
        const access = await this.getAccess(whiteboard, userId);
        accessible.push(this.attachAccess(whiteboard, access));
      } catch {
        // Do not leak linked board whiteboards that the user cannot read.
      }
    }

    return accessible;
  }

  async create(
    workspaceId: string,
    dto: CreateWhiteboardDto,
    userId: string,
  ): Promise<Whiteboard> {
    const workspaceAccess = await this.workspacesService.assertMember(
      workspaceId,
      userId,
    );
    const boardId = dto.boardId ?? null;

    if (boardId) {
      await this.assertBoardInWorkspaceAndDrawable(workspaceId, boardId, userId);
    } else {
      this.assertWorkspaceManager(workspaceAccess);
    }

    const title = dto.title.trim();
    if (!title) throw new BadRequestException('Whiteboard title is required');

    const whiteboard = await this.whiteboardRepo.save(
      this.whiteboardRepo.create({
        title,
        description: dto.description?.trim() || null,
        color: dto.color ?? '#3b82f6',
        icon: dto.icon?.trim() || 'draw',
        workspaceId,
        boardId,
        createdById: userId,
      }),
    );

    return this.attachAccess(
      whiteboard,
      await this.getAccess(whiteboard, userId),
    );
  }

  async findOne(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
  ): Promise<Whiteboard> {
    const whiteboard = await this.getWhiteboardInWorkspace(
      workspaceId,
      whiteboardId,
    );
    return this.attachAccess(
      whiteboard,
      await this.assertCanRead(whiteboard, userId),
    );
  }

  async getState(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
    afterSequence?: number,
  ): Promise<WhiteboardState> {
    const whiteboard = await this.findOne(workspaceId, whiteboardId, userId);
    const latestSnapshot = afterSequence
      ? null
      : await this.snapshotRepo.findOne({
          where: { whiteboardId },
          order: { sequence: 'DESC' },
        });
    const sequenceFloor = afterSequence ?? latestSnapshot?.sequence ?? 0;
    const operations = await this.operationRepo.find({
      where: {
        whiteboardId,
        sequence: MoreThan(sequenceFloor),
      },
      order: { sequence: 'ASC' },
    });

    return {
      whiteboard,
      snapshot: latestSnapshot,
      operations,
      latestSequence: whiteboard.lastSequence,
    };
  }

  async update(
    workspaceId: string,
    whiteboardId: string,
    dto: UpdateWhiteboardDto,
    userId: string,
  ): Promise<Whiteboard> {
    const whiteboard = await this.getWhiteboardInWorkspace(
      workspaceId,
      whiteboardId,
    );
    await this.assertCanManage(whiteboard, userId);

    if (dto.boardId !== undefined) {
      const nextBoardId = dto.boardId || null;
      if (nextBoardId) {
        await this.assertBoardInWorkspaceAndReadable(
          workspaceId,
          nextBoardId,
          userId,
        );
      }
      whiteboard.boardId = nextBoardId;
    }
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Whiteboard title is required');
      whiteboard.title = title;
    }
    if (dto.description !== undefined) {
      whiteboard.description = dto.description?.trim() || null;
    }
    if (dto.color !== undefined) whiteboard.color = dto.color;
    if (dto.icon !== undefined) whiteboard.icon = dto.icon.trim() || 'draw';

    const saved = await this.whiteboardRepo.save(whiteboard);
    return this.attachAccess(saved, await this.getAccess(saved, userId));
  }

  async remove(
    workspaceId: string,
    whiteboardId: string,
    userId: string,
  ): Promise<void> {
    const whiteboard = await this.getWhiteboardInWorkspace(
      workspaceId,
      whiteboardId,
    );
    await this.assertCanManage(whiteboard, userId);
    await this.whiteboardRepo.remove(whiteboard);
  }

  async appendOperation(
    whiteboardId: string,
    dto: CreateWhiteboardOperationDto,
    userId: string,
    requiredCapability: 'draw' | 'manage' = 'draw',
  ): Promise<WhiteboardOperation> {
    const idempotencyKey = this.normalizeIdempotencyKey(dto.idempotencyKey);
    const operation = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Whiteboard);
      const whiteboard = await repo.findOne({
        where: { id: whiteboardId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!whiteboard) throw new NotFoundException('Whiteboard not found');

      if (requiredCapability === 'manage') {
        await this.assertCanManage(whiteboard, userId);
      } else {
        await this.assertCanDraw(whiteboard, userId);
      }

      const operationRepo = manager.getRepository(WhiteboardOperation);
      const existing = await operationRepo.findOne({
        where: { whiteboardId, userId, idempotencyKey },
      });
      if (existing) return existing;

      const nextSequence = whiteboard.lastSequence + 1;
      whiteboard.lastSequence = nextSequence;
      await repo.save(whiteboard);

      return operationRepo.save(
        operationRepo.create({
          whiteboardId,
          sequence: nextSequence,
          userId,
          idempotencyKey,
          type: dto.type,
          data: dto.data,
        }),
      );
    });

    if (operation.sequence % SNAPSHOT_INTERVAL === 0) {
      void this.createSnapshot(
        operation.whiteboardId,
        operation.sequence,
        userId,
      ).catch((error: unknown) => {
        this.logger.error(
          `Failed to create whiteboard snapshot ${operation.whiteboardId}:${operation.sequence}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    }

    return operation;
  }

  async clear(
    whiteboardId: string,
    idempotencyKey: string,
    userId: string,
  ): Promise<WhiteboardOperation> {
    const whiteboard = await this.whiteboardRepo.findOne({
      where: { id: whiteboardId },
    });
    if (!whiteboard) throw new NotFoundException('Whiteboard not found');
    await this.assertCanManage(whiteboard, userId);

    return this.appendOperation(
      whiteboardId,
      {
        idempotencyKey,
        type: WhiteboardOperationType.CLEAR,
        data: {},
      },
      userId,
      'manage',
    );
  }

  async assertCanReadById(
    whiteboardId: string,
    userId: string,
  ): Promise<Whiteboard> {
    const whiteboard = await this.whiteboardRepo.findOne({
      where: { id: whiteboardId },
    });
    if (!whiteboard) throw new NotFoundException('Whiteboard not found');
    await this.assertCanRead(whiteboard, userId);
    return whiteboard;
  }

  private async createSnapshot(
    whiteboardId: string,
    sequence: number,
    userId: string,
  ) {
    const existing = await this.snapshotRepo.findOne({
      where: { whiteboardId, sequence },
    });
    if (existing) return existing;

    const operations = await this.operationRepo.find({
      where: { whiteboardId },
      order: { sequence: 'ASC' },
    });

    return this.snapshotRepo.save(
      this.snapshotRepo.create({
        whiteboardId,
        sequence,
        createdById: userId,
        data: {
          operations: operations.map((operation) => ({
            id: operation.id,
            whiteboardId: operation.whiteboardId,
            sequence: operation.sequence,
            userId: operation.userId,
            idempotencyKey: operation.idempotencyKey,
            type: operation.type,
            data: operation.data,
            createdAt: operation.createdAt,
          })),
        },
      }),
    );
  }

  private async getWhiteboardInWorkspace(
    workspaceId: string,
    whiteboardId: string,
  ): Promise<Whiteboard> {
    const whiteboard = await this.whiteboardRepo.findOne({
      where: { id: whiteboardId, workspaceId },
    });
    if (!whiteboard) throw new NotFoundException('Whiteboard not found');
    return whiteboard;
  }

  private async getAccess(
    whiteboard: Whiteboard,
    userId: string,
  ): Promise<WhiteboardAccess> {
    const workspaceAccess = await this.workspacesService.assertMember(
      whiteboard.workspaceId,
      userId,
    );

    if (whiteboard.boardId) {
      const boardAccess = await this.boardPermissions.getAccess(
        whiteboard.boardId,
        userId,
      );
      return this.getLinkedBoardAccess(workspaceAccess, boardAccess);
    }

    return {
      role: workspaceAccess.role,
      capabilities: {
        canReadWhiteboard: true,
        canDrawWhiteboard: true,
        canManageWhiteboard: this.isWorkspaceManager(workspaceAccess.role),
      },
    };
  }

  private getLinkedBoardAccess(
    workspaceAccess: WorkspaceAccess,
    boardAccess: BoardAccess,
  ): WhiteboardAccess {
    return {
      role: boardAccess.role,
      capabilities: {
        canReadWhiteboard: true,
        canDrawWhiteboard: boardAccess.capabilities.canUseWhiteboard,
        canManageWhiteboard:
          this.isWorkspaceManager(workspaceAccess.role) ||
          boardAccess.role === BoardRole.OWNER,
      },
    };
  }

  private async assertCanRead(
    whiteboard: Whiteboard,
    userId: string,
  ): Promise<WhiteboardAccess> {
    return this.getAccess(whiteboard, userId);
  }

  private async assertCanDraw(
    whiteboard: Whiteboard,
    userId: string,
  ): Promise<WhiteboardAccess> {
    const access = await this.getAccess(whiteboard, userId);
    if (!access.capabilities.canDrawWhiteboard) {
      throw new ForbiddenException(
        'You do not have permission to draw on this whiteboard',
      );
    }
    return access;
  }

  private async assertCanManage(
    whiteboard: Whiteboard,
    userId: string,
  ): Promise<WhiteboardAccess> {
    const access = await this.getAccess(whiteboard, userId);
    if (!access.capabilities.canManageWhiteboard) {
      throw new ForbiddenException(
        'You do not have permission to manage this whiteboard',
      );
    }
    return access;
  }

  private assertWorkspaceManager(access: WorkspaceAccess) {
    if (!this.isWorkspaceManager(access.role)) {
      throw new ForbiddenException(
        'Only workspace owners and admins can create workspace whiteboards',
      );
    }
  }

  private isWorkspaceManager(role: WorkspaceRole) {
    return role === WorkspaceRole.OWNER || role === WorkspaceRole.ADMIN;
  }

  private async assertBoardInWorkspaceAndReadable(
    workspaceId: string,
    boardId: string,
    userId: string,
  ) {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      select: { id: true, workspaceId: true },
    });
    if (!board || board.workspaceId !== workspaceId) {
      throw new NotFoundException('Board not found in this workspace');
    }
    await this.boardPermissions.assertCanRead(boardId, userId);
  }

  private async assertBoardInWorkspaceAndDrawable(
    workspaceId: string,
    boardId: string,
    userId: string,
  ) {
    await this.assertBoardInWorkspaceAndReadable(workspaceId, boardId, userId);
    await this.boardPermissions.assertCanUseWhiteboard(boardId, userId);
  }

  private attachAccess(
    whiteboard: Whiteboard,
    access: WhiteboardAccess,
  ): Whiteboard {
    return Object.assign(whiteboard, {
      currentUserRole: access.role,
      capabilities: access.capabilities,
    });
  }

  private normalizeIdempotencyKey(value: string) {
    const normalized = value.trim().slice(0, 128);
    if (!normalized) {
      throw new BadRequestException('Operation idempotency key is required');
    }
    return normalized;
  }
}
