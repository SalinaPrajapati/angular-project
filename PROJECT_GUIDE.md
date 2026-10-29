# Project Guide: Merchant Applications Dashboard

A plain-language tour of this project for someone who is **new to Angular**. For the short technical summary and the requirement checklist, see [README.md](README.md).

---

## 1. What this app does

A small company receives applications from businesses (merchants) that want to accept payments. Three kinds of staff work with those applications:

| Role | Who they are in the demo | What they do |
| --- | --- | --- |
| **Sales** | Sam Carter, Sasha Ortiz | Fill in a new application, save it as a draft, submit it. See only **their own** applications. |
| **Reviewer** | Riley Chen, Rohan Patel | Check the applications **assigned to them**, then approve or reject with a risk level and a note. |
| **Admin** | Ada Morgan | See **every** application and choose which reviewer handles each one. |

An application moves through these statuses:

```
draft  ->  submitted  ->  in review  ->  approved
                                     \->  rejected
```

- **draft**: Sales is still filling it in.
- **submitted**: Sales finished it. It is waiting for an Admin to assign a reviewer.
- **in review**: A reviewer has been assigned.
- **approved / rejected**: The reviewer made a decision.

---

## 2. Try it in five minutes

```bash
npm install
npm start          # then open http://localhost:4200
```

There are no passwords. Pick an account on the sign-in page, then try this:

1. **Sign in as Sam Carter (Sales).** The dashboard lists Sam's applications. Click a status card (for example "Draft") to filter. Type in the search box to search by business name.
2. Click **New application**. Fill in step 1 and stop typing for a moment. Look for **"Draft saved."** near the top: the draft saves itself.
3. Finish the 4 steps and submit. The application now has the status *submitted*.
4. **Sign out, then sign in as Ada Morgan (Admin).** Open that application and assign it to Riley Chen.
5. **Sign out, then sign in as Riley Chen (Reviewer).** Open it. The bank account is hidden (`••••••6789`). Click **Reveal sensitive fields**. Then approve it with a risk level and a note.
6. **Sign back in as Sam.** Sam can see the new status, but not the risk history or the review controls.

Everything you do is remembered by your browser (see section 5), so a reload keeps your changes.

---

## 3. Angular in ten minutes

If you know HTML, CSS and a little TypeScript, you already know most of it. Here are the Angular words used in this project, each with an example from the code.

| Term | Plain meaning | Example here |
| --- | --- | --- |
| **Component** | A piece of the page: a TypeScript file (behaviour), an HTML file (what it looks like) and an SCSS file (its styles). | `dashboard.ts`, `dashboard.html`, `dashboard.scss` |
| **Standalone** | A component lists the things it uses itself, in its `imports` array. There are no big "module" files. | every component |
| **Template** | The HTML of a component. `@if (...) { }` shows something conditionally and `@for (...) { }` repeats it. `{{ value }}` prints a value. | `dashboard.html` |
| **Signal** | A variable that tells the page when it changes, so the page updates by itself. `count()` reads it and `count.set(3)` changes it. | `view` in `application-detail.ts` |
| **Service** | A class that holds shared logic, such as "talk to the server". Components ask for it with `inject(...)`. | `ApplicationsService`, `AuthService` |
| **Observable / RxJS** | A stream of values over time, like a server response or keystrokes. You can wait, combine, retry or cancel them. | `auto-save.ts` |
| **Router** | Decides which component to show for which URL. | `app.routes.ts` |
| **Lazy loading** | A feature's code is downloaded only when someone first visits it. | `/login`, `/applications` |
| **Guard** | A function that runs before a route opens and can say "no, go somewhere else". | `auth.guard.ts` |
| **Interceptor** | A function that sees every HTTP request on its way out and every response on its way back. | `auth.interceptor.ts` |
| **Reactive Form** | A form described in TypeScript (fields, rules, error messages) and connected to the HTML. | the wizard |

### How the pieces connect

```
URL in the address bar
        |
   Router (app.routes.ts) ---- Guard: allowed? If not, redirect
        |
   Component (page)  <---->  Service  --- HTTP request --->  Interceptors  --->  Mock API
   (shows data,              (asks for                         1. add the login token
    reacts to clicks)         and sends data)                  2. refresh the token if it expired
                                                               3. answer from the fake server
```

