import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const withToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

/**
 * Adds the bearer token. When a request gets a 401 it refreshes the token and retries
 * that request once. Requests that fail together share one refresh call, and a request
 * that was sent with an already-replaced token is simply retried with the new one.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const sentWith = auth.accessToken();
  if (!sentWith) {
    return next(req);
  }

  return next(withToken(req, sentWith)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const current = auth.accessToken();
      if (current && current !== sentWith) {
        // Another request already refreshed the token while this one was in flight.
        return next(withToken(req, current));
      }

      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          void router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
        switchMap((token) => next(withToken(req, token))),
      );
    }),
  );
};
