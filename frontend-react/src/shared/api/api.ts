import apiClient from './client';
import { ApiBody, ApiResponse } from './types';
import type { components } from './api.types';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { withBrowserApiBaseUrl } from './base-url';

export type AuthResponse = ApiResponse<'/api/auth/register', 'post'>;
export type AuthUser = ApiResponse<'/api/auth/me', 'get'>;
export type WsTokenResponse = { token: string };
export type OAuthProvider = 'google' | 'github';
export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
}
export interface AuthMethodsResponse {
  local: boolean;
  providers: Array<{
    provider: OAuthProvider;
    available: boolean;
    connected: boolean;
  }>;
}
export interface DemoWorkspaceSession {
  user: AuthUser;
  workspaceId: string;
  boardId: string;
}
type GeneratedBoard = ApiResponse<'/api/boards/{id}', 'get'>;
export type Task = Omit<ApiResponse<'/api/tasks/{id}', 'put'>, 'dueDate'> & {
  dueDate?: string | null;
};
export type BoardColumn = Omit<
  NonNullable<GeneratedBoard['columns']>[number],
  'tasks' | 'createdAt' | 'updatedAt'
> & {
  tasks?: Task[];
};
export type Board = Omit<GeneratedBoard, 'columns'> & {
  columns?: BoardColumn[];
};
export type BoardRole = Board['currentUserRole'];
export type BoardMember =
  ApiResponse<'/api/boards/{id}/members', 'get'>[number];
type GeneratedBoardActivity =
  ApiResponse<'/api/boards/{id}/activities', 'get'>[number];
export type BoardActivity = Omit<GeneratedBoardActivity, 'metadata'> & {
  metadata?: Record<string, unknown> | null;
};
export type BoardActivityEventType = BoardActivity['event'];

export interface BoardView {
  id: string;
  title: string;
  boardId: string;
  ownerId: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
export type BoardViewPayload = Pick<
  BoardView,
  'title' | 'filters' | 'sort'
> &
  Partial<Pick<BoardView, 'isDefault'>>;
export type Workspace = ApiResponse<'/api/workspaces', 'get'>[number] & {
  isDemoTemplate?: boolean;
  isDemoInstance?: boolean;
  demoExpiresAt?: string | null;
  demoSourceWorkspaceId?: string | null;
};
export type WorkspaceMember =
  ApiResponse<'/api/workspaces/{id}/members', 'get'>[number];
export type WorkspaceInvite =
  ApiResponse<'/api/workspaces/{workspaceId}/invites', 'get'>[number];
export type CreatedWorkspaceInvite =
  ApiResponse<'/api/workspaces/{workspaceId}/invites', 'post'>;
export type WorkspaceInvitePreview =
  ApiResponse<'/api/workspace-invites/{token}', 'get'>;
export type WorkspaceAnalyticsDashboard =
  ApiResponse<'/api/workspaces/{workspaceId}/analytics/dashboard', 'get'>;
export interface WorkspaceAnalyticsFilters {
  boardId?: string | null;
  teamId?: string | null;
  assigneeId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}
export type Team =
  ApiResponse<'/api/workspaces/{workspaceId}/teams', 'get'>[number];
export type TeamMember =
  ApiResponse<
    '/api/workspaces/{workspaceId}/teams/{teamId}/members',
    'post'
  >;
export type WhiteboardOperationType =
  | 'stroke'
  | 'shape'
  | 'text'
  | 'move'
  | 'undo'
  | 'redo'
  | 'clear';
export interface WhiteboardCapabilities {
  canReadWhiteboard: boolean;
  canDrawWhiteboard: boolean;
  canManageWhiteboard: boolean;
}
export interface Whiteboard {
  id: string;
  title: string;
  description: string | null;
  color: string;
  icon: string;
  workspaceId: string;
  boardId: string | null;
  createdById: string | null;
  lastSequence: number;
  currentUserRole: string;
  capabilities: WhiteboardCapabilities;
  createdAt: string;
  updatedAt: string;
}
export interface WhiteboardOperation {
  id: string;
  whiteboardId: string;
  sequence: number;
  userId: string;
  idempotencyKey: string;
  type: WhiteboardOperationType;
  data: Record<string, unknown>;
  createdAt: string;
}
export interface WhiteboardSnapshot {
  id: string;
  whiteboardId: string;
  sequence: number;
  data: {
    operations?: WhiteboardOperation[];
    [key: string]: unknown;
  };
  createdAt: string;
}
export interface WhiteboardState {
  whiteboard: Whiteboard;
  snapshot: WhiteboardSnapshot | null;
  operations: WhiteboardOperation[];
  latestSequence: number;
}
export interface WhiteboardPayload {
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  boardId?: string | null;
}
export interface WhiteboardOperationPayload {
  whiteboardId: string;
  idempotencyKey: string;
  type: WhiteboardOperationType;
  data: Record<string, unknown>;
}
export type TaskChecklistItem =
  components['schemas']['TaskChecklistItemResponseDto'];
export type TaskAttachment =
  components['schemas']['TaskAttachmentResponseDto'];
export type TaskComment =
  ApiResponse<'/api/tasks/{taskId}/comments', 'get'>[number];
export type TaskMention = TaskComment['mentions'][number];
export type AppNotification =
  ApiResponse<'/api/notifications', 'get'>[number] & {
    metadata: Record<string, unknown> | null;
  };
export type NotificationType = AppNotification['type'];

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  avatar?: File;
}