---

## 4. A tour of the code

Everything lives under `src/app/`.

```
src/app
├── app.ts / app.html / app.scss   The page frame: top navigation bar, footer, "Mock API tools"
├── app.routes.ts                  The map of URLs to pages
├── app.config.ts                  App-wide setup: router and HTTP interceptors
│
├── core/                          Things the whole app needs
│   ├── models.ts                  The shapes of the data (Role, Application, Status, ...)
│   ├── demo-users.ts              The 5 demo accounts
│   ├── auth.service.ts            Who is signed in; sign in, sign out, refresh the token
│   ├── auth.guard.ts              Route guards: signed in? right role?
│   ├── unsaved-changes.guard.ts   "You have unsaved changes" warning
│   ├── auth.interceptor.ts        Adds the login token to requests and handles expiry
│   ├── applications.service.ts    All the calls to the server (list, get, save, submit, ...)
│   ├── mask.ts                    Turns 123456789 into •••••6789
│   └── mock/                      The fake server (see section 5)
│
├── features/                      One folder per area; each is lazy-loaded
│   ├── auth/login/                The sign-in page
│   └── applications/
│       ├── dashboard/             The list: table, search, status cards, pagination
│       ├── wizard/                The 4-step form, validators, auto-save
│       └── detail/                One application: sections, reveal, decision, assignment
│
├── shared/                        Small reusable pieces: page header, pagination, status badge
└── pages/notice/                  "Access denied" and "Page not found"
```

Styles live in `src/styles/`: `_theme.scss` (colours, fonts, radii), `_vendor.scss` (the parts of Bootstrap that are used), `_base.scss` (app-wide rules) and `_fonts.scss` (Bricolage Grotesque).

### Where is each requirement?

| You want to see... | Open this |
| --- | --- |
| The dashboard table, filters, paging, loading and error states | `features/applications/dashboard/dashboard.ts` and `.html` |
| The multi-step form | `features/applications/wizard/application-wizard.ts` and `.html` |
| Field rules (phone, tax ID, bank account, ...) | `features/applications/wizard/validators.ts` |
| Auto-save (waits until you stop typing, keeps your data if saving fails) | `features/applications/wizard/auto-save.ts` |
| Detail page, masked fields, reveal button, decision form | `features/applications/detail/application-detail.ts` and `.html` |
| Who may open which URL | `app.routes.ts` and `core/auth.guard.ts` |
| Token handling and the single refresh | `core/auth.interceptor.ts` |
| Who may see or do what, enforced on the "server" side | `core/mock/mock-api.ts` |

---

## 5. Which mock data is used

There is **no real server and no database**. The browser plays the part of the server, so you only need `npm start`. Four files do this:

| File | What it holds |
| --- | --- |
| `core/demo-users.ts` | The 5 people you can sign in as |
| `core/mock/mock-db.ts` | The 28 sample applications and the code that stores them |
| `core/mock/mock-api.ts` | The "server" logic: it answers requests and checks permissions |
| `core/mock/mock-backend.interceptor.ts` | The hook that sends requests to the mock instead of the network |

All of the data is invented. Names are made up, websites use `example.com`, and phone numbers use the fictional `555 010` range.

### The people (`demo-users.ts`)

| Name | Role | Internal id |
| --- | --- | --- |
| Sam Carter | Sales | `u-sales-1` |
| Sasha Ortiz | Sales | `u-sales-2` |
| Riley Chen | Reviewer | `u-rev-1` |
| Rohan Patel | Reviewer | `u-rev-2` |
| Ada Morgan | Admin | `u-admin-1` |

### The sample applications (`mock-db.ts`)

On first load the app creates **28 applications** such as *Northwind Coffee Roasters*, *Bluebird Bakery* and *Harbor Light Hardware*. The code builds them from a list of 28 business names:

- **Status** repeats in a fixed pattern (approved, in review, submitted, draft, rejected, in review, submitted), which gives: 4 approved, 8 in review, 8 submitted, 4 draft, 4 rejected.
- **Owner** alternates between the two Sales people (14 each).
- **Reviewer** alternates between the two Reviewers. Applications that are *in review*, *approved* or *rejected* get one assigned (8 each).
- **Dates** are spread over the last few days, one application roughly every 9 hours.
- **Drafts** only have a business name and a contact name, the rest is empty, like a real unfinished form.
- **Risk history** is filled in to match the status: "Application submitted", "Assigned to ...", and for decided ones "Approved" (low risk) or "Rejected" (high risk) with a short note.

Example, the first application:

| Field | Value |
| --- | --- |
| Id / status | `app-001` / approved |
| Owner / reviewer | Sam Carter / Riley Chen |
| Business | Northwind Coffee Roasters, `REG-100000`, retail, `https://www.northwind.example.com` |
| Contact | Northwind Owner, `owner@northwind.example.com`, `+1 555 010 2000` |
| Money | monthly volume 20,000, average ticket 35 |
| Sensitive | bank account `0040000000`, tax ID `12-3456789` (shown masked as `••••••0000` and `••••••6789`) |

### Who sees how many

| Signed in as | Sees |
| --- | --- |
| Sam Carter | 14 (their own) |
| Sasha Ortiz | 14 (their own) |
| Riley Chen | 8 (assigned to Riley, never drafts) |
| Rohan Patel | 8 (assigned to Rohan, never drafts) |
| Ada Morgan | all 28 |

### How changes are remembered

- Applications are saved in the browser's **localStorage** (key `angular-app.mock-db`). That is why drafts and decisions survive a reload.
- The signed-in session is kept in **sessionStorage**, so a reload keeps you signed in, but closing the tab signs you out.
- **To reset to the original 28 applications:** open the browser's developer tools, go to Application, Local Storage, and delete `angular-app.mock-db`. Then reload. (Or clear the site data.)
- Because the data lives in your browser, two browsers or two people never share it. This is the main difference from a real backend.

### What the fake server does

For every request it behaves like a real API would:

- **Delay:** each answer waits about 350 ms, so loading spinners are visible.
- **Permissions:** it checks who is asking. A Sales user asking for another person's application gets a `403`. Asking for something that does not exist gives `404`. A missing token gives `401`.
- **Masking:** bank account and tax ID are sent masked. Full values come only from a separate "reveal" request that Sales cannot make.
- **Validation:** it refuses to submit an incomplete application (`422`) and refuses a decision without a risk level and a note of at least 10 characters.
- **Tokens:** signing in returns a fake token such as `at.u-sales-1.1730000000000` and a refresh token such as `rt.u-sales-1`. They are not secure and are only there to exercise the real token-handling code.

The endpoints it answers:

| Request | Purpose |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/refresh` | Sign in and get a new token |
| `GET /api/applications` | The dashboard list (page, page size, status, search) |
| `GET /api/applications/counts` | The numbers on the status cards |
| `POST /api/applications` | Create a draft |
| `GET` / `PUT /api/applications/:id` | Read one application / save a draft |
| `GET /api/applications/:id/draft` | Load a draft into the wizard |
| `POST /api/applications/:id/submit` | Submit a draft |
| `GET /api/applications/:id/sensitive` | Reveal bank account and tax ID |
| `POST /api/applications/:id/decision` | Reviewer approves or rejects |
| `PUT /api/applications/:id/assignment` | Admin assigns a reviewer |
| `GET /api/reviewers` | Admin: the list of reviewers to choose from |

### Testing errors on purpose

At the bottom of every page, open **Mock API tools**:

- **Simulate server errors** makes saves and the dashboard list fail, so you can see the error message, the **Retry** button, and that your form is not lost.
- **Expire access token** makes the current token invalid. The next request gets a `401`, the interceptor asks for a new token once, and the request is retried without you noticing.

### Moving to a real backend

The pages and services already call `/api/...` as if the server were real. To switch:

1. In `app.config.ts`, remove `mockBackendInterceptor` from the interceptor list.
2. Make your real server answer the same endpoints and enforce the same permission rules (the table above and `mock-api.ts` are the specification).
3. Delete the `core/mock/` folder and the "Mock API tools" block in `app.html` when you no longer need them.

No page or form needs to change.

---

## 6. How the main features work

### Signing in and staying signed in

1. The sign-in page calls `AuthService.login(userId)`, which sends `POST /api/auth/login`.
2. The reply holds the user and two tokens. They are stored in `sessionStorage`.
3. From now on, `auth.interceptor.ts` adds `Authorization: Bearer <token>` to every request.
4. If the server says **401** (token expired), the interceptor asks for a new token **once**, even if five requests failed at the same moment, and then retries each request once. If refreshing fails, you are signed out and sent to the sign-in page.

### Route guards (who can open which page)

| URL | Guard | If not allowed |
| --- | --- | --- |
| `/login` | `guestGuard` | Already signed in: go to the dashboard |
| `/applications` and below | `authGuard` | Not signed in: go to `/login` |
| `/applications/new`, `/applications/:id/edit` | `roleGuard('sales')` | Other roles: go to `/access-denied` |
| the wizard, when leaving it | `unsavedChangesGuard` | Asks first if the last save failed |

These guards use `canMatch`, so they run **before** the page's code is downloaded. A Reviewer never even downloads the wizard.

### The dashboard

- The list is paged **on the server**: each click on a page number asks for just that page.
- Search waits a moment after you stop typing, so it does not send a request per letter.
- It shows four states: loading, error with a Retry button, empty, and the list.
- On narrow screens (phones) table rows become stacked cards, so nothing is cut off.
- The navigation shows only what your role may use: for example, "New application" is for Sales only.

### The wizard and auto-save

The form has four steps: **Business**, **Contact**, **Financial** and **Review**. Each field has rules in `validators.ts`, for example a tax ID must look like `12-3456789`, and the average ticket cannot be larger than the monthly volume. Errors appear next to the field.

Auto-save (`auto-save.ts`) is a short chain of steps:

```
form changes -> wait 800 ms of quiet -> save the latest values -> show "Draft saved."
                                                          \-> if it fails: show an error + "Retry saving"
