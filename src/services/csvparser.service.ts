import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import Papa from 'papaparse';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface CarrierRow {
  TrnspCode: number;
  CarrierName: string;
  TruckType: 'LTL' | 'TL';
}

export interface QuoteActualRow {
  quoteDate: Date;
  carrier: number;
  weight: number;
  quote: number;
  amount: number;
}

export interface DeliveryRow {
  carrier: number;
  pickup: Date;
  delivery: Date;
  expected_delivery: Date;
}

@Injectable({ providedIn: 'root' })
export class CsvService {
  constructor(private http: HttpClient) {}

  getCarriers(url = '/data/raw/Carriers.csv'): Observable<CarrierRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(text => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          TrnspCode: this.num(r.TrnspCode),
          CarrierName: String(r.CarrierName ?? '').trim(),
          TruckType: String(r.TruckType ?? '').trim() as 'LTL' | 'TL'
        }));
      })
    );
  }

  getQuotesActual(url = '/data/raw/QUOTESvsACTUAL.csv'): Observable<QuoteActualRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(text => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          quoteDate: this.date(r['Quote Date']),
          carrier: this.num(r['Carrier']),
          weight: this.num(r['Weight']),
          quote: this.num(r['Quote']),
          amount: this.num(r['Amount'])
        }));
      })
    );
  }

  getDeliveries(url = '/data/raw/deliveries.csv'): Observable<DeliveryRow[]> {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map(text => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return (parsed.data as any[]).map(r => ({
          carrier: this.num(r['carrier']),
          pickup: this.date(r['pickup']),
          delivery: this.date(r['delivery']),
          expected_delivery: this.date(r['expected_delivery'])
        }));
      })
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
