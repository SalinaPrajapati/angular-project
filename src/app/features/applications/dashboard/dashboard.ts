import { DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
} from "rxjs";
import { ApplicationsService } from "../../../core/applications.service";
import { AuthService } from "../../../core/auth.service";
import {
  ApplicationStatus,
  ApplicationSummary,
  ListQuery,
  Page,
  StatusCounts,
  STATUS_LABELS,
} from "../../../core/models";
import { PageHeader } from "../../../shared/page-header/page-header";
import { Pagination } from "../../../shared/pagination/pagination";
import { StatusBadge } from "../../../shared/status-badge/status-badge";

type View =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; page: Page<ApplicationSummary> };

const PAGE_SIZE = 8;

@Component({
  selector: "app-dashboard",
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    Pagination,
    StatusBadge,
  ],
  templateUrl: "./dashboard.html",
  styleUrl: "./dashboard.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly api = inject(ApplicationsService);
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly statuses = Object.entries(STATUS_LABELS) as [
    ApplicationStatus,
    string,
  ][];
  protected readonly canCreate = computed(() => this.auth.role() === "sales");

  protected readonly searchControl = new FormControl("", { nonNullable: true });
  protected readonly statusControl = new FormControl<ApplicationStatus | "">(
    "",
    { nonNullable: true },
  );

  private readonly page = signal(1);
  private readonly search = signal("");
  private readonly status = signal<ApplicationStatus | "">("");
  private readonly attempt = signal(0);

  private readonly query = computed<ListQuery>(() => ({
    page: this.page(),
    pageSize: PAGE_SIZE,
    status: this.status(),
    search: this.search(),
  }));

  protected readonly view = toSignal(
    toObservable(
      computed(() => ({ query: this.query(), attempt: this.attempt() })),
    ).pipe(
      switchMap(({ query }) =>
        this.api.list(query).pipe(
          map((page): View => ({ state: "ready", page })),
          catchError(() => of<View>({ state: "error" })),
          startWith<View>({ state: "loading" }),
        ),
      ),
    ),
    { initialValue: { state: "loading" } as View },
  );

  /** Status totals for the cards above the table; null while loading or if the request failed. */
  protected readonly counts = toSignal(
    toObservable(this.attempt).pipe(
      switchMap(() => this.api.counts().pipe(catchError(() => of(null)))),
    ),
    { initialValue: null as StatusCounts | null },
  );

  protected readonly cards = computed(() => {
    const counts = this.counts();
    const all: { status: ApplicationStatus | ""; label: string }[] = [
      { status: "", label: "All applications" },
      ...this.statuses.map(([status, label]) => ({ status, label })),
    ];
    // Reviewers never see drafts, so that card would always say 0.
    return all
      .filter(
        (card) => card.status !== "draft" || this.auth.role() !== "reviewer",
      )
      .map((card) => ({
        ...card,
        count: counts
          ? counts[card.status === "" ? "total" : card.status]
          : null,
      }));
  });

  protected readonly totalPages = computed(() => {
    const view = this.view();
    return view.state === "ready"
      ? Math.max(Math.ceil(view.page.total / view.page.pageSize), 1)
      : 1;
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        this.search.set(value);
        this.page.set(1);
      });

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.status.set(value);
        this.page.set(1);
      });
  }

  protected filterByStatus(status: ApplicationStatus | ""): void {
    this.statusControl.setValue(status);
  }

  protected activeStatus(): ApplicationStatus | "" {
    return this.status();
  }

  protected goTo(page: number): void {
    this.page.set(page);
  }

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  protected clearFilters(): void {
    this.searchControl.setValue("", { emitEvent: false });
    this.statusControl.setValue("", { emitEvent: false });
    this.search.set("");
    this.status.set("");
    this.page.set(1);
  }

  protected rangeLabel(page: Page<ApplicationSummary>): string {
    if (page.total === 0) {
      return "No applications";
    }
    const from = (page.page - 1) * page.pageSize + 1;
    const to = Math.min(page.page * page.pageSize, page.total);
    return `Showing ${from}–${to} of ${page.total}`;
  }

  protected hasFilters(): boolean {
    return this.search() !== "" || this.status() !== "";
  }
}
