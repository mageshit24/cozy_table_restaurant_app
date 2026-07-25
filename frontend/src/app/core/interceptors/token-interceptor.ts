import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Guard against SSR / non-browser environments where localStorage doesn't exist
  const token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('token')
    : null;

  const router = inject(Router);

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err) => {
      // A 401 here means the token was missing, expired, or blacklisted —
      // the route guard already checks expiry up front (see AuthService.
      // isLoggedIn), but a token can still go stale *during* an active
      // session (server-side expiry, or logout in another tab). Previously
      // nothing caught this: the request just failed and the user was left
      // on a page where data silently never loaded, with no indication they
      // needed to log back in.
      if (err.status === 401 && typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
