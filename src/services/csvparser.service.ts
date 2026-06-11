import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Papa from 'papaparse';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';
import { environment } from '../environments/environment';


@Injectable({ providedIn: 'root' })
export class CsvService {
  constructor(private http: HttpClient) {}

  getCarriers(url = environment.csvPaths.carriers): Observable<CarrierRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((text: string) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          TrnspCode: this.num(r.TrnspCode),
          CarrierName: String(r.CarrierName ?? '').trim(),
          TruckType: String(r.TruckType ?? '').trim() as 'LTL' | 'TL'
        }));
      }),
      catchError((err: unknown) => throwError(() => new Error(`Failed to load carriers: ${err instanceof Error ? err.message : String(err)}`)))
    );
  }

  getQuotesActual(url = environment.csvPaths.quotesActual): Observable<QuoteActualRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((text: string) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          quoteDate: this.date(r['Quote Date']),
          carrier: this.num(r['Carrier']),
          weight: this.num(r['Weight']),
          quote: this.num(r['Quote']),
          amount: this.num(r['Amount'])
        }));
      }),
      catchError((err: unknown) => throwError(() => new Error(`Failed to load quotes: ${err instanceof Error ? err.message : String(err)}`)))
    );
  }

  getDeliveries(url = environment.csvPaths.deliveries): Observable<DeliveryRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((text: string) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          carrier: this.num(r['carrier']),
          pickup: this.date(r['pickup']),
          delivery: this.date(r['delivery']),
          expected_delivery: this.date(r['expected_delivery'])
        }));
      }),
      catchError((err: unknown) => throwError(() => new Error(`Failed to load deliveries: ${err instanceof Error ? err.message : String(err)}`)))
    );
  }

  private num(v: any): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  private date(v: any): Date {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
}
