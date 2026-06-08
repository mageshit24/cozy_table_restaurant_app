import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: number;
  name?: string;
  email?: string;
}

export interface Reservation {
  id: number;
  date: string;
  time: string;
  guests: number;
  status: string;

  userId?: number;

  User?: User;
}

export interface CreateReservation {
  date: string;
  time: string;
  guests: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  private apiUrl = '/api/reservations';

  constructor(private http: HttpClient) {}

  /* =========================
     CREATE RESERVATION
  ========================= */

  createReservation(data: CreateReservation): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  /* =========================
     GET MY RESERVATIONS
  ========================= */

  getMyReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/my`);
  }

  /* =========================
     GET ALL RESERVATIONS
  ========================= */

  getAllReservations(
    status?: string,
    date?: string
  ): Observable<any> {

    let params = new HttpParams();

    if (status) {
      params = params.set('status', status);
    }

    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  /* =========================
     CHECK AVAILABILITY
  ========================= */

  checkAvailability(data: {
    date: string;
    time: string;
  }): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/check`,
      data
    );
  }

  /* =========================
     UPDATE RESERVATION
  ========================= */

  updateReservation(
    id: number,
    data: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  /* =========================
     UPDATE STATUS
  ========================= */

  updateReservationStatus(
    id: number,
    status: string
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      { status }
    );
  }

  /* =========================
     DELETE RESERVATION
  ========================= */

  deleteReservation(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }
}