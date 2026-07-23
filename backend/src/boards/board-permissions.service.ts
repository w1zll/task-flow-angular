import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { BoardRole } from './entities/board-role.enum';

export interface BoardCapabilities {
  canReadBoard: boolean;
  canEditBoardContent: boolean;
  canManageBoardMembers: boolean;
  canDeleteBoard: boolean;
  canManageColumns: boolean;
  canUseWhiteboard: boolean;
  canManageBoardSettings: boolean;
}

export interface BoardAccess {
  role: BoardRole;
  capabilities: BoardCapabilities;
}

type BoardCapability = keyof BoardCapabilities;

const CAPABILITIES_BY_ROLE: Record<BoardRole, BoardCapabilities> = {
  [BoardRole.OWNER]: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: true,
    canDeleteBoard: true,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: true,
  },
  [BoardRole.EDITOR]: {
    canReadBoard: true,
    canEditBoardContent: true,
    canManageBoardMembers: false,
    canDeleteBoard: false,
    canManageColumns: true,
    canUseWhiteboard: true,
    canManageBoardSettings: false,
  },
  [BoardRole.VIEWER]: {
    canReadBoard: true,
    canEditBoardContent: false,
    canManageBoardMembers: false,
    canDeleteBoard: false,
    canManageColumns: false,
    canUseWhiteboard: false,
    canManageBoardSettings: false,
  },
};

@Injectable()
export class BoardPermissionsService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly memberRepo: Repository<BoardMember>,
  ) {}

  getCapabilities(role: BoardRole): BoardCapabilities {
    return { ...CAPABILITIES_BY_ROLE[role] };
  }

  async getAccess(boardId: string, userId: string): Promise<BoardAccess> {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.ownerId === userId) {
      return {
        role: BoardRole.OWNER,
        capabilities: this.getCapabilities(BoardRole.OWNER),
      };
    }

    const member = await this.memberRepo.findOne({
      where: { boardId, userId },
      select: { id: true, role: true },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this board');
    }

    return {
      role: member.role,
      capabilities: this.getCapabilities(member.role),
    };
  }

  assertCanRead(boardId: string, userId: string): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canReadBoard',
      'You do not have access to this board',
    );
  }

  assertCanEditBoardContent(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canEditBoardContent',
      'You do not have permission to edit this board',
    );
  }

  assertCanManageBoardMembers(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canManageBoardMembers',
      'Only the board owner can manage members',
    );
  }

  assertCanDeleteBoard(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canDeleteBoard',
      'Only the board owner can delete the board',
    );
  }

  assertCanManageColumns(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canManageColumns',
      'You do not have permission to manage columns',
    );
  }

  assertCanUseWhiteboard(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canUseWhiteboard',
      'You do not have permission to edit the whiteboard',
    );
  }

  assertCanManageBoardSettings(
    boardId: string,
    userId: string,
  ): Promise<BoardAccess> {
    return this.assertCapability(
      boardId,
      userId,
      'canManageBoardSettings',
      'Only the board owner can change board settings',
    );
  }

  private async assertCapability(
    boardId: string,
    userId: string,
    capability: BoardCapability,
    message: string,
  ): Promise<BoardAccess> {
    const access = await this.getAccess(boardId, userId);
    if (!access.capabilities[capability]) {
      throw new ForbiddenException(message);
    }
    return access;
  }
}
