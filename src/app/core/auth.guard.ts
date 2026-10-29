import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

// These take no router arguments, so the same function works as `canMatch` (checked before a
// lazy feature is downloaded) and as `canActivate`.

/** Signed-in users skip the login page. */
export const guestGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  return inject(AuthService).user() ? router.createUrlTree(['/applications']) : true;
};

/** Signed-out users are sent to the login page. */
export const authGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  return inject(AuthService).user() ? true : router.createUrlTree(['/login']);
};

/** Only the listed roles may open the route; others see the access-denied page. */
export const roleGuard =
  (...allowed: Role[]) =>
  (): boolean | UrlTree => {
    const router = inject(Router);
    const role = inject(AuthService).role();
    if (!role) {
      return router.createUrlTree(['/login']);
    }
    return allowed.includes(role) ? true : router.createUrlTree(['/access-denied']);
  };
