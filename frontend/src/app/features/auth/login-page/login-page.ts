import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LoginForm } from '@features/auth/login-form/login-form';
import { OAuthButtons } from '@features/auth/oauth-buttons/oauth-buttons';

@Component({
  selector: 'app-login-page',
  imports: [LoginForm, OAuthButtons, RouterLink, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
