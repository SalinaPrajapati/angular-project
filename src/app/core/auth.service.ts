import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { Session, Tokens, User } from './models';

const STORAGE_KEY = 'angular-app.session';

/**
 * Holds the signed-in user and tokens. The session is kept in sessionStorage so a reload
 * keeps you signed in for the tab; there is no real backend (see the mock API).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<Session | null>(this.restore());
  private refreshInFlight$?: Observable<string>;

  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly role = computed(() => this.user()?.role ?? null);

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  login(userId: string): Observable<User> {
    return this.http.post<Session>('/api/auth/login', { userId }).pipe(
      tap((session) => this.setSession(session)),
      map((session) => session.user),
    );
  }

  /**
   * Gets a new access token. Callers that need one at the same time (for example several
   * requests that all got a 401) share a single POST /api/auth/refresh.
   */
  refresh(): Observable<string> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No session to refresh'));
    }
    this.refreshInFlight$ ??= this.http.post<Tokens>('/api/auth/refresh', { refreshToken }).pipe(
      tap((tokens) => this.updateTokens(tokens)),
      map((tokens) => tokens.accessToken),
      catchError((error: unknown) => {
        this.signOut();
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight$ = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight$;
  }

  signOut(): void {
    this.setSession(null);
  }

  private updateTokens(tokens: Tokens): void {
    const current = this.session();
    if (current) {
      this.setSession({ ...current, ...tokens });
    }
  }

  private setSession(session: Session | null): void {
    this.session.set(session);
    try {
      if (session) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode); the session then lasts until reload.
    }
  }

  private restore(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
}
