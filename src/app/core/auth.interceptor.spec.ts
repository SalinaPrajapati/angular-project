import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

const SESSION_KEY = 'angular-app.session';
const refreshed = { accessToken: 'new-token', refreshToken: 'refresh-2' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        user: { id: 'u-sales-1', name: 'Sam', role: 'sales' },
        accessToken: 'old-token',
        refreshToken: 'refresh-1',
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    controller.verify();
    sessionStorage.clear();
  });

  const unauthorized = { status: 401, statusText: 'Unauthorized' };

  it('adds the bearer token', () => {
    http.get('/api/applications').subscribe();
    const req = controller.expectOne('/api/applications');
    expect(req.request.headers.get('Authorization')).toBe('Bearer old-token');
    req.flush([]);
  });

  it('does not add a token to the auth endpoints', () => {
    http.post('/api/auth/login', {}).subscribe();
    const req = controller.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes once when several requests get a 401 together, then retries each', () => {
    const results: unknown[] = [];
    http.get('/api/a').subscribe((r) => results.push(r));
    http.get('/api/b').subscribe((r) => results.push(r));

    controller.expectOne('/api/a').flush({}, unauthorized);
    controller.expectOne('/api/b').flush({}, unauthorized);

    // expectOne throws if the interceptor had started a second refresh.
    controller.expectOne('/api/auth/refresh').flush(refreshed);

    const retryA = controller.expectOne('/api/a');
    const retryB = controller.expectOne('/api/b');
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryA.flush('a');
    retryB.flush('b');

    expect(results).toEqual(['a', 'b']);
    expect(auth.accessToken()).toBe('new-token');
  });

  it('retries with the current token, without refreshing again, when the token was already replaced', () => {
    http.get('/api/a').subscribe();
    http.get('/api/b').subscribe();

    controller.expectOne('/api/a').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush(refreshed);
    controller.expectOne('/api/a').flush('a');

    // B was sent with the old token and only now comes back as 401.
    controller.expectOne('/api/b').flush({}, unauthorized);
    controller.expectNone('/api/auth/refresh');
    const retryB = controller.expectOne('/api/b');
    expect(retryB.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryB.flush('b');
  });

  it('retries only once: a second 401 is returned to the caller', () => {
    let status = 0;
    http.get('/api/a').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/a').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush(refreshed);
    controller.expectOne('/api/a').flush({}, unauthorized);

    controller.expectNone('/api/auth/refresh');
    expect(status).toBe(401);
  });

  it('signs out and goes to the login page when the refresh fails', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    let status = 0;
    http.get('/api/a').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/a').flush({}, unauthorized);
    controller.expectOne('/api/auth/refresh').flush({}, unauthorized);

    expect(status).toBe(401);
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('does not refresh for errors other than 401', () => {
    let status = 0;
    http.get('/api/a').subscribe({ error: (e) => (status = e.status) });
    controller.expectOne('/api/a').flush({}, { status: 500, statusText: 'Server Error' });
    controller.expectNone('/api/auth/refresh');
    expect(status).toBe(500);
  });
});
