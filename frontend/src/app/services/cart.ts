import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MenuItem } from './menu';

export interface CartItem extends MenuItem {
  quantity: number;
  cartId?: number;   // DB Cart row id — needed for update/delete
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly API = '/api/cart';

  // In-memory cart — kept in sync with backend
  private cart: CartItem[] = [];

  constructor(private http: HttpClient) {}

  // ── Backend sync helpers ─────────────────────────────────────────────────

  /** Load cart from backend (call on Cart page / order placement) */
  loadCartFromServer(): Observable<any[]> {
    return this.http.get<any[]>(this.API).pipe(
      tap(items => {
        this.cart = items.map(i => ({
          id:          i.Menu?.id    ?? i.menuId,
          name:        i.Menu?.name  ?? '',
          price:       i.Menu?.price ?? 0,
          description: i.Menu?.description ?? '',
          category:    i.Menu?.category,
          image:       i.Menu?.image,
          imageUrl:    i.Menu?.imageUrl,
          quantity:    i.quantity,
          cartId:      i.id          // DB row id
        }));
      }),
      catchError(() => of([]))
    );
  }

  /** Push a new item (or increment) to backend */
  addToCart(item: MenuItem): void {
    // Optimistic local update
    const existing = this.cart.find(i => i.id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ ...item, quantity: 1 });
    }

    // Sync to backend
    this.http.post(this.API, { menuId: item.id, quantity: 1 })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /** Update quantity on backend */
  updateQuantityOnServer(cartId: number, quantity: number): Observable<any> {
    return this.http.put(`${this.API}/${cartId}`, { quantity });
  }

  /** Remove one item from backend */
  removeFromServer(cartId: number): Observable<any> {
    return this.http.delete(`${this.API}/${cartId}`);
  }

  /** Clear entire cart on backend */
  clearCartOnServer(): Observable<any> {
    return this.http.delete(`${this.API}/clear`).pipe(catchError(() => of(null)));
  }

  // ── Local helpers (used by CartComponent for display) ───────────────────

  getCart(): CartItem[]  { return this.cart; }

  increaseQuantity(id: number): void {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    item.quantity++;
    if (item.cartId) this.updateQuantityOnServer(item.cartId, item.quantity).subscribe();
  }

  decreaseQuantity(id: number): void {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    if (item.quantity > 1) {
      item.quantity--;
      if (item.cartId) this.updateQuantityOnServer(item.cartId, item.quantity).subscribe();
    }
  }

  removeItem(id: number): void {
    const item = this.cart.find(i => i.id === id);
    if (item?.cartId) this.removeFromServer(item.cartId).subscribe();
    this.cart = this.cart.filter(i => i.id !== id);
  }

  clearCart(): void {
    this.cart = [];
    this.clearCartOnServer().subscribe();
  }

  getTotal(): number {
    return this.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }
}
