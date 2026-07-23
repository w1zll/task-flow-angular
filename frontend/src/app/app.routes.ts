import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/landing/landing-page/landing-page').then(({ LandingPage }) => LandingPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@features/not-found/not-found-page/not-found-page').then(
        ({ NotFoundPage }) => NotFoundPage,
      ),
  },
];
