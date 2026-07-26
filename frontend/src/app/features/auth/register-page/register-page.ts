import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { RegisterForm } from '@features/auth/register-form/register-form';
import { OAuthButtons } from '@features/auth/oauth-buttons/oauth-buttons';

@Component({
  selector: 'app-register-page',
  imports: [OAuthButtons, RegisterForm, RouterLink, TranslocoPipe],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {}
