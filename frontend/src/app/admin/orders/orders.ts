import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderService } from '../../services/order';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class AdminOrders implements OnInit {
  orders: Order[] = [];
  loading = true;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(private orderService: OrderService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.orderService.getMyOrders().subscribe({
      next : (data: Order[]) => { this.orders = data; this.loading = false;
        this.cdr.detectChanges(); },
      error: ()              => { this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  /** Returns the statuses an admin may move this order to (empty = terminal) */
  allowedNextStatuses(order: Order): string[] {
    return ALLOWED_TRANSITIONS[order.status?.toLowerCase()] || [];
  }

  /** True if the order is in a terminal state and the dropdown should be locked */
  isTerminal(order: Order): boolean {
    return this.allowedNextStatuses(order).length === 0;
  }

  updateStatus(order: Order, status: string): void {
    if (!status || status === order.status) return;

    /* Client-side guard mirrors the backend state-machine */
    if (this.isTerminal(order)) {
      this.showMessage(`Order #${order.id} is '${order.status}' and cannot be changed.`, 'error');
      return;
    }

    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;
        this.showMessage(`Order #${order.id} updated to '${status}'.`, 'success');
      },
      error: (err) => {
        this.showMessage(err.error?.message || 'Failed to update status.', 'error');
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:   'status-pending',
      preparing: 'status-preparing',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return map[status?.toLowerCase()] || '';
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message     = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 5000);
  }
}
