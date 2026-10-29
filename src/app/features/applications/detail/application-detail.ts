import { HttpErrorResponse } from "@angular/common/http";
import { DatePipe, DecimalPipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Subscription, of, switchMap, timer } from "rxjs";
import { ApplicationsService } from "../../../core/applications.service";
import {
  ApplicationDetail,
  Decision,
  RiskLevel,
  SensitiveFields,
} from "../../../core/models";
import { PageHeader } from "../../../shared/page-header/page-header";
import { StatusBadge } from "../../../shared/status-badge/status-badge";

type View =
  | { state: "loading" }
  | { state: "error"; status: number }
  | { state: "ready"; detail: ApplicationDetail };

const REVEAL_MS = 30_000;

@Component({
  selector: "app-application-detail",
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    StatusBadge,
  ],
  templateUrl: "./application-detail.html",
  styleUrl: "./application-detail.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationDetailPage {
  private readonly api = inject(ApplicationsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly revealSeconds = REVEAL_MS / 1000;
  protected readonly view = signal<View>({ state: "loading" });

  protected readonly revealed = signal<SensitiveFields | null>(null);
  protected readonly revealing = signal(false);
  protected readonly revealError = signal<string | null>(null);

  protected readonly actionError = signal<string | null>(null);
  protected readonly working = signal(false);

  protected readonly decisionForm = new FormGroup({
    decision: new FormControl<Decision | "">("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    riskLevel: new FormControl<RiskLevel | "">("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    note: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });
  protected readonly decisionSubmitted = signal(false);

  protected readonly reviewerControl = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly assignSubmitted = signal(false);

  protected readonly reviewers = toSignal(
    toObservable(this.view).pipe(
      switchMap((view) =>
        view.state === "ready" && view.detail.permissions.canAssign
          ? this.api.reviewers()
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  private id = "";
  private loadSub?: Subscription;
  private hideSub?: Subscription;

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get("id") ?? "";
        this.hide();
        this.load(false);
      });
  }

  protected reload(): void {
    this.load(false);
  }

  protected toggleReveal(): void {
    if (this.revealed()) {
      this.hide();
      return;
    }
    this.revealing.set(true);
    this.revealError.set(null);
    this.api.reveal(this.id).subscribe({
      next: (fields) => {
        this.revealing.set(false);
        this.revealed.set(fields);
        this.hideSub?.unsubscribe();
        this.hideSub = timer(REVEAL_MS)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.hide());
      },
      error: (error: unknown) => {
        this.revealing.set(false);
        this.revealError.set(
          this.messageFrom(
            error,
            "Could not reveal the fields. Please try again.",
          ),
        );
      },
    });
  }

  protected decide(): void {
    this.decisionSubmitted.set(true);
    if (this.decisionForm.invalid) {
      return;
    }
    const { decision, riskLevel, note } = this.decisionForm.getRawValue();
    this.run(
      this.api.decide(this.id, {
        decision: decision as Decision,
        riskLevel: riskLevel as RiskLevel,
        note,
      }),
      () => {
        this.decisionForm.reset();
        this.decisionSubmitted.set(false);
      },
    );
  }

  protected assign(): void {
    this.assignSubmitted.set(true);
    if (this.reviewerControl.invalid) {
      return;
    }
    this.run(this.api.assign(this.id, this.reviewerControl.value), () => {
      this.reviewerControl.reset();
      this.assignSubmitted.set(false);
    });
  }

  protected showError(control: FormControl, submitted: boolean): boolean {
    return control.invalid && (control.touched || submitted);
  }

  private run(
    request: ReturnType<ApplicationsService["decide"]>,
    done: () => void,
  ): void {
    this.working.set(true);
    this.actionError.set(null);
    request.subscribe({
      next: () => {
        this.working.set(false);
        done();
        this.hide();
        this.load(true);
      },
      error: (error: unknown) => {
        this.working.set(false);
        this.actionError.set(
          this.messageFrom(error, "That did not work. Please try again."),
        );
      },
    });
  }

  private load(silent: boolean): void {
    if (!silent) {
      this.view.set({ state: "loading" });
    }
    this.loadSub?.unsubscribe();
    this.loadSub = this.api.get(this.id).subscribe({
      next: (detail) => this.view.set({ state: "ready", detail }),
      error: (error: unknown) =>
        this.view.set({
          state: "error",
          status: error instanceof HttpErrorResponse ? error.status : 0,
        }),
    });
  }

  private hide(): void {
    this.hideSub?.unsubscribe();
    this.revealed.set(null);
  }

  private messageFrom(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse && error.error?.message
      ? error.error.message
      : fallback;
  }
}
