import { HttpErrorResponse } from "@angular/common/http";
import { Location } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Observable, Subject, filter, of, switchMap, take, tap } from "rxjs";
import { ApplicationsService } from "../../../core/applications.service";
import { maskValue } from "../../../core/mask";
import { ApplicationFormValue } from "../../../core/models";
import { PageHeader } from "../../../shared/page-header/page-header";
import { SaveState, autoSave } from "./auto-save";
import { FieldOption, FormField } from "./form-field";
import {
  bankAccountNumber,
  phoneNumber,
  registrationNumber,
  taxId,
  ticketWithinVolume,
  websiteUrl,
} from "./validators";

const STEPS = ["Business", "Contact", "Financial", "Review"] as const;
const GROUPS = ["business", "contact", "financial"] as const;

@Component({
  selector: "app-application-wizard",
  imports: [ReactiveFormsModule, RouterLink, PageHeader, FormField],
  templateUrl: "./application-wizard.html",
  styleUrl: "./application-wizard.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationWizard {
  private readonly api = inject(ApplicationsService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly heading = viewChild<ElementRef<HTMLElement>>("stepHeading");

  protected readonly steps = STEPS;
  protected readonly step = signal(0);

  protected readonly businessTypes: FieldOption[] = [
    { value: "retail", label: "Retail" },
    { value: "restaurant", label: "Restaurant or café" },
    { value: "services", label: "Professional services" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "other", label: "Other" },
  ];

  protected readonly form = new FormGroup({
    business: new FormGroup({
      legalName: new FormControl("", {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      }),
      registrationNumber: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, registrationNumber()],
      }),
      businessType: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required],
      }),
      website: new FormControl("", {
        nonNullable: true,
        validators: [websiteUrl()],
      }),
    }),
    contact: new FormGroup({
      fullName: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      phone: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, phoneNumber()],
      }),
    }),
    financial: new FormGroup({
      monthlyVolume: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(1000),
      ]),
      averageTicket: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(1),
        ticketWithinVolume(),
      ]),
      bankAccountNumber: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, bankAccountNumber()],
      }),
      taxId: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, taxId()],
      }),
    }),
  });

  protected readonly c = this.form.controls;

  protected readonly loadState = signal<"loading" | "ready" | "error">("ready");
  protected readonly saveState = signal<SaveState | "idle">("idle");
  protected readonly submitting = signal(false);
  protected readonly stepError = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private draftId: string | null =
    inject(ActivatedRoute).snapshot.paramMap.get("id");
  private readonly retry$ = new Subject<void>();
  private readonly saveState$ = toObservable(this.saveState);

  constructor() {
    if (this.draftId) {
      this.loadDraft(this.draftId);
    }

    this.c.financial.controls.monthlyVolume.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.c.financial.controls.averageTicket.updateValueAndValidity({
          emitEvent: false,
        }),
      );

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.stepError() && this.form.get(GROUPS[this.step()])?.valid) {
        this.stepError.set(false);
      }
    });

    autoSave<ApplicationFormValue>({
      changes$: this.form.valueChanges.pipe(
        filter(() => this.loadState() === "ready" && !this.submitting()),
      ),
      retry$: this.retry$,
      getValue: () => this.form.getRawValue(),
      save: (value) => this.persist(value),
    })
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.saveState.set(state));
  }

  protected isLast(): boolean {
    return this.step() === STEPS.length - 1;
  }

  hasUnsavedChanges(): boolean {
    return this.saveState() === "error" && !this.submitting();
  }

  protected retrySave(): void {
    this.retry$.next();
  }

  protected retryLoad(): void {
    if (this.draftId) {
      this.loadDraft(this.draftId);
    }
  }

  protected back(): void {
    this.stepError.set(false);
    this.step.update((s) => Math.max(s - 1, 0));
    this.focusHeading();
  }

  protected onSubmit(): void {
    if (this.isLast()) {
      this.submit();
    } else {
      this.next();
    }
  }

  protected maskedAccount(): string {
    return maskValue(this.form.getRawValue().financial.bankAccountNumber);
  }

  protected maskedTaxId(): string {
    return maskValue(this.form.getRawValue().financial.taxId);
  }

  private next(): void {
    const group = this.form.get(GROUPS[this.step()]);
    if (group?.invalid) {
      this.showErrors(group);
      return;
    }
    this.stepError.set(false);
    this.step.update((s) => s + 1);
    this.focusHeading();
  }

  private submit(): void {
    const invalidStep = GROUPS.findIndex((key) => this.form.get(key)?.invalid);
    if (invalidStep !== -1) {
      this.step.set(invalidStep);
      this.showErrors(this.form.get(GROUPS[invalidStep])!);
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.whenNotSaving()
      .pipe(
        switchMap(() => this.persist(this.form.getRawValue())),
        switchMap(() => this.api.submit(this.draftId!)),
      )
      .subscribe({
        next: () => void this.router.navigate(["/applications", this.draftId]),
        error: (error: unknown) => {
          this.submitting.set(false);
          this.submitError.set(
            error instanceof HttpErrorResponse && error.error?.message
              ? error.error.message
              : "We could not submit the application. Your answers are kept; please try again.",
          );
        },
      });
  }

  private loadDraft(id: string): void {
    this.loadState.set("loading");
    this.api.getDraft(id).subscribe({
      next: (value) => {
        this.form.patchValue(value, { emitEvent: false });
        this.loadState.set("ready");
      },
      error: () => this.loadState.set("error"),
    });
  }

  private persist(value: ApplicationFormValue): Observable<unknown> {
    if (this.draftId) {
      return this.api.updateDraft(this.draftId, value);
    }
    return this.api.createDraft(value).pipe(
      tap(({ id }) => {
        this.draftId = id;
        this.location.replaceState(`/applications/${id}/edit`);
      }),
    );
  }

  private whenNotSaving(): Observable<unknown> {
    return this.saveState() !== "saving"
      ? of(null)
      : this.saveState$.pipe(
          filter((state) => state !== "saving"),
          take(1),
        );
  }

  private showErrors(group: AbstractControl): void {
    group.markAllAsTouched();
    this.stepError.set(true);
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLElement>(".is-invalid")
          ?.focus(),
      { injector: this.injector },
    );
  }

  private focusHeading(): void {
    afterNextRender(() => this.heading()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
