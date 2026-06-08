/**
 * feedback.service.ts – updated to support ratingFilter param
 */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Feedback { rating: number; comment: string; }

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private api = '/api/feedback';
  constructor(private http: HttpClient) {}

  addFeedback(data: Feedback): Observable<any> {
    return this.http.post(this.api, data);
  }

  getAllFeedback(sort: string = 'desc', rating: string = ''): Observable<any[]> {
    let params = new HttpParams().set('sort', sort);
    if (rating) params = params.set('rating', rating);
    return this.http.get<any[]>(this.api, { params });
  }
}
