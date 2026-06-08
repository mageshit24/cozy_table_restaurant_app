import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
// Make sure 'Reservation' data interface is imported from your service here
import { CreateReservation, ReservationService, Reservation } from '../../services/reservation';

@Component({
  selector: 'app-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation.html',
  styleUrl: './reservation.css',
})
export class ReservationComponent implements OnInit { // <-- Changed from Reservation to ReservationComponent
  reservations: Reservation[] = []; // <-- Now this correctly references the imported service interface!
  loading = true;
  errorMsg = '';
  successMsg = '';

  // Availability state
  availabilityChecked = false;
  isAvailable: boolean | null = null;
  checkingAvailability = false;

  // Edit snapshot — keeps a copy of the row being edited
  editingId: number | null = null;
  editSnapshot: Partial<Reservation> = {};

  newReservation: CreateReservation = { date: '', time: '', guests: 1 };
  id: number | null = null;
  date: any;
  time: any;
  guests: any;

  constructor(private reservationService: ReservationService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadMyReservations();
  }

  // ── Load ────────────────────────────────────────────────────────────────
  loadMyReservations(): void {
    this.loading = true;
    this.reservationService.getMyReservations().subscribe({
      next: data => { this.reservations = data; this.loading = false;
        this.cdr.detectChanges(); },
      error: ()   => { this.errorMsg = 'Could not load reservations.'; this.loading = false;
        this.cdr.detectChanges(); }
    });
  }

  // ── Validation ──────────────────────────────────────────────────────────
  isFormValid(): boolean {
    return !!(this.newReservation.date && this.newReservation.time && this.newReservation.guests >= 1);
  }

  // ── Availability ────────────────────────────────────────────────────────
  checkAvailability(): void {
    if (!this.isFormValid()) { this.errorMsg = 'Please fill all fields.'; return; }
    this.errorMsg = '';
    this.checkingAvailability = true;
    this.availabilityChecked  = false;
    this.reservationService.checkAvailability(this.newReservation).subscribe({
      next: (res: any) => {
        this.availabilityChecked  = true;
        this.isAvailable          = res.available;
        this.checkingAvailability = false;
      },
      error: () => {
        this.availabilityChecked  = true;
        this.isAvailable          = false;
        this.checkingAvailability = false;
      }
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────
  createReservation(): void {
    if (!this.isFormValid())                  { this.errorMsg = 'All fields are required.'; return; }
    if (!this.availabilityChecked)            { this.errorMsg = 'Please check availability first.'; return; }
    if (!this.isAvailable)                    { this.errorMsg = 'This slot is not available.'; return; }

    this.reservationService.createReservation(this.newReservation).subscribe({
      next: () => {
        this.successMsg = 'Reservation created successfully!';
        this.resetForm();
        this.loadMyReservations();
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message ?? 'Failed to create reservation.';
      }
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  startEdit(res: Reservation): void {
    this.editingId    = res.id;
    // deep-copy relevant fields
    this.editSnapshot = { date: res.date, time: res.time, guests: res.guests };
  }

  saveEdit(res: Reservation): void {
    this.reservationService.updateReservation(res.id, {
      date: res.date, time: res.time, guests: res.guests
    }).subscribe({
      next: () => {
        this.successMsg = 'Reservation updated.';
        this.editingId  = null;
        this.loadMyReservations();
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message ?? 'Failed to update reservation.';
      }
    });
  }

  cancelEdit(res: Reservation): void {
    // restore snapshot
    res.date   = this.editSnapshot.date   as string;
    res.time   = this.editSnapshot.time   as string;
    res.guests = this.editSnapshot.guests as number;
    this.editingId = null;
  }

  // ── Cancel / Delete ─────────────────────────────────────────────────────
  cancelReservation(id: number): void {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    this.reservationService.deleteReservation(id).subscribe({
      next: () => {
        this.successMsg  = 'Reservation cancelled.';
        this.reservations = this.reservations.filter(r => r.id !== id);
      },
      error: () => { this.errorMsg = 'Failed to cancel reservation.'; }
    });
  }

  // ── Reset ───────────────────────────────────────────────────────────────
  resetForm(): void {
    this.newReservation    = { date: '', time: '', guests: 1 };
    this.availabilityChecked = false;
    this.isAvailable         = null;
    this.errorMsg            = '';
  }

  clearMessages(): void {
    this.errorMsg   = '';
    this.successMsg = '';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:   'status-pending',
      confirmed: 'status-approved',
      cancelled: 'status-rejected'
    };
    return 'status ' + (map[status?.toLowerCase()] ?? '');
  }
}