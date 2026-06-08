import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface MenuItem {
  id:          number;
  name:        string;
  price:       number;
  description: string;
  category?:   string;
  image?:      string;    // raw filename stored in DB
  imageUrl?:   string;    // fully-resolved URL returned by backend
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private api = '/api/menu';

  constructor(private http: HttpClient) {}

  getMenu(search?: string, category?: string): Observable<MenuItem[]> {
    let params = new HttpParams();
    if (search)   params = params.set('search', search);
    if (category) params = params.set('category', category);
    return this.http.get<MenuItem[]>(this.api, { params });
  }

  addMenu(formData: FormData): Observable<any> {
    return this.http.post(this.api, formData);
  }

  updateMenu(id: number, formData: FormData | object): Observable<any> {
    if (formData instanceof FormData)
      return this.http.put(`${this.api}/${id}`, formData);
    return this.http.put(`${this.api}/${id}`, formData);
  }

  deleteMenu(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
