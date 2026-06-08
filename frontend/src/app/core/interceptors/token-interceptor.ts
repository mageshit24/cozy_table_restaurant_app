import { HttpInterceptorFn } from '@angular/common/http';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Guard against SSR / non-browser environments where localStorage doesn't exist
  const token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('token')
    : null;

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
