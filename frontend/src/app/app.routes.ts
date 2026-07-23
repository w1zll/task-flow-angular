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
          import('@features/workspaces/workspaces-placeholder-page/workspaces-placeholder-page').then(
            ({ WorkspacesPlaceholderPage }) => WorkspacesPlaceholderPage,
          ),
      },
      {
        path: ':workspaceId/boards',
        loadComponent: () =>
          import('@features/workspaces/workspaces-placeholder-page/workspaces-placeholder-page').then(
            ({ WorkspacesPlaceholderPage }) => WorkspacesPlaceholderPage,
          ),
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