const createAvatarForm = (data: RegisterPayload) => {
  const form = new FormData();
  form.append('email', data.email);
  form.append('name', data.name);
  form.append('password', data.password);
  if (data.avatar) form.append('avatar', data.avatar);
  return form;
};

export const authApi = {
  getProviders: () =>
    apiClient.get<OAuthProvidersResponse>('/api/auth/providers'),

  getMethods: () => apiClient.get<AuthMethodsResponse>('/api/auth/methods'),

  unlinkProvider: (provider: OAuthProvider) =>
    apiClient.delete<void>(`/api/auth/identities/${provider}`),

  oauthStartUrl: (provider: OAuthProvider) =>
    withBrowserApiBaseUrl(`/api/auth/oauth/${provider}/start`),

  oauthLinkUrl: (provider: OAuthProvider) =>
    withBrowserApiBaseUrl(`/api/auth/oauth/${provider}/link`),

  register: async (data: RegisterPayload) =>
    apiClient.post<ApiResponse<'/api/auth/register', 'post'>>(
      '/api/auth/register',
      createAvatarForm(data),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<'/api/auth/login', 'post'>>(
      '/api/auth/login',
      data,
    ),

  logout: () =>
    apiClient.post<ApiResponse<'/api/auth/logout', 'post'>>('/api/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<'/api/auth/refresh', 'post'>>(
      '/api/auth/refresh',
    ),

  me: (config?: AxiosRequestConfig) =>
    apiClient.get<ApiResponse<'/api/auth/me', 'get'>>('/api/auth/me', config),

  wsToken: () => apiClient.get<WsTokenResponse>('/api/auth/ws-token'),

  getSessions: () =>
    apiClient.get<ApiResponse<'/api/auth/sessions', 'get'>>(
      '/api/auth/sessions',
    ),

  revokeOtherSessions: () =>
    apiClient.delete<ApiResponse<'/api/auth/sessions', 'delete'>>(
      '/api/auth/sessions',
    ),

  revokeSession: (id: string) =>
    apiClient.delete<ApiResponse<'/api/auth/sessions/{id}', 'delete'>>(
      `/api/auth/sessions/${id}`,
    ),

  updateAvatar: (avatar: File) => {
    const form = new FormData();
    form.append('avatar', avatar);
    return apiClient.put<ApiResponse<'/api/auth/avatar', 'put'>>(
      '/api/auth/avatar',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  resetAvatar: () =>
    apiClient.delete<ApiResponse<'/api/auth/avatar', 'delete'>>(
      '/api/auth/avatar',
    ),

  demoLogin: () =>
    apiClient.post<DemoWorkspaceSession>('/api/auth/demo-login'),
};

export const boardsApi = {
  getAll: () => apiClient.get<ApiResponse<'/api/boards', 'get'>>('/api/boards'),

  getOne: (id: string) =>
    apiClient.get<ApiResponse<'/api/boards/{id}', 'get'>>(`/api/boards/${id}`),

  create: (data: ApiBody<'/api/boards', 'post'>) =>
    apiClient.post<ApiResponse<'/api/boards', 'post'>>('/api/boards', data),

  update: (id: string, data: Partial<Board>) =>
    apiClient.put<ApiResponse<'/api/boards/{id}', 'put'>>(
      `/api/boards/${id}`,
      data,
    ),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<'/api/boards/{id}', 'delete'>>(
      `/api/boards/${id}`,
    ),

  share: (id: string, data: ApiBody<'/api/boards/{id}/share', 'post'>) =>
    apiClient.post<ApiResponse<'/api/boards/{id}/share', 'post'>>(
      `/api/boards/${id}/share`,
      data,
    ),

  getMembers: (id: string) =>
    apiClient.get<ApiResponse<'/api/boards/{id}/members', 'get'>>(
      `/api/boards/${id}/members`,
    ),

  getActivities: (
    id: string,
    params?: {
      limit?: number;
      before?: string;
      event?: BoardActivityEventType | BoardActivityEventType[];
    },
  ) =>
    apiClient.get<ApiResponse<'/api/boards/{id}/activities', 'get'>>(
      `/api/boards/${id}/activities`,
      {
        params,
      },
    ),

  getViews: (id: string) =>
    apiClient.get<BoardView[]>(`/api/boards/${id}/views`),

  createView: (id: string, data: BoardViewPayload) =>
    apiClient.post<BoardView>(`/api/boards/${id}/views`, data),

  updateView: (
    boardId: string,
    viewId: string,
    data: Partial<BoardViewPayload>,
  ) => apiClient.patch<BoardView>(`/api/boards/${boardId}/views/${viewId}`, data),

  deleteView: (boardId: string, viewId: string) =>
    apiClient.delete(`/api/boards/${boardId}/views/${viewId}`),

  revokeMember: (boardId: string, memberId: string) =>
    apiClient.delete<ApiResponse<'/api/boards/{id}/share/{memberId}', 'delete'>>(
      `/api/boards/${boardId}/share/${memberId}`,
    ),

  updateMemberRole: (
    boardId: string,
    memberId: string,
    role: 'editor' | 'viewer',
  ) =>
    apiClient.patch<
      ApiResponse<'/api/boards/{id}/members/{memberId}/role', 'patch'>
    >(`/api/boards/${boardId}/members/${memberId}/role`, { role }),
};

export const workspacesApi = {
  getAll: () =>
    apiClient.get<Workspace[]>('/api/workspaces'),

  create: (data: ApiBody<'/api/workspaces', 'post'>) =>
    apiClient.post<Workspace>(
      '/api/workspaces',
      data,
    ),

  remove: (id: string) => apiClient.delete<void>(`/api/workspaces/${id}`),

  switchActive: (id: string) =>
    apiClient.put<Workspace>(
      `/api/workspaces/${id}/active`,
    ),

  getMembers: (id: string) =>
    apiClient.get<ApiResponse<'/api/workspaces/{id}/members', 'get'>>(
      `/api/workspaces/${id}/members`,
    ),

  updateMemberRole: (
    workspaceId: string,
    memberId: string,
    role: 'admin' | 'member',
  ) =>
    apiClient.patch<
      ApiResponse<
        '/api/workspaces/{id}/members/{memberId}/role',
        'patch'
      >
    >(`/api/workspaces/${workspaceId}/members/${memberId}/role`, { role }),

  removeMember: (workspaceId: string, memberId: string) =>
    apiClient.delete(`/api/workspaces/${workspaceId}/members/${memberId}`),

  getInvites: (id: string) =>
    apiClient.get<
      ApiResponse<'/api/workspaces/{workspaceId}/invites', 'get'>
    >(`/api/workspaces/${id}/invites`),

  createInvite: (
    id: string,
    data: ApiBody<'/api/workspaces/{workspaceId}/invites', 'post'>,
  ) =>
    apiClient.post<
      ApiResponse<'/api/workspaces/{workspaceId}/invites', 'post'>
    >(`/api/workspaces/${id}/invites`, data),

  revokeInvite: (workspaceId: string, inviteId: string) =>
    apiClient.delete(
      `/api/workspaces/${workspaceId}/invites/${inviteId}`,
    ),
};

export const workspaceAnalyticsApi = {
  dashboard: (
    workspaceId: string,
    params?: WorkspaceAnalyticsFilters,
  ) =>
    apiClient.get<WorkspaceAnalyticsDashboard>(
      `/api/workspaces/${workspaceId}/analytics/dashboard`,
      {
        params,
      },
    ),
};

export const demoApi = {
  resetWorkspace: () =>
    apiClient.post<DemoWorkspaceSession>('/api/demo/workspace/reset'),

  registerFromInvite: (token: string) =>
    apiClient.post<DemoWorkspaceSession>(
      `/api/demo/workspace-invites/${encodeURIComponent(token)}/register`,
    ),
};

export const workspaceInvitesApi = {
  preview: (token: string) =>
    apiClient.get<ApiResponse<'/api/workspace-invites/{token}', 'get'>>(
      `/api/workspace-invites/${encodeURIComponent(token)}`,
    ),

  accept: (token: string) =>
    apiClient.post<
      ApiResponse<'/api/workspace-invites/{token}/accept', 'post'>
    >(`/api/workspace-invites/${encodeURIComponent(token)}/accept`),
};

export const teamsApi = {
  getAll: (workspaceId: string) =>
    apiClient.get<
      ApiResponse<'/api/workspaces/{workspaceId}/teams', 'get'>
    >(`/api/workspaces/${workspaceId}/teams`),

  getMine: (workspaceId: string) =>
    apiClient.get<
      ApiResponse<'/api/workspaces/{workspaceId}/teams/mine', 'get'>
    >(`/api/workspaces/${workspaceId}/teams/mine`),

  create: (
    workspaceId: string,
    data: ApiBody<'/api/workspaces/{workspaceId}/teams', 'post'>,
  ) =>
    apiClient.post<
      ApiResponse<'/api/workspaces/{workspaceId}/teams', 'post'>
    >(`/api/workspaces/${workspaceId}/teams`, data),

  update: (
    workspaceId: string,
    teamId: string,
    data: ApiBody<
      '/api/workspaces/{workspaceId}/teams/{teamId}',
      'patch'
    >,
  ) =>
    apiClient.patch<
      ApiResponse<
        '/api/workspaces/{workspaceId}/teams/{teamId}',
        'patch'
      >
    >(`/api/workspaces/${workspaceId}/teams/${teamId}`, data),

  remove: (workspaceId: string, teamId: string) =>
    apiClient.delete(
      `/api/workspaces/${workspaceId}/teams/${teamId}`,
    ),

  addMember: (workspaceId: string, teamId: string, userId: string) =>
    apiClient.post<
      ApiResponse<
        '/api/workspaces/{workspaceId}/teams/{teamId}/members',
        'post'
      >
    >(`/api/workspaces/${workspaceId}/teams/${teamId}/members`, {
      userId,
    }),

  removeMember: (
    workspaceId: string,
    teamId: string,
    memberId: string,
  ) =>
    apiClient.delete(
      `/api/workspaces/${workspaceId}/teams/${teamId}/members/${memberId}`,
    ),

  getTasks: (workspaceId: string, teamId: string) =>
    apiClient.get<
      ApiResponse<
        '/api/workspaces/{workspaceId}/teams/{teamId}/tasks',
        'get'
      >
    >(`/api/workspaces/${workspaceId}/teams/${teamId}/tasks`),
};

export const whiteboardsApi = {
  getAll: (workspaceId: string, params?: { boardId?: string }) =>
    apiClient.get<Whiteboard[]>(
      `/api/workspaces/${workspaceId}/whiteboards`,
      { params },
    ),

  getOne: (workspaceId: string, whiteboardId: string) =>
    apiClient.get<Whiteboard>(
      `/api/workspaces/${workspaceId}/whiteboards/${whiteboardId}`,
    ),

  getState: (
    workspaceId: string,
    whiteboardId: string,
    params?: { afterSequence?: number },
  ) =>
    apiClient.get<WhiteboardState>(
      `/api/workspaces/${workspaceId}/whiteboards/${whiteboardId}/state`,
      { params },
    ),

  create: (workspaceId: string, data: WhiteboardPayload) =>
    apiClient.post<Whiteboard>(
      `/api/workspaces/${workspaceId}/whiteboards`,
      data,
    ),

  update: (
    workspaceId: string,
    whiteboardId: string,
    data: Partial<WhiteboardPayload>,
  ) =>
    apiClient.patch<Whiteboard>(
      `/api/workspaces/${workspaceId}/whiteboards/${whiteboardId}`,
      data,
    ),

  remove: (workspaceId: string, whiteboardId: string) =>
    apiClient.delete<void>(
      `/api/workspaces/${workspaceId}/whiteboards/${whiteboardId}`,
    ),
};

export const columnsApi = {
  create: (data: { title: string; boardId: string; order?: number }) =>
    apiClient.post<ApiResponse<'/api/columns', 'post'>>('/api/columns', data),

  update: (id: string, data: Partial<BoardColumn>) =>
    apiClient.put<ApiResponse<'/api/columns/{id}', 'put'>>(
      `/api/columns/${id}`,
      data,
    ),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<'/api/columns/{id}', 'delete'>>(
      `/api/columns/${id}`,
    ),

  reorder: (boardId: string, columnIds: string[]) =>
    apiClient.put<ApiResponse<'/api/columns/board/{boardId}/reorder', 'put'>>(
      `/api/columns/board/${boardId}/reorder`,
      { columnIds },
    ),
};

export const taskApi = {
  create: (data: {
    title: string;
    columnId: string;
    description?: string;
    priority?: Task['priority'];
    labels?: string[];
    dueDate?: string;
    assigneeId?: string;
    teamId?: string | null;
    isCompleted?: boolean;
    completedAt?: string;
    assigneeName?: string;
    estimateMinutes?: number | null;
    storyPoints?: number | null;
  }) => apiClient.post<ApiResponse<'/api/tasks', 'post'>>('/api/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    apiClient.put<ApiResponse<'/api/tasks/{id}', 'put'>>(
      `/api/tasks/${id}`,
      data,
    ),

  move: (id: string, data: { columnId: string; order: number }) =>
    apiClient.patch<ApiResponse<'/api/tasks/{id}/move', 'patch'>>(
      `/api/tasks/${id}/move`,
      data,
    ),

  reorder: (columnId: string, taskIds: string[]) =>
    apiClient.put<ApiResponse<'/api/tasks/column/{columnId}/reorder', 'put'>>(
      `/api/tasks/column/${columnId}/reorder`,
      { taskIds },
    ),

  createChecklistItem: (
    taskId: string,
    data: ApiBody<'/api/tasks/{taskId}/checklist-items', 'post'>,
  ) =>
    apiClient.post<
      ApiResponse<'/api/tasks/{taskId}/checklist-items', 'post'>
    >(`/api/tasks/${taskId}/checklist-items`, data),

  updateChecklistItem: (
    taskId: string,
    itemId: string,
    data: ApiBody<
      '/api/tasks/{taskId}/checklist-items/{itemId}',
      'put'
    >,
  ) =>
    apiClient.put<
      ApiResponse<
        '/api/tasks/{taskId}/checklist-items/{itemId}',
        'put'
      >
    >(`/api/tasks/${taskId}/checklist-items/${itemId}`, data),

  reorderChecklistItems: (taskId: string, itemIds: string[]) =>
    apiClient.put<
      ApiResponse<'/api/tasks/{taskId}/checklist-items/reorder', 'put'>
    >(`/api/tasks/${taskId}/checklist-items/reorder`, { itemIds }),

  removeChecklistItem: (taskId: string, itemId: string) =>
    apiClient.delete<void>(`/api/tasks/${taskId}/checklist-items/${itemId}`),

  uploadAttachment: (
    taskId: string,
    file: File,
    onUploadProgress?: (event: AxiosProgressEvent) => void,
  ) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<TaskAttachment>(
      `/api/tasks/${taskId}/attachments`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      },
    );
  },

  removeAttachment: (taskId: string, attachmentId: string) =>
    apiClient.delete<void>(`/api/tasks/${taskId}/attachments/${attachmentId}`),

  analytics: {
    daily: (query?: {
      boardId?: string;
      fromDate?: string;
      toDate?: string;
    }) =>
      apiClient.get<ApiResponse<'/api/tasks/analytics/daily', 'get'>>(
        '/api/tasks/analytics/daily',
        { params: query },
      ),
    weekly: (query?: {
      boardId?: string;
      fromDate?: string;
      toDate?: string;
    }) =>
      apiClient.get<ApiResponse<'/api/tasks/analytics/weekly', 'get'>>(
        '/api/tasks/analytics/weekly',
        { params: query },
      ),
    monthly: (query?: {
      boardId?: string;
      fromDate?: string;
      toDate?: string;
    }) =>
      apiClient.get<ApiResponse<'/api/tasks/analytics/monthly', 'get'>>(
        '/api/tasks/analytics/monthly',
        { params: query },
      ),
    summary: (query?: {
      boardId?: string;
      fromDate?: string;
      toDate?: string;
    }) =>
      apiClient.get<ApiResponse<'/api/tasks/analytics/summary', 'get'>>(
        '/api/tasks/analytics/summary',
        { params: query },
      ),
  },

  remove: (id: string) =>
    apiClient.delete<ApiResponse<'/api/tasks/{id}', 'delete'>>(
      `/api/tasks/${id}`,
    ),
};

export const taskCommentsApi = {
  getAll: (taskId: string) =>
    apiClient.get<ApiResponse<'/api/tasks/{taskId}/comments', 'get'>>(
      `/api/tasks/${taskId}/comments`,
    ),

  create: (
    taskId: string,
    data: { body: string; mentionedUserIds?: string[] },
  ) =>
    apiClient.post<ApiResponse<'/api/tasks/{taskId}/comments', 'post'>>(
      `/api/tasks/${taskId}/comments`,
      data,
    ),

  update: (
    taskId: string,
    commentId: string,
    data: { body?: string; mentionedUserIds?: string[] },
  ) =>
    apiClient.patch<
      ApiResponse<'/api/tasks/{taskId}/comments/{commentId}', 'patch'>
    >(
      `/api/tasks/${taskId}/comments/${commentId}`,
      data,
    ),

  remove: (taskId: string, commentId: string) =>
    apiClient.delete<void>(`/api/tasks/${taskId}/comments/${commentId}`),
};

export const notificationsApi = {
  getAll: (params?: { unreadOnly?: boolean }) =>
    apiClient.get<ApiResponse<'/api/notifications', 'get'>>('/api/notifications', {
      params: params?.unreadOnly ? { unreadOnly: 'true' } : undefined,
    }),

  unreadCount: () =>
    apiClient.get<ApiResponse<'/api/notifications/unread-count', 'get'>>(
      '/api/notifications/unread-count',
    ),

  markRead: (id: string) =>
    apiClient.patch<ApiResponse<'/api/notifications/{id}/read', 'patch'>>(
      `/api/notifications/${id}/read`,
    ),

  markAllRead: () => apiClient.patch<void>('/api/notifications/read-all'),
};
