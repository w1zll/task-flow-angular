import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WorkspaceInvitesApi } from '@core/api/clients/workspace-invites-api';
import { WorkspaceResponseDto } from '@core/api/generated';

const STORAGE_KEY = 'taskflow.pendingWorkspaceInvite';

@Injectable({ providedIn: 'root' })
export class PendingWorkspaceInviteService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly invitesApi = inject(WorkspaceInvitesApi);

  save(token: string): void {
    if (!isPlatformBrowser(this.platformId) || !token) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {}
  }

  peek(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async accept(token = this.peek()): Promise<WorkspaceResponseDto | null> {
    if (!token) return null;

    const workspace = await firstValueFrom(this.invitesApi.accept({ token }));
    this.clear();
    return workspace;
  }
}
