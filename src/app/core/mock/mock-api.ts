import {
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpResponse,
} from "@angular/common/http";
import { Injectable, signal } from "@angular/core";
import { Observable, mergeMap, of, throwError, timer } from "rxjs";
import { DEMO_USERS } from "../demo-users";
import { maskValue } from "../mask";
import {
  ApplicationDetail,
  ApplicationFormValue,
  ApplicationSummary,
  Decision,
  Page,
  RiskLevel,
  Session,
  StatusCounts,
  User,
} from "../models";
import { StoredApplication, emptyValue, loadDb, saveDb } from "./mock-db";

interface Result {
  status: number;
  body: unknown;
}

const ok = (body: unknown, status = 200): Result => ({ status, body });
const fail = (status: number, message: string): Result => ({
  status,
  body: { message },
});

const mask = maskValue;

@Injectable({ providedIn: "root" })
export class MockApi {
  readonly simulateErrors = signal(false);
  latencyMs = 350;

  private applications = loadDb();
  private minValidIssuedAt = 0;
  private lastIssuedAt = 0;
  expireAccessTokens(): void {
    this.minValidIssuedAt = Math.max(Date.now(), this.lastIssuedAt);
  }

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const result = this.route(req, new URL(req.urlWithParams, "http://mock"));
    return timer(this.latencyMs).pipe(
      mergeMap(() =>
        result.status < 400
          ? of(
              new HttpResponse({
                status: result.status,
                body: result.body,
                url: req.url,
              }),
            )
          : throwError(
              () =>
                new HttpErrorResponse({
                  status: result.status,
                  error: result.body,
                  url: req.url,
                }),
            ),
      ),
    );
  }

  private route(req: HttpRequest<unknown>, url: URL): Result {
    const path = url.pathname.replace(/^\/api/, "");
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (req.method === "POST" && path === "/auth/login") {
      return this.login(String(body["userId"] ?? ""));
    }
    if (req.method === "POST" && path === "/auth/refresh") {
      return this.refresh(String(body["refreshToken"] ?? ""));
    }

    const user = this.authenticate(req);
    if (!user) {
      return fail(401, "Unauthorized");
    }

    if (req.method === "GET" && path === "/reviewers") {
      return user.role === "admin"
        ? ok(
            DEMO_USERS.filter((u) => u.role === "reviewer").map(
              ({ id, name }) => ({ id, name }),
            ),
          )
        : fail(403, "Only admins can manage assignments.");
    }
    if (req.method === "GET" && path === "/applications") {
      return this.list(user, url.searchParams);
    }
    if (req.method === "GET" && path === "/applications/counts") {
      return this.counts(user);
    }
    if (req.method === "POST" && path === "/applications") {
      return this.create(user, body["value"] as ApplicationFormValue);
    }

    const match = /^\/applications\/([^/]+)(?:\/([a-z]+))?$/.exec(path);
    if (!match) {
      return fail(404, "Not found");
    }
    const [, id, action] = match;
    const app = this.applications.find((a) => a.id === id);
    if (!app || !this.canView(user, app)) {
      return fail(
        app ? 403 : 404,
        app
          ? "You do not have access to this application."
          : "Application not found.",
      );
    }

    switch (`${req.method} ${action ?? ""}`) {
      case "GET ":
        return ok(this.detail(user, app));
      case "GET draft":
        return this.draft(user, app);
      case "PUT ":
        return this.update(user, app, body["value"] as ApplicationFormValue);
      case "POST submit":
        return this.submit(user, app);
      case "GET sensitive":
        return this.sensitive(user, app);
      case "POST decision":
        return this.decide(user, app, body);
      case "PUT assignment":
        return this.assign(user, app, String(body["reviewerId"] ?? ""));
      default:
        return fail(404, "Not found");
    }
  }

  private issueTokens(userId: string) {
    this.lastIssuedAt = Math.max(
      Date.now(),
      this.minValidIssuedAt + 1,
      this.lastIssuedAt + 1,
    );
    return {
      accessToken: `at.${userId}.${this.lastIssuedAt}`,
      refreshToken: `rt.${userId}`,
    };
  }

  private login(userId: string): Result {
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) {
      return fail(404, "Unknown account.");
    }
    const session: Session = { user, ...this.issueTokens(user.id) };
    return ok(session);
  }

  private refresh(refreshToken: string): Result {
    const user = DEMO_USERS.find((u) => `rt.${u.id}` === refreshToken);
    return user
      ? ok(this.issueTokens(user.id))
      : fail(401, "Refresh token is invalid.");
  }

  private authenticate(req: HttpRequest<unknown>): User | null {
    const header = req.headers.get("Authorization") ?? "";
    const match = /^Bearer at\.([^.]+)\.(\d+)$/.exec(header);
    if (!match || Number(match[2]) <= this.minValidIssuedAt) {
      return null;
    }
    return DEMO_USERS.find((u) => u.id === match[1]) ?? null;
  }

  private canView(user: User, app: StoredApplication): boolean {
    switch (user.role) {
      case "admin":
        return true;
      case "sales":
        return app.ownerId === user.id;
      case "reviewer":
        return app.assignedToId === user.id && app.status !== "draft";
    }
  }

  private person(id: string | null) {
    const user = DEMO_USERS.find((u) => u.id === id);
    return user ? { id: user.id, name: user.name } : null;
  }

  private list(user: User, params: URLSearchParams): Result {
    if (this.simulateErrors()) {
      return fail(500, "Simulated server error.");
    }
    const status = params.get("status") ?? "";
    const search = (params.get("search") ?? "").trim().toLowerCase();
    const pageSize = Math.min(
      Math.max(Number(params.get("pageSize")) || 10, 1),
      50,
    );

    const matches = this.applications
      .filter((a) => this.canView(user, a))
      .filter((a) => !status || a.status === status)
      .filter(
        (a) =>
          !search || a.value.business.legalName.toLowerCase().includes(search),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const pages = Math.max(Math.ceil(matches.length / pageSize), 1);
    const page = Math.min(Math.max(Number(params.get("page")) || 1, 1), pages);
    const items: ApplicationSummary[] = matches
      .slice((page - 1) * pageSize, page * pageSize)
      .map((a) => ({
        id: a.id,
        businessName: a.value.business.legalName || "Untitled application",
        status: a.status,
        ownerName: this.person(a.ownerId)?.name ?? "Unknown",
        assignedToName: this.person(a.assignedToId)?.name ?? null,
        updatedAt: a.updatedAt,
      }));

    const result: Page<ApplicationSummary> = {
      items,
      total: matches.length,
      page,
      pageSize,
    };
    return ok(result);
  }

  private counts(user: User): Result {
    const counts: StatusCounts = {
      total: 0,
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    };
    for (const app of this.applications.filter((a) => this.canView(user, a))) {
      counts.total += 1;
      counts[app.status] += 1;
    }
    return ok(counts);
  }

  private create(user: User, value: ApplicationFormValue): Result {
    if (user.role !== "sales") {
      return fail(403, "Only Sales can create applications.");
    }
    if (this.simulateErrors()) {
      return fail(500, "Simulated server error.");
    }
    const now = new Date().toISOString();
    const app: StoredApplication = {
      id: `app-${Date.now().toString(36)}`,
      status: "draft",
      ownerId: user.id,
      assignedToId: null,
      createdAt: now,
      updatedAt: now,
      value: { ...emptyValue(), ...value },
      riskHistory: [],
    };
    this.applications.push(app);
    this.persist();
    return ok({ id: app.id, updatedAt: app.updatedAt }, 201);
  }

  private draft(user: User, app: StoredApplication): Result {
    return user.role === "sales" && app.status === "draft"
      ? ok(app.value)
      : fail(403, "Only the owner can open a draft.");
  }

  private update(
    user: User,
    app: StoredApplication,
    value: ApplicationFormValue,
  ): Result {
    if (user.role !== "sales" || app.status !== "draft") {
      return fail(403, "Only draft applications can be edited by their owner.");
    }
    if (this.simulateErrors()) {
      return fail(500, "Simulated server error.");
    }
    app.value = value;
    app.updatedAt = new Date().toISOString();
    this.persist();
    return ok({ id: app.id, updatedAt: app.updatedAt });
  }

  private submit(user: User, app: StoredApplication): Result {
    if (user.role !== "sales" || app.status !== "draft") {
      return fail(
        403,
        "Only draft applications can be submitted by their owner.",
      );
    }
    const { business, contact, financial } = app.value;
    const missing = [
      ["legal name", business.legalName],
      ["registration number", business.registrationNumber],
      ["business type", business.businessType],
      ["contact name", contact.fullName],
      ["email", contact.email],
      ["phone", contact.phone],
      ["monthly volume", financial.monthlyVolume],
      ["average ticket", financial.averageTicket],
      ["bank account number", financial.bankAccountNumber],
      ["tax ID", financial.taxId],
    ]
      .filter(([, v]) => v === "" || v === null)
      .map(([label]) => label);
    if (missing.length) {
      return fail(422, `Missing: ${missing.join(", ")}.`);
    }
    app.status = "submitted";
    app.updatedAt = new Date().toISOString();
    app.riskHistory.push({
      id: crypto.randomUUID(),
      at: app.updatedAt,
      actor: user.name,
      action: "Application submitted",
    });
    this.persist();
    return ok({ id: app.id, status: app.status });
  }

  private detail(user: User, app: StoredApplication): ApplicationDetail {
    const { business, contact, financial } = app.value;
    const isAssignedReviewer =
      user.role === "reviewer" && app.assignedToId === user.id;
    return {
      id: app.id,
      status: app.status,
      owner: this.person(app.ownerId)!,
      assignedTo: this.person(app.assignedToId),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      business,
      contact,
      financial: {
        monthlyVolume: financial.monthlyVolume,
        averageTicket: financial.averageTicket,
        bankAccountNumber: mask(financial.bankAccountNumber),
        taxId: mask(financial.taxId),
      },
      riskHistory: user.role === "sales" ? null : app.riskHistory,
      permissions: {
        canEdit: user.role === "sales" && app.status === "draft",
        canReveal: user.role === "admin" || isAssignedReviewer,
        canDecide: isAssignedReviewer && app.status === "in_review",
        canAssign:
          user.role === "admin" &&
          (app.status === "submitted" || app.status === "in_review"),
      },
    };
  }

  private sensitive(user: User, app: StoredApplication): Result {
    const allowed =
      user.role === "admin" ||
      (user.role === "reviewer" && app.assignedToId === user.id);
    if (!allowed) {
      return fail(403, "Your role cannot reveal sensitive fields.");
    }
    const { bankAccountNumber, taxId } = app.value.financial;
    return ok({ bankAccountNumber, taxId });
  }

  private decide(
    user: User,
    app: StoredApplication,
    body: Record<string, unknown>,
  ): Result {
    if (
      user.role !== "reviewer" ||
      app.assignedToId !== user.id ||
      app.status !== "in_review"
    ) {
      return fail(
        403,
        "Only the assigned reviewer can decide an application in review.",
      );
    }
    const decision = body["decision"] as Decision;
    const riskLevel = body["riskLevel"] as RiskLevel;
    const note = String(body["note"] ?? "").trim();
    if (
      !["approved", "rejected"].includes(decision) ||
      !["low", "medium", "high"].includes(riskLevel) ||
      note.length < 10
    ) {
      return fail(
        422,
        "A decision, risk level and a note of at least 10 characters are required.",
      );
    }
    app.status = decision;
    app.updatedAt = new Date().toISOString();
    app.riskHistory.push({
      id: crypto.randomUUID(),
      at: app.updatedAt,
      actor: user.name,
      action: decision === "approved" ? "Approved" : "Rejected",
      riskLevel,
      note,
    });
    this.persist();
    return ok({ id: app.id, status: app.status });
  }

  private assign(
    user: User,
    app: StoredApplication,
    reviewerId: string,
  ): Result {
    const reviewer = DEMO_USERS.find(
      (u) => u.id === reviewerId && u.role === "reviewer",
    );
    if (
      user.role !== "admin" ||
      (app.status !== "submitted" && app.status !== "in_review")
    ) {
      return fail(
        403,
        "Only admins can assign applications that are awaiting review.",
      );
    }
    if (!reviewer) {
      return fail(422, "Choose a reviewer.");
    }
    app.assignedToId = reviewer.id;
    app.status = "in_review";
    app.updatedAt = new Date().toISOString();
    app.riskHistory.push({
      id: crypto.randomUUID(),
      at: app.updatedAt,
      actor: user.name,
      action: `Assigned to ${reviewer.name}`,
    });
    this.persist();
    return ok({ id: app.id, status: app.status });
  }

  private persist(): void {
    saveDb(this.applications);
  }
}
