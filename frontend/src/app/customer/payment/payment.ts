import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class CustomerPayment implements OnInit {
  /** Payment method: 'card' | 'upi' | 'cod' */
  paymentMethod = 'card';

  /* Card fields */
  cardNumber  = '';
  cardHolder  = '';
  expiryDate  = '';
  cvv         = '';

  /* UPI field */
  upiId = '';

  /* State from router */
  orderId: number | null = null;
  amount: number | null  = null;

  /* UI state */
  errors: Record<string, string> = {};
  loading        = false;
  paymentSuccess = false;
  paymentError   = '';

  /** BUG FIX: true once payment succeeds – all further submissions are blocked */
  private submitted = false;

  constructor(private http: HttpClient, private router: Router) {
    const state  = history.state;
    this.orderId = state?.orderId || null;
    this.amount  = state?.amount  || null;
  }

  ngOnInit(): void {
    /* If we arrived without an orderId (e.g. user navigated directly),
       redirect back to orders so they can't submit a dangling payment. */
    if (!this.orderId) {
      this.router.navigate(['/customer/orders']);
    }
  }

  /* ── Real-time field formatters ─────────────────────────────────────────── */

  formatCard(): void {
    const digits = this.cardNumber.replace(/\D/g, '').substring(0, 16);
    this.cardNumber = digits.replace(/(.{4})(?=.)/g, '$1 ').trim();
    if (this.cardNumber) this.validateField('cardNumber');
  }

  formatExpiry(): void {
    let v = this.expiryDate.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
    this.expiryDate = v;
    if (this.expiryDate) this.validateField('expiryDate');
  }

  validateField(field: string): void {
    delete this.errors[field];
    switch (field) {
      case 'cardNumber':
        if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(this.cardNumber))
          this.errors['cardNumber'] = 'Enter a valid 16-digit card number';
        break;
      case 'cardHolder':
        if (!this.cardHolder.trim())
          this.errors['cardHolder'] = 'Cardholder name is required';
        break;
      case 'expiryDate': {
        const [mm, yy] = this.expiryDate.split('/');
        const m = Number(mm), y = Number(yy);
        if (!mm || !yy || m < 1 || m > 12)
          this.errors['expiryDate'] = 'Enter valid expiry (MM/YY)';
        else {
          const now = new Date();
          const expiry = new Date(2000 + y, m - 1);
          if (expiry < now) this.errors['expiryDate'] = 'Card has expired';
        }
        break;
      }
      case 'cvv':
        if (!/^\d{3,4}$/.test(this.cvv))
          this.errors['cvv'] = 'Enter a valid 3 or 4 digit CVV';
        break;
      case 'upiId':
        if (!this.upiId.match(/^[\w.\-]+@[\w.\-]+$/))
          this.errors['upiId'] = 'Enter a valid UPI ID (e.g. name@bank)';
        break;
    }
  }

  validate(): boolean {
    this.errors = {};
    if (this.paymentMethod === 'card') {
      this.validateField('cardNumber');
      this.validateField('cardHolder');
      this.validateField('expiryDate');
      this.validateField('cvv');
    } else if (this.paymentMethod === 'upi') {
      this.validateField('upiId');
    }
    return Object.keys(this.errors).length === 0;
  }

  processPayment(): void {
    /* BUG FIX: Idempotency guard – once payment has succeeded (or is in-flight)
       do not allow a second submission.  This prevents duplicate payments if the
       user double-clicks the button or hits it after the success screen appears. */
    if (this.submitted || this.loading || this.paymentSuccess) return;

    if (!this.validate()) return;

    this.loading      = true;
    this.paymentError = '';
    this.submitted    = true;   // lock immediately before the HTTP call

    const payload: Record<string, any> = {
      orderId: this.orderId,
      method : this.paymentMethod
    };

    if (this.paymentMethod === 'card') {
      payload['cardNumber'] = this.cardNumber.replace(/\s/g, '');
      payload['cardHolder'] = this.cardHolder;
      payload['expiryDate'] = this.expiryDate;
    } else if (this.paymentMethod === 'upi') {
      payload['upiId'] = this.upiId;
    }

    this.http.post('/api/payment', payload).subscribe({
      next: () => {
        this.loading        = false;
        this.paymentSuccess = true;
      },
      error: (err) => {
        /* On error, release the lock so the user can correct and retry */
        this.submitted    = false;
        this.loading      = false;
        this.paymentError = err.error?.message || 'Payment failed. Please try again.';
      }
    });
  }
}
