import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BoardPermissionsService } from './board-permissions.service';
import { BoardMember } from './entities/board-member.entity';
import { BoardRole } from './entities/board-role.enum';
import { Board } from './entities/board.entity';

describe('BoardPermissionsService', () => {
  let service: BoardPermissionsService;
  let boardRepo: jest.Mocked<Partial<Repository<Board>>>;
  let memberRepo: jest.Mocked<Partial<Repository<BoardMember>>>;

  beforeEach(() => {
    boardRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-1',
      } as Board),
    };
    memberRepo = {
      findOne: jest.fn(),
    };
    service = new BoardPermissionsService(
      boardRepo as Repository<Board>,
      memberRepo as Repository<BoardMember>,
    );
  });

  it('grants every capability to the owner', async () => {
    const access = await service.getAccess('board-1', 'owner-1');

    expect(access.role).toBe(BoardRole.OWNER);
    expect(Object.values(access.capabilities).every(Boolean)).toBe(true);
    expect(memberRepo.findOne).not.toHaveBeenCalled();
  });

  it('allows an editor to change content and columns but not members or board deletion', async () => {
    memberRepo.findOne!.mockResolvedValue({
      id: 'member-1',
      role: BoardRole.EDITOR,
    } as BoardMember);

    const access = await service.getAccess('board-1', 'editor-1');

    expect(access.capabilities).toMatchObject({
      canReadBoard: true,
      canEditBoardContent: true,
      canManageColumns: true,
      canManageBoardMembers: false,
      canDeleteBoard: false,
    });
    await expect(
      service.assertCanManageBoardMembers('board-1', 'editor-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a viewer to read but rejects every board write capability', async () => {
    memberRepo.findOne!.mockResolvedValue({
      id: 'member-1',
      role: BoardRole.VIEWER,
    } as BoardMember);

    await expect(
      service.assertCanRead('board-1', 'viewer-1'),
    ).resolves.toMatchObject({ role: BoardRole.VIEWER });
    await expect(
      service.assertCanEditBoardContent('board-1', 'viewer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assertCanManageColumns('board-1', 'viewer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assertCanDeleteBoard('board-1', 'viewer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a non-member', async () => {
    memberRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.assertCanRead('board-1', 'stranger-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for a missing board', async () => {
    boardRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.getAccess('missing-board', 'owner-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