```

If saving fails, the form keeps everything you typed, the next change tries again, and you can press **Retry saving**. Leaving the page after a failed save asks for confirmation.

### Sensitive information

- Bank account and tax ID arrive **already masked** from the server (`••••••6789`). The full value is never in the page until someone allowed asks for it.
- **Reviewer** (only for an application assigned to them) and **Admin** can click Reveal. The full values are held in memory only and hidden again after **30 seconds**.
- **Sales** get a `403` even if they call the reveal endpoint by hand, because the check is on the server side, not only in the screen.
- A **Content Security Policy** (the `<meta>` tag in `src/index.html`) tells the browser to run scripts and make requests only from this app's own origin. If an attacker managed to inject a script, the browser would block it, so it could not read the revealed values or send them elsewhere.

---

## 7. Common changes, and where to make them

| I want to... | Change this |
| --- | --- |
| Add a demo user | `core/demo-users.ts`. The mock data will pick the new user up for owners or reviewers by role. |
| Change the sample business names or how many there are | the `NAMES` list in `core/mock/mock-db.ts` (reset local storage afterwards) |
| Change the colours or fonts | `src/styles/_theme.scss` and `_fonts.scss` |
| Add a field to the form | `models.ts`, the wizard `.ts` and `.html`, and `emptyValue()` in `mock-db.ts` |
| Change a validation rule | `features/applications/wizard/validators.ts` |
| Let Sales see risk history | in `mock-api.ts`, the `riskHistory:` line of `detail()`, and the `@if (d.riskHistory)` check in `application-detail.html` |
| Change the artificial delay | `latencyMs` in `core/mock/mock-api.ts` |

---

## 8. Running the tests

```bash
npm test
```

39 tests run with Vitest. They cover the token interceptor, the route guards, the validators, auto-save, the mock server's permission rules and the dashboard's states. They are a good way to see how each part is expected to behave: open any `*.spec.ts` file next to the code it tests.

---

## 9. Words you will see

| Word | Meaning |
| --- | --- |
| **Mock** | A fake stand-in. Here: a fake server. |
| **Masked** | Partly hidden, such as `••••••6789`. |
| **Bearer token** | A key sent with each request to prove who you are. |
| **Refresh token** | A second key used to get a new bearer token when the first one expires. |
| **Debounce** | Wait until something stops happening (typing) before reacting. |
| **Pagination** | Splitting a long list into pages. |
| **CSP** | Content Security Policy: browser rules about where scripts may come from. |
| **SCSS** | CSS with extras such as variables and nesting. |
| **Bootstrap** | A ready-made set of layout and component styles. |
