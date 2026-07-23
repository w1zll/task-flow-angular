import { BoardMember, WorkspaceMember } from '@/shared/api/api';

export const getAvailableWorkspaceMembers = (
  workspaceMembers: WorkspaceMember[] | undefined,
  boardMembers: BoardMember[] | undefined,
): WorkspaceMember[] => {
  const boardMemberUserIds = new Set(
    boardMembers?.map((member) => member.userId) ?? [],
  );

  return (
    workspaceMembers?.filter(
      (member) => !boardMemberUserIds.has(member.userId),
    ) ?? []
  );
};
