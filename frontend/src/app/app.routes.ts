import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth-guard';
import { guestGuard } from '@core/auth/guest-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/landing/landing-page/landing-page').then(({ LandingPage }) => LandingPage),
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/login-page/login-page').then(({ LoginPage }) => LoginPage),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/register-page/register-page').then(({ RegisterPage }) => RegisterPage),
  },
  {
    path: 'workspaces',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@features/workspaces/workspace-catalog-page/workspace-catalog-page').then(
            ({ WorkspaceCatalogPage }) => WorkspaceCatalogPage,
          ),
      },
      {
        path: ':workspaceId',
        loadComponent: () =>
          import('@features/workspaces/workspace-shell/workspace-shell').then(
            ({ WorkspaceShell }) => WorkspaceShell,
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'boards',
          },
          {
            path: 'boards',
            loadComponent: () =>
              import('@features/workspaces/workspace-boards-page/workspace-boards-page').then(
                ({ WorkspaceBoardsPage }) => WorkspaceBoardsPage,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('@features/workspaces/workspace-settings-placeholder-page/workspace-settings-placeholder-page').then(
                ({ WorkspaceSettingsPlaceholderPage }) => WorkspaceSettingsPlaceholderPage,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('@features/not-found/not-found-page/not-found-page').then(
        ({ NotFoundPage }) => NotFoundPage,
      ),
  },
];
