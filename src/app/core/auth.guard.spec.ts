import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { Role } from './models';
import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('route guards', () => {
  function setup(role: Role | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { role: () => role, user: () => (role ? { id: 'u', name: 'U', role } : null) },
        },
      ],
    });
    const router = TestBed.inject(Router);
    const run = (guard: () => boolean | UrlTree) => {
      const result = TestBed.runInInjectionContext(guard);
      return result instanceof UrlTree ? router.serializeUrl(result) : result;
    };
    return run;
  }

  it('authGuard lets signed-in users through and sends others to /login', () => {
    expect(setup('sales')(authGuard)).toBe(true);
    TestBed.resetTestingModule();
    expect(setup(null)(authGuard)).toBe('/login');
  });

  it('guestGuard sends signed-in users to the applications page', () => {
    expect(setup('admin')(guestGuard)).toBe('/applications');
    TestBed.resetTestingModule();
    expect(setup(null)(guestGuard)).toBe(true);
  });

  it('roleGuard allows the listed roles, redirects others to access denied, and signed-out users to login', () => {
    expect(setup('sales')(roleGuard('sales'))).toBe(true);
    TestBed.resetTestingModule();
    expect(setup('reviewer')(roleGuard('sales'))).toBe('/access-denied');
    TestBed.resetTestingModule();
    expect(setup('admin')(roleGuard('reviewer', 'admin'))).toBe(true);
    TestBed.resetTestingModule();
    expect(setup(null)(roleGuard('sales'))).toBe('/login');
  });
});

describe('unsavedChangesGuard', () => {
  const run = (hasUnsaved: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({ hasUnsavedChanges: () => hasUnsaved }, null!, null!, null!),
    );

  afterEach(() => vi.restoreAllMocks());

  it('lets the user leave when everything is saved, without asking', () => {
    const confirm = vi.spyOn(globalThis, 'confirm');
    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    expect(run(true)).toBe(false);
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    expect(run(true)).toBe(true);
  });
});
