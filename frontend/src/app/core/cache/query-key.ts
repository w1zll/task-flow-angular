export type QueryKey = readonly unknown[];

export const queryKeys = {
  authUser: ['auth', 'user'] as const,
  workspaces: ['workspaces'] as const,
  boardsCatalog: ['boards'] as const,
  boards: (workspaceId: string) => ['workspaces', workspaceId, 'boards'] as const,
  workspaceMembers: (workspaceId: string) => ['workspaces', workspaceId, 'members'] as const,
  workspaceInvites: (workspaceId: string) => ['workspaces', workspaceId, 'invites'] as const,
  boardDetail: (boardId: string) => ['boards', boardId] as const,
  boardMembers: (boardId: string) => ['boards', boardId, 'members'] as const,
};

export const hashQueryKey = (key: QueryKey): string => JSON.stringify(key);

export const queryKeyStartsWith = (key: QueryKey, prefix: QueryKey): boolean => {
  if (prefix.length > key.length) return false;

  return prefix.every((value, index) => Object.is(value, key[index]));
};
