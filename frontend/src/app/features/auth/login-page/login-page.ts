import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { LoginForm } from '@features/auth/login-form/login-form';

@Component({
  selector: 'app-login-page',
  imports: [LoginForm, RouterLink, TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
