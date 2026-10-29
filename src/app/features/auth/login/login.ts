import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { DEMO_USERS } from '../../../core/demo-users';
import { ROLE_LABELS } from '../../../core/models';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly users = DEMO_USERS;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly selected = signal(DEMO_USERS[0].id);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected submit(event: Event): void {
    event.preventDefault();
    this.busy.set(true);
    this.failed.set(false);
    this.auth.login(this.selected()).subscribe({
      next: () => void this.router.navigateByUrl('/applications'),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
