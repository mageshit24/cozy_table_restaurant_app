import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart';
import { Order, OrderService } from '../../services/order';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class CustomerOrders implements OnInit {
  orders: Order[] = [];
  loading = true;
  placing = false;
  expandedOrderId: number | null = null;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private orderService: OrderService,
    private cartService: CartService,
    private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadOrders(); }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getMyOrders().subscribe({
      next : (data) => { this.orders = data; this.loading = false;
        this.cdr.detectChanges(); },
      error: ()     => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  placeOrder(): void {
    if (this.cartService.getCart().length === 0) {
      this.showMessage('Your cart is empty. Add items before placing an order.', 'error');
      return;
    }
    this.placing = true;
    this.orderService.placeOrder().subscribe({
      next: () => {
        this.cartService.clearCart();
        this.placing = false;
        this.showMessage('Order placed successfully!', 'success');
        this.loadOrders();
      },
      error: (err) => {
        this.placing = false;
        this.showMessage(err.error?.message || 'Failed to place order.', 'error');
      }
    });
  }

  toggleOrder(id: number): void {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
  }

  proceedToPayment(order: Order): void {
    this.router.navigate(['/customer/payment'], {
      state: { orderId: order.id, amount: this.getGrandTotal(order.totalAmount) }
    });
  }

  getTax(total: number): number        { return Math.round(total * 0.05); }
  getGrandTotal(total: number): number { return total + this.getTax(total); }

  /**
   * BUG FIX: Show the Pay button ONLY when the order is still 'pending'
   * (i.e. not yet paid, not being prepared, not delivered, not cancelled).
   * Previously the button showed for all non-cancelled orders — so a
   * 'delivered' or 'preparing' order still showed "Proceed to Payment".
   */
  canPay(order: Order): boolean {
    return order.status === 'pending';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending   : 'badge-pending',
      preparing : 'badge-preparing',
      delivered : 'badge-delivered',
      cancelled : 'badge-cancelled'
    };
    return map[status?.toLowerCase()] || '';
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message     = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 4000);
  }
}
