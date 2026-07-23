import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { postAuthUrl } from '@core/auth/auth-route';
import { AuthStore } from '@core/auth/auth.store';
import { AppButton } from '@shared/ui/app-button/app-button';

@Component({
  selector: 'app-register-form',
  imports: [AppButton, ReactiveFormsModule, TranslocoPipe],
  templateUrl: './register-form.html',
  styleUrl: './register-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
  });

  protected showError(controlName: 'name' | 'email' | 'password', error: string): boolean {
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
      const user = await this.auth.register(this.form.getRawValue());
      const destination = postAuthUrl(user, this.route.snapshot.queryParamMap.get('next'));
      await this.router.navigateByUrl(destination);
    } catch {}
  }
}
