import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TuiInput } from '@taiga-ui/core';

import { AuthenticationCompletionService } from '@core/auth/authentication-completion.service';
import { AuthStore } from '@core/auth/auth.store';
import { AppButton } from '@shared/ui/app-button/app-button';

@Component({
  selector: 'app-login-form',
  imports: [AppButton, ReactiveFormsModule, TranslocoPipe, TuiInput],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly completion = inject(AuthenticationCompletionService);
  protected readonly auth = inject(AuthStore);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showError(controlName: 'email' | 'password', error: string): boolean {
    const control = this.form.controls[controlName];

    return control.touched && control.hasError(error);
  }

  protected async submit(): Promise<void> {
    this.auth.clearError();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      const user = await this.auth.login(this.form.getRawValue());
      const destination = await this.completion.finishAuthentication(
        user,
        this.route.snapshot.queryParamMap.get('next'),
      );
      await this.router.navigateByUrl(destination);
    } catch {}
  }
}
