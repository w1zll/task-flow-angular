export const queryKeys = {
  boards: ['boards'] as const,
  board: (id: string) => ['boards', id] as const,
  boardMembers: (id: string) => ['boards', id, 'members'] as const,
  boardActivities: (id: string) => ['boards', id, 'activities'] as const,
  boardViews: (id: string) => ['boards', id, 'views'] as const,
  tasks: (columnId: string) => ['tasks', columnId] as const,
  taskComments: (taskId: string) => ['tasks', taskId, 'comments'] as const,
  boardAnalytics: (id?: string) => ['boards', id, 'analytics'] as const,
  workspaceAnalytics: (
    workspaceId: string,
    filters?: {
      boardId?: string | null;
      teamId?: string | null;
      assigneeId?: string | null;
      fromDate?: string | null;
      toDate?: string | null;
    },
  ) =>
    [
      'workspaces',
      workspaceId,
      'analytics',
      {
        boardId: filters?.boardId ?? null,
        teamId: filters?.teamId ?? null,
        assigneeId: filters?.assigneeId ?? null,
        fromDate: filters?.fromDate ?? null,
        toDate: filters?.toDate ?? null,
      },
    ] as const,
  notifications: (unreadOnly = false) =>
    ['notifications', { unreadOnly }] as const,
  notificationUnreadCount: ['notifications', 'unread-count'] as const,
  workspaces: ['workspaces'] as const,
  workspaceMembers: (id: string) => ['workspaces', id, 'members'] as const,
  workspaceInvites: (id: string) => ['workspaces', id, 'invites'] as const,
  workspaceInvitePreview: (token: string) =>
    ['workspace-invites', token, 'preview'] as const,
  workspaceTeams: (id: string) => ['workspaces', id, 'teams'] as const,
  workspaceWhiteboards: (id: string, boardId?: string) =>
    ['workspaces', id, 'whiteboards', { boardId: boardId ?? null }] as const,
  whiteboard: (workspaceId: string, whiteboardId: string) =>
    ['workspaces', workspaceId, 'whiteboards', whiteboardId] as const,
  whiteboardState: (workspaceId: string, whiteboardId: string) =>
    ['workspaces', workspaceId, 'whiteboards', whiteboardId, 'state'] as const,
  myWorkspaceTeams: (id: string) =>
    ['workspaces', id, 'teams', 'mine'] as const,
  teamTasks: (workspaceId: string, teamId: string) =>
    ['workspaces', workspaceId, 'teams', teamId, 'tasks'] as const,
};
