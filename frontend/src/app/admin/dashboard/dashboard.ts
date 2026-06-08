import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { interval, startWith, Subscription, switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard implements OnInit, OnDestroy {

  totalOrders       = 0;
  totalReservations = 0;
  totalFeedback     = 0;
  totalUsers        = 0;
  totalRevenue      = '0.00';

  /** BUG FIX: loading starts true but is ALWAYS set to false in both
   *  next and error paths — it can never get stuck on "Refreshing..." */
  loading     = true;
  loadError   = false;          // shown when the API call fails
  lastUpdated: Date | null = null;

  private pollSub!: Subscription;
  private readonly POLL_INTERVAL = 30_000; // 30 s

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.pollSub = interval(this.POLL_INTERVAL)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http.get<any>('/api/admin/stats').pipe(
            // catchError inside switchMap keeps the outer stream alive
            // so polling continues even after a failed request
            catchError(err => {
              console.error('[dashboard] stats error:', err?.status, err?.message);
              return of(null);   // null signals a failed fetch
            })
          )
        )
      )
      .subscribe(res => {
        this.loading = false;
        this.cdr.detectChanges();          // ALWAYS cleared — no more infinite spinner

        if (res === null) {
          // API returned an error — show error state, keep previous counts
          this.loadError = true;
          return;
        }

        this.loadError        = false;
        this.totalOrders      = res.totalOrders      ?? 0;
        this.totalReservations= res.totalReservations?? 0;
        this.totalFeedback    = res.totalFeedback    ?? 0;
        this.totalUsers       = res.totalUsers       ?? 0;
        this.totalRevenue     = res.totalRevenue     ?? '0.00';
        this.lastUpdated      = new Date();
      });
  }

  /** Manual refresh */
  refresh(): void {
    this.loading   = true;
    this.loadError = false;
    this.http.get<any>('/api/admin/stats').subscribe({
      next: (res) => {
        this.totalOrders       = res.totalOrders       ?? 0;
        this.totalReservations = res.totalReservations ?? 0;
        this.totalFeedback     = res.totalFeedback     ?? 0;
        this.totalUsers        = res.totalUsers        ?? 0;
        this.totalRevenue      = res.totalRevenue      ?? '0.00';
        this.loading           = false;
        this.cdr.detectChanges();
        this.lastUpdated       = new Date();
      },
      error: (err) => {
        console.error('[dashboard] manual refresh error:', err?.status);
        this.loading   = false;
        this.cdr.detectChanges();
        this.loadError = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
