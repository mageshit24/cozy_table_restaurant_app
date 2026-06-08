/**
 * order.service.ts – fix: removed duplicate Order interface declaration
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface OrderItem {
  quantity: number;
  price:    number;
  Menu?:    { name: string; price: number };
}

export interface Order {
  id:          number;
  totalAmount: number;
  status:      string;
  createdAt:   string;
  UserId?:     number;
  OrderItems?: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = '/api/orders';
  constructor(private http: HttpClient) {}

  getMyOrders(): Observable<Order[]>              { return this.http.get<Order[]>(this.api); }
  placeOrder(): Observable<any>                   { return this.http.post(this.api, {}); }
  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.api}/${id}/status`, { status });
  }
}
