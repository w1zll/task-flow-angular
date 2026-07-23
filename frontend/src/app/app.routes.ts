import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/landing/landing-page/landing-page').then(({ LandingPage }) => LandingPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
