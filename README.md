# Merchant Applications Dashboard

An Angular 20 app where **Sales** create merchant applications, **Reviewers** review the ones assigned to them, and **Admins** see everything and manage assignments. It runs against a mock API that lives in the browser, so there is nothing else to start.

New to Angular? Start with the [Project Guide](PROJECT_GUIDE.md): a plain-language tour of the app, the code and the mock data.

## Run it

```bash
npm install
npm start        # http://localhost:4200
npm test         # Vitest + Angular TestBed
npm run build    # production build
```

Needs Node.js 20.19 or later.

On the sign-in page pick a demo account (no password):

| Account | Role | What they can do |
| --- | --- | --- |
| Sam Carter, Sasha Ortiz | Sales | Create and edit their own drafts, submit applications, view their own applications |
| Riley Chen, Rohan Patel | Reviewer | View applications assigned to them, reveal sensitive fields, record an approve/reject decision with a risk level |
| Ada Morgan | Admin | View every application, assign a reviewer, reveal sensitive fields |

## How each requirement is met

| Requirement | Where |
| --- | --- |
| Angular 20+, standalone components, `@if` / `@for` | every component; no NgModules |
| Signals, `inject()`, RxJS | signals for UI state, RxJS for requests, debouncing and auto-save (`dashboard.ts`, `auto-save.ts`) |
| Reactive Forms with custom validation | `features/applications/wizard/` — validators in `validators.ts` (phone, registration number, bank account, tax ID, website, ticket-vs-volume) |
| Bootstrap 5 + SCSS, responsive | Bootstrap compiled from its Sass source in `src/styles/` (theme variables in `_theme.scss`, only the components we use in `_vendor.scss`), component SCSS beside each component. Layout uses the Bootstrap grid, a collapsing navbar, cards and breakpoint-aware tables |
| Router with lazy features and guards | `app.routes.ts`, `features/*/…routes.ts`, `core/auth.guard.ts` — see "Routing and guards" below |
| HTTP interceptor: bearer token + single refresh on concurrent 401s | `core/auth.interceptor.ts`, `AuthService.refresh()`, mock `POST /api/auth/refresh` |
| Vitest + TestBed | `npm test` (see below) |
| **A** Dashboard: server-side pagination, filtering, loading/error/retry, permission-aware navigation | `features/applications/dashboard/` |
| **B** Multi-step wizard with field-level validation and draft saving | `features/applications/wizard/` |
| **C** Draft auto-save: debounced RxJS, error handling without losing form state | `wizard/auto-save.ts` |
| **D** Detail view in sections; risk history and review controls hidden from Sales | `features/applications/detail/` |
| **E** Sensitive fields masked, role-based reveal, CSP explained | detail page + `<meta>` CSP in `src/index.html` (details below) |
| Optional: counts by status | status cards above the table (click one to filter) |
| Optional: Socket.IO updates | not built |

## Routing and guards

Every feature is lazy-loaded, and the guards run **before** the feature's code is downloaded (`canMatch`):

| Route | Feature (lazy) | Guard |
| --- | --- | --- |
| `/login` | `features/auth` | `guestGuard`: signed-in users go to the dashboard |
| `/applications` | `features/applications` | `authGuard`: signed-out users go to `/login` |
| `/applications/new`, `/applications/:id/edit` | wizard | `roleGuard('sales')`: other roles go to `/access-denied`; `unsavedChangesGuard` asks before leaving if the last draft save failed |
| `/applications/:id` | detail | none; the server decides what each role may see |

Page titles are set on the routes, and focus moves to the page content after each navigation.

## The token interceptor

`authInterceptor` adds `Authorization: Bearer <token>` to every request except `/api/auth/*`. When a request returns **401**:

1. If another request already replaced the token while this one was in flight, it is retried with the new token.
2. Otherwise it calls `AuthService.refresh()`. All requests that fail together share **one** `POST /api/auth/refresh` call.
3. Each failed request is retried **once** with the new token. If the refresh itself fails, the user is signed out and sent to the login page.

Try it in the app: open **Mock API tools** in the footer, click **Expire access token**, then go to the next page of the dashboard. The request succeeds and the stored token changes.

## Sensitive information and CSP

- The server sends bank account and tax ID **masked** (`••••••6789`). The detail page shows the masked value.
- Reviewers (for applications assigned to them) and Admins can click **Reveal sensitive fields**. That calls a separate endpoint which returns the full values only for those roles (Sales get a 403, even if they call it by hand). The values stay in memory and are hidden again after 30 seconds.
- `index.html` declares a **Content Security Policy** that only allows scripts and network requests from the app's own origin. If an attacker managed to inject a script or load code from another site (cross-site scripting), the browser would block it, so it could not read revealed values or send them elsewhere. `style-src` allows inline styles because Angular adds component styles at runtime. In production, also send the policy as an HTTP header so it can include `frame-ancestors`.

## Font

The app uses **Bricolage Grotesque** (`'Bricolage Grotesque', 'Bricolage Grotesque Fallback', system-ui, …`). It is self-hosted from the `@fontsource/bricolage-grotesque` package (weights 400, 500, 600 and 700, Latin) in `src/styles/_fonts.scss`, so there is no request to a font CDN and the Content Security Policy can stay at `default-src 'self'`.

`Bricolage Grotesque Fallback` is a local Arial-based face sized to match the real font (size and ascent/descent overrides measured from the font files). It is shown while the font loads, so text does not shift when it swaps in.

## Mock API

`src/app/core/mock/` answers `/api/...` requests with simulated latency and enforces permissions on the "server" side (who can see, edit, reveal, decide or assign). Data is seeded (28 applications) and saved in `localStorage`, so drafts survive a reload. To start fresh, clear the site's local storage.

Use **Mock API tools** in the footer to simulate server errors (dashboard error/retry state, failed draft saves) and to expire the access token.

Endpoints: `POST /auth/login`, `POST /auth/refresh`, `GET /reviewers`, `GET|POST /applications`, `GET|PUT /applications/:id`, `GET /applications/:id/draft`, `POST /applications/:id/submit`, `GET /applications/:id/sensitive`, `POST /applications/:id/decision`, `PUT /applications/:id/assignment`.

## Decisions to know about

- **Sales can edit drafts only.** After an application is submitted it is read-only for them.
- **Admins cannot approve or reject**, only assign (per the role description).
- **Risk history is hidden from Sales**, along with the review controls. It is internal review information; the server also leaves it out of Sales responses.
- **Tokens are kept in `sessionStorage`** so a reload keeps you signed in. That is fine for a demo; a real app would prefer an `HttpOnly` cookie for the refresh token.
- The `Authorization` header is only used against the mock; there is no real backend.

## Tests

`npm test` runs 39 tests:

- the interceptor: bearer header, one refresh for concurrent 401s, retry once, sign-out when refresh fails
- the custom validators and the page-number window
- auto-save: debounce, error without stopping, retry
- the mock API's permission rules (scoped lists, masked fields, reveal and decision rules, expired tokens)
- the route guards, including the unsaved-changes guard
- the dashboard's loading, error/retry, empty and permission-aware states, and the status cards

## Project layout

```
src/styles       Bootstrap theme (_theme), selected Bootstrap parts (_vendor), app-wide rules (_base)
src/app
├── core/       auth service, guards, interceptor, models, API service, mock API
├── features/
│   ├── auth/           login (lazy-loaded)
│   └── applications/   dashboard/, wizard/, detail/ (lazy-loaded)
├── pages/      notice/ (access denied, not found)
└── shared/     page-header (with breadcrumbs), pagination, status-badge
```
