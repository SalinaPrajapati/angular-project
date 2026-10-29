import {
  HttpErrorResponse,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "@angular/common/http";
import { TestBed } from "@angular/core/testing";
import { lastValueFrom } from "rxjs";
import {
  ApplicationDetail,
  Page,
  ApplicationSummary,
  Session,
} from "../models";
import { MockApi } from "./mock-api";

describe("MockApi permissions", () => {
  let api: MockApi;
  const tokens = new Map<string, string>();

  const call = async <T>(
    method: string,
    url: string,
    user: string,
    body?: unknown,
  ): Promise<T> => {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${tokens.get(user)}`,
    });
    const req = new HttpRequest(method, url, body ?? null, { headers });
    const event = await lastValueFrom(api.handle(req));
    return (event as HttpResponse<T>).body as T;
  };

  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 200;
    } catch (error) {
      return (error as HttpErrorResponse).status;
    }
  };

  beforeEach(async () => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({});
    api = TestBed.inject(MockApi);
    api.latencyMs = 0;
    for (const id of [
      "u-sales-1",
      "u-sales-2",
      "u-rev-1",
      "u-rev-2",
      "u-admin-1",
    ]) {
      const event = await lastValueFrom(
        api.handle(new HttpRequest("POST", "/api/auth/login", { userId: id })),
      );
      tokens.set(id, (event as HttpResponse<Session>).body!.accessToken);
    }
  });

  it("shows Sales only their own applications, Reviewers only assigned ones, Admin all", async () => {
    const list = (user: string) =>
      call<Page<ApplicationSummary>>(
        "GET",
        "/api/applications?pageSize=50",
        user,
      );

    const admin = await list("u-admin-1");
    const sales = await list("u-sales-1");
    const reviewer = await list("u-rev-1");

    expect(admin.total).toBe(28);
    expect(sales.total).toBeGreaterThan(0);
    expect(sales.total).toBeLessThan(admin.total);
    expect(sales.items.every((a) => a.ownerName === "Sam Carter")).toBe(true);
    expect(
      reviewer.items.every(
        (a) => a.assignedToName === "Riley Chen" && a.status !== "draft",
      ),
    ).toBe(true);
  });

  it("paginates on the server", async () => {
    const page2 = await call<Page<ApplicationSummary>>(
      "GET",
      "/api/applications?page=2&pageSize=5",
      "u-admin-1",
    );
    expect(page2.items).toHaveLength(5);
    expect(page2.page).toBe(2);
    expect(page2.total).toBe(28);
  });

  it("masks sensitive fields and hides risk history from Sales", async () => {
    const detail = await call<ApplicationDetail>(
      "GET",
      "/api/applications/app-003",
      "u-sales-1",
    );
    expect(detail.financial.bankAccountNumber).toMatch(/^•+\d{4}$/);
    expect(detail.riskHistory).toBeNull();
    expect(detail.permissions).toEqual({
      canEdit: false,
      canReveal: false,
      canDecide: false,
      canAssign: false,
    });
  });

  it("refuses to reveal sensitive fields to Sales but allows Admin", async () => {
    expect(
      await status(
        call("GET", "/api/applications/app-003/sensitive", "u-sales-1"),
      ),
    ).toBe(403);
    const fields = await call<{ bankAccountNumber: string }>(
      "GET",
      "/api/applications/app-003/sensitive",
      "u-admin-1",
    );
    expect(fields.bankAccountNumber).toMatch(/^\d{8,17}$/);
  });

  it("does not let one Sales user open another's application", async () => {
    expect(
      await status(call("GET", "/api/applications/app-001", "u-sales-2")),
    ).toBe(403);
  });

  it("only lets the assigned Reviewer decide, and Sales cannot decide", async () => {
    const body = {
      decision: "approved",
      riskLevel: "low",
      note: "Looks fine to me.",
    };
    expect(
      await status(
        call("POST", "/api/applications/app-002/decision", "u-sales-2", body),
      ),
    ).toBe(403);
    expect(
      await status(
        call("POST", "/api/applications/app-002/decision", "u-rev-1", body),
      ),
    ).toBe(403);
    expect(
      await status(
        call("POST", "/api/applications/app-002/decision", "u-rev-2", body),
      ),
    ).toBe(200);
  });

  it("rejects calls without a valid token, and tokens that were expired", async () => {
    expect(
      await status(
        lastValueFrom(api.handle(new HttpRequest("GET", "/api/applications"))),
      ),
    ).toBe(401);
    api.expireAccessTokens();
    expect(await status(call("GET", "/api/applications", "u-admin-1"))).toBe(
      401,
    );
  });
});
