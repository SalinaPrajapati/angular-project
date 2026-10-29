import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { ApplicationStatus, STATUS_LABELS } from "../../core/models";

const BADGE_CLASS: Record<ApplicationStatus, string> = {
  draft: "bg-secondary-subtle text-secondary-emphasis",
  submitted: "bg-info-subtle text-info-emphasis",
  in_review: "bg-warning-subtle text-warning-emphasis",
  approved: "bg-success-subtle text-success-emphasis",
  rejected: "bg-danger-subtle text-danger-emphasis",
};

@Component({
  selector: "app-status-badge",
  template: `<span
    class="badge rounded-pill fw-semibold"
    [class]="badgeClass()"
    >{{ label() }}</span
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
  protected readonly badgeClass = computed(() => BADGE_CLASS[this.status()]);
}
