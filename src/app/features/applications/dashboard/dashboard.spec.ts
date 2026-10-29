import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { ApplicationsService } from "../../../core/applications.service";
import { AuthService } from "../../../core/auth.service";
import {
  ApplicationSummary,
  ListQuery,
  Page,
  Role,
  StatusCounts,
} from "../../../core/models";
import { Dashboard } from "./dashboard";

const row = (
  id: string,
  status: ApplicationSummary["status"] = "submitted",
): ApplicationSummary => ({
  id,
  businessName: `Business ${id}`,
  status,
  ownerName: "Sam Carter",
  assignedToName: null,
  updatedAt: "2026-01-01T10:00:00.000Z",
});

describe("Dashboard", () => {
  const counts: StatusCounts = {
    total: 14,
    draft: 2,
    submitted: 3,
    in_review: 4,
    approved: 3,
    rejected: 2,
  };

  function setup(
    role: Role,
    list: (q: ListQuery) => ReturnType<ApplicationsService["list"]>,
  ) {
    const listSpy = vi.fn(list);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ApplicationsService,
          useValue: { list: listSpy, counts: () => of(counts) },
        },
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: "u", name: "U", role }),
            role: () => role,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, listSpy };
  }

  const page = (
    items: ApplicationSummary[],
    total = items.length,
  ): Page<ApplicationSummary> => ({
    items,
    total,
    page: 1,
    pageSize: 8,
  });

  it("shows the loading state, then the rows from the server", async () => {
    const { fixture, el, listSpy } = setup("admin", () =>
      of(
        page(
          Array.from({ length: 8 }, (_, i) => row(String(i + 1))),
          20,
        ),
      ),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelectorAll("tbody tr")).toHaveLength(8);
    expect(el.textContent).toContain("Showing 1–8 of 20");
    expect(listSpy).toHaveBeenCalledWith({
      page: 1,
      pageSize: 8,
      status: "",
      search: "",
    });
  });

  it("shows an error with a retry button, and loads on retry", async () => {
    let fail = true;
    const { fixture, el, listSpy } = setup("admin", () =>
      fail ? throwError(() => new Error("boom")) : of(page([row("1")])),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector("[role=alert]")?.textContent).toContain(
      "couldn't load",
    );

    fail = false;
    (el.querySelector("[role=alert] button") as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(el.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("shows an empty state when nothing matches", async () => {
    const { fixture, el } = setup("admin", () => of(page([])));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain("No applications match your filters");
  });

  it('only offers "New application" to Sales, and "Continue draft" for their drafts', async () => {
    const sales = setup("sales", () => of(page([row("1", "draft")])));
    await sales.fixture.whenStable();
    sales.fixture.detectChanges();
    expect(sales.el.textContent).toContain("New application");
    expect(sales.el.textContent).toContain("Continue draft");
  });

  it('hides "New application" from Reviewers', async () => {
    const reviewer = setup("reviewer", () => of(page([row("1")])));
    await reviewer.fixture.whenStable();
    reviewer.fixture.detectChanges();
    expect(reviewer.el.textContent).not.toContain("New application");
  });

  it("shows status totals on cards and filters the table when one is clicked", async () => {
    const { fixture, el, listSpy } = setup("admin", () => of(page([row("1")])));
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = [...el.querySelectorAll<HTMLButtonElement>("button.stat")];
    expect(cards.some((c) => /In review\s*4/.test(c.textContent ?? ""))).toBe(
      true,
    );

    cards.find((c) => c.textContent?.includes("In review"))!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(listSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "in_review", page: 1 }),
    );
    expect(el.querySelector("button.stat.is-active")?.textContent).toContain(
      "In review",
    );
  });

  it("does not show a Draft card to Reviewers", async () => {
    const { fixture, el } = setup("reviewer", () => of(page([row("1")])));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector(".stat")?.textContent).toContain(
      "All applications",
    );
    expect(el.textContent).not.toMatch(/Draft\s*2/);
  });
});
