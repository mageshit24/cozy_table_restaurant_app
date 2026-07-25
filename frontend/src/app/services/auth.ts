import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private baseUrl = '/api/auth';

  constructor(private http: HttpClient, private router: Router) { }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  saveToken(token: string) {
    if (this.isBrowser()) localStorage.setItem('token', token);
  }

  getToken(): string | null {
    if (this.isBrowser()) return localStorage.getItem('token');
    return null;
  }

  removeToken() {
    if (this.isBrowser()) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
    }
  }

  isLoggedIn(): boolean {
    const user = this.getUserFromToken();
    if (!user) return false;
    // A token surviving in localStorage past its own `exp` claim (e.g. after
    // the 1h server-side expiry) used to still pass this check, since it only
    // tested for *presence*. That let the route guards wave a stale session
    // through client-side, even though every subsequent API call would then
    // fail with 401 anyway — confusing "why can I see the page but nothing
    // loads" behavior. Now expired tokens are treated as logged-out.
    if (typeof user.exp === 'number' && Date.now() >= user.exp * 1000) {
      this.removeToken();
      return false;
    }
    return true;
  }

  getUserFromToken(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  getUserRole(): string | null {
    return this.getUserFromToken()?.role || null;
  }

  /**
   * Logout is now synchronous — clears local state and redirects immediately.
   * The token blacklist is updated in the background (fire-and-forget).
   * This eliminates the ~200-500ms wait for the server response on every logout.
   */
  logout() {
    // Fire-and-forget: tell the backend to blacklist the token,
    // but don't block navigation on the response.
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
        error: (err) => console.warn('[auth] background logout failed:', err?.status)
      });
    }
    // Clear local state and redirect immediately — no waiting.
    this.removeToken();
    this.router.navigate(['/login']);
  }
}
