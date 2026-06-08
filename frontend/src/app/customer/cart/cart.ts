import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CartItem, CartService } from '../../services/cart';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CustomerCart implements OnInit {

  cartItems: CartItem[] = [];
  loading  = true;
  placing  = false;
  message  = '';
  msgType: 'success' | 'error' = 'success';

  constructor(
    private cartService:  CartService,
    private orderService: OrderService,
    private router:       Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Always load fresh from server so backend Cart table is the source of truth
    this.cartService.loadCartFromServer().subscribe({
      next:  ()  => { this.cartItems = this.cartService.getCart(); this.loading = false;
        this.cdr.detectChanges(); },
      error: ()  => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  refresh(): void { this.cartItems = this.cartService.getCart(); }

  increase(id: number): void  { this.cartService.increaseQuantity(id); this.refresh(); }
  decrease(id: number): void  { this.cartService.decreaseQuantity(id); this.refresh(); }
  remove(id: number):   void  { this.cartService.removeItem(id);       this.refresh(); }

  getTotal(): number { return this.cartService.getTotal(); }
  getTax():   number { return Math.round(this.getTotal() * 0.05); }
  getGrand(): number { return this.getTotal() + this.getTax(); }

  clearCart(): void {
    this.cartService.clearCart();
    this.cartItems = [];
  }

  placeOrder(): void {
    if (this.cartItems.length === 0) {
      this.showMsg('Your cart is empty.', 'error');
      return;
    }
    this.placing = true;
    this.orderService.placeOrder().subscribe({
      next: (res: any) => {
        this.placing = false;
        this.cartService.clearCart();
        this.cartItems = [];
        this.showMsg('Order placed successfully! Redirecting…', 'success');
        setTimeout(() => this.router.navigate(['/customer/orders']), 1800);
      },
      error: (err: any) => {
        this.placing = false;
        this.showMsg(err?.error?.message ?? 'Failed to place order. Please try again.', 'error');
      }
    });
  }

  private showMsg(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.msgType = type;
    setTimeout(() => this.message = '', 4000);
  }

  getImageUrl(item: CartItem): string {
    if (item.imageUrl) return item.imageUrl;
    if (item.image)    return `/uploads/${item.image}`;
    return 'https://placehold.co/60x60/f5f5f7/6b7280?text=🍽';
  }
}
