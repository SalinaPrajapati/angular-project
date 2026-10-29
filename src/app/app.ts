import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { filter, skip } from "rxjs";
import { AuthService } from "./core/auth.service";
import { ROLE_LABELS } from "./core/models";
import { MockApi } from "./core/mock/mock-api";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly mock = inject(MockApi);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly menuOpen = signal(false);
  private readonly router = inject(Router);
  private readonly main = viewChild<ElementRef<HTMLElement>>("main");

  constructor() {
    const navigations$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    );
    navigations$.subscribe(() => this.menuOpen.set(false));
    navigations$.pipe(skip(1)).subscribe(() => this.focusMain());
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.focusMain();
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl("/login");
  }

  private focusMain(): void {
    this.main()?.nativeElement.focus();
  }
}
