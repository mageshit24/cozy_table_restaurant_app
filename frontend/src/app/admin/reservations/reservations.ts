import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationService } from '../../services/reservation';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class AdminReservations implements OnInit {

  reservations: Reservation[] = [];

  loading = true;
  error = '';

  /* Filters */
  filterStatus = '';
  filterDate = '';

  /* Track original status */
  originalStatus: Record<number, string> = {};

  constructor(
    private reservationService: ReservationService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  /* =========================
     LOAD RESERVATIONS
  ========================= */

  loadReservations(): void {

    this.loading = true;
    this.error = '';

    this.reservationService
      .getAllReservations(
        this.filterStatus || undefined,
        this.filterDate || undefined
      )
      .subscribe({

        next: (data: Reservation[]) => {

  console.log('Reservations:', data);

  this.reservations = data || [];

  this.originalStatus = {};

  this.reservations.forEach(r => {
    this.originalStatus[r.id] = r.status;
  });

  this.loading = false;
        this.cdr.detectChanges();
},

        error: (err: any) => {

          console.error(err);

          this.error =
            err.error?.message ||
            'Failed to load reservations';

          this.loading = false;
        this.cdr.detectChanges();
        }
      });
  }

  /* =========================
     APPLY FILTERS
  ========================= */

  applyFilters(): void {
    this.loadReservations();
  }

  clearFilters(): void {

    this.filterStatus = '';
    this.filterDate = '';

    this.loadReservations();
  }

  /* =========================
     UPDATE STATUS
  ========================= */

  updateStatus(reservation: Reservation): void {

    if (!reservation.id) return;

    this.reservationService
      .updateReservationStatus(
        reservation.id,
        reservation.status
      )
      .subscribe({

        next: () => {

          this.originalStatus[reservation.id] =
            reservation.status;

          alert('Status updated successfully');
        },

        error: (err) => {

          console.error(err);

          alert(
            err.error?.message ||
            'Failed to update status'
          );
        }
      });
  }

  /* =========================
     DELETE RESERVATION
  ========================= */

  deleteReservation(id: number): void {

    if (!confirm(
      'Are you sure you want to delete this reservation?'
    )) {
      return;
    }

    this.reservationService
      .deleteReservation(id)
      .subscribe({

        next: () => {

          this.reservations =
            this.reservations.filter(
              r => r.id !== id
            );

          alert('Reservation deleted');
        },

        error: (err) => {

          console.error(err);

          alert(
            err.error?.message ||
            'Failed to delete reservation'
          );
        }
      });
  }

  /* =========================
     DIRTY CHECK
  ========================= */

  isDirty(reservation: Reservation): boolean {

    return (
      reservation.status !==
      this.originalStatus[reservation.id]
    );
  }

  /* =========================
     STATUS CLASS
  ========================= */

  getStatusClass(status: string): string {

    const map: Record<string, string> = {

      pending: 'status-pending',

      confirmed: 'status-confirmed',

      cancelled: 'status-cancelled',

      approved: 'status-approved',

      rejected: 'status-rejected'
    };

    return 'status ' +
      (map[status?.toLowerCase()] ?? '');
  }
}
