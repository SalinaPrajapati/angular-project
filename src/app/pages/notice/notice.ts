import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { PageHeader } from "../../shared/page-header/page-header";


@Component({
  selector: "app-notice",
  imports: [PageHeader, RouterLink],
  templateUrl: "./notice.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notice {
  private readonly auth = inject(AuthService);
  private readonly data = inject(ActivatedRoute).snapshot.data;

  protected readonly eyebrow = this.data["eyebrow"] as string;
  protected readonly heading = this.data["heading"] as string;
  protected readonly message = this.data["message"] as string;

  protected readonly homeLink = computed(() =>
    this.auth.user() ? "/applications" : "/login",
  );
  protected readonly homeLabel = computed(() =>
    this.auth.user() ? "Back to applications" : "Go to sign in",
  );
}
