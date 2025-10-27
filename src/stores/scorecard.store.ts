import { Injectable, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CsvService } from '../services/csvparser.service';
import { ScorecardService } from '../services/scorecard.service';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';
import { CarrierScoreMetrics } from '../models/scorecard';

@Injectable({ providedIn: 'root' })
export class ScorecardStore {
  // raw csv data loaded from csc parser service
  readonly carriers = signal<CarrierRow[]>([]);
  readonly quotes = signal<QuoteActualRow[]>([]);
  readonly deliveries = signal<DeliveryRow[]>([]);

  // ui state for loading/error
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // aggregated metrics(per carrier)
  readonly scorecard = signal<CarrierScoreMetrics[]>([]);

  // Filters/selection shared accross dashboard panels.
  readonly selectedCarrierId = signal<number | null>(null);
  readonly selectedType = signal<'ALL' | 'LTL' | 'TL'>('ALL');

  // Derived lists with LTL/TL/ALL selection for overview
  // Now recomputed from date-filtered rows so the overview reflects the timeline.
  readonly filteredScorecard = computed(() => {
    const type = this.selectedType();

    // Date-only filtering (ignore carrier selection so overview always shows all carriers)
    const from = this.dateFrom();
    const to = this.dateTo();
    const quotesInRange = this.quotes().filter(q => this.inRange(q.quoteDate, from, to));
    const deliveriesInRange = this.deliveries().filter(d => this.inRange(d.delivery, from, to));

    const metrics = this.svc.computeScorecard(this.carriers(), quotesInRange, deliveriesInRange);
    return type === 'ALL' ? metrics : metrics.filter(x => x.truckType === type);
  });

  // Global date filter (applies to all charts)
  readonly dateFrom = signal<Date | null>(null);  // inclusive (UTC day)
  readonly dateTo   = signal<Date | null>(null);  // inclusive (UTC day)

  setDatePreset(preset: 'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM') {
    if (preset === 'ALL' || preset === 'CUSTOM') {
      if (preset === 'ALL') { this.dateFrom.set(null); this.dateTo.set(null); }
      return;
    }
    const now = new Date();
    const to = this.utcDay(now);
    let from = to;
    if (preset === 'TODAY') from = to;
    if (preset === '7D')    from = this.addUtcDays(to, -6);  // last 7 days inclusive
    if (preset === '30D')   from = this.addUtcDays(to, -29); // last 30 days inclusive
    this.dateFrom.set(from);
    this.dateTo.set(to);
  }
  setDateRange(from: Date | null, to: Date | null) {
    this.dateFrom.set(from ? this.utcDay(from) : null);
    this.dateTo.set(to ? this.utcDay(to) : null);
  }

  // Quotes/Deliveries filtered by carrier selection AND date range
  readonly filteredQuotes = computed(() => {
    const id = this.selectedCarrierId();
    const from = this.dateFrom();
    const to = this.dateTo();
    const q = this.quotes();
    return q.filter(x => {
      if (id != null && x.carrier !== id) return false;
      return this.inRange(x.quoteDate, from, to);
    });
  });

  readonly filteredDeliveries = computed(() => {
    const id = this.selectedCarrierId();
    const from = this.dateFrom();
    const to = this.dateTo();
    const d = this.deliveries();
    return d.filter(x => {
      if (id != null && x.carrier !== id) return false;
      // Use delivery date for service/shipments views
      return this.inRange(x.delivery, from, to);
    });
  });

  // Chart-ready series (Google Charts expects 2D Array with header row: [header..., ...rows])
   // 1) Cost per day - line chart
  //  x axis: date
  //  y series: daily totals for quote amount, actual amount, and delta (amount - quote)
  //  tooltip on delta point shows the average delta for that day
  readonly costDeltaDailySeries = computed(() => {
    const rows = this.filteredQuotes();

    // group by YYYY-MM-DD for daily totals
    const byDay = new Map<string, { sumQuote: number; sumAmount: number; n: number }>();
    for (const r of rows) {
      const day = this.dayKey(r.quoteDate);
      const g = byDay.get(day) ?? { sumQuote: 0, sumAmount: 0, n: 0 };
      g.sumQuote += r.quote;
      g.sumAmount += r.amount;
      g.n += 1;
      byDay.set(day, g);
    }

    type Cell = number | { v: number; f?: string };
    const data: (string | Date | Cell)[][] = [
      ['Date', 'Quote', 'Actual', 'Delta']
    ];
    const sortedDays = Array.from(byDay.keys()).sort();

    for (const day of sortedDays) {
      const g = byDay.get(day)!;
      const sumQuote = +(g.sumQuote).toFixed(2);
      const sumAmount = +(g.sumAmount).toFixed(2);
      const deltaRaw = g.sumAmount - g.sumQuote;
      const delta = +deltaRaw.toFixed(2);
      const avgDelta = g.n ? deltaRaw / g.n : 0;

      // Put the average in the formatted string so it shows in the tooltip for the delta series
      data.push([
        new Date(day),
        sumQuote,
        sumAmount,
        { v: delta, f: `${delta.toFixed(2)} (avg: ${avgDelta.toFixed(2)})` }
      ]);
    }
    return data;
  });

  // Optional convenience lists used by templates
  readonly ltl = computed(() => this.scorecard().filter(x => x.truckType === 'LTL'));
  readonly tl  = computed(() => this.scorecard().filter(x => x.truckType === 'TL'));


    // 2) Service delta days per day
  // x axis: delivery date by day
  // y axis: daily totals: expected days, actual days, and delta (actual - expected)
  // tooltip on delta point shows the average delta for that day
  readonly serviceDeltaDailySeries = computed(() => {
    const rows = this.filteredDeliveries();
    const byDay = new Map<string, { sumExpected: number; sumActual: number; n: number }>();
    const dayMs = 86_400_000;
    for (const r of rows) {
      const day = this.dayKey(r.delivery);
      const actual = (r.delivery.getTime() - r.pickup.getTime()) / dayMs;
      const expected = (r.expected_delivery.getTime() - r.pickup.getTime()) / dayMs;
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) continue;

      const g = byDay.get(day) ?? { sumExpected: 0, sumActual: 0, n: 0 };
      g.sumExpected += expected;
      g.sumActual += actual;
      g.n += 1;
      byDay.set(day, g);
    }

    type Cell = number | { v: number; f?: string };
    const data: (Date | Cell)[][] = [];
    const sortedDays = Array.from(byDay.keys()).sort();

    for (const day of sortedDays) {
      const g = byDay.get(day)!;
      const sumExpected = +g.sumExpected.toFixed(2);
      const sumActual = +g.sumActual.toFixed(2);
      const deltaRaw = g.sumActual - g.sumExpected;
      const delta = +deltaRaw.toFixed(2);
      const avgDelta = g.n ? deltaRaw / g.n : 0;

      data.push([
        new Date(day),
        sumExpected,
        sumActual,
        { v: delta, f: `${delta.toFixed(2)} (avg: ${avgDelta.toFixed(2)})` }
      ]);
    }
    return data;
  });

  // 3) Shipments series (overview now respects date filter)
  readonly shipmentsSeries = computed(() => {
    const id = this.selectedCarrierId();
    if (id == null) {
      // Overview: shipments per carrier from date-filtered deliveries
      const byCarrier = new Map<number, number>();
      for (const r of this.filteredDeliveries()) {
        byCarrier.set(r.carrier, (byCarrier.get(r.carrier) ?? 0) + 1);
      }
      const keys = Array.from(byCarrier.keys()).sort((a, b) => a - b);
      return keys.map(k => [k, byCarrier.get(k)!]) as (string | number)[][];
    } else {
      // Carrier mode: shipments per ISO week (date filtered already)
      const rows = this.filteredDeliveries();
      const byWeek = new Map<string, number>();
      for (const r of rows) {
        const wk = this.weekKey(r.delivery);
        byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
      }
      const keys = Array.from(byWeek.keys()).sort();
      return keys.map(k => [new Date(k), byWeek.get(k)!]) as (Date | number)[][];
    }
  });

  // 4) Weight series (overview now uses filtered quotes)
  readonly weightSeries = computed(() => {
    const id = this.selectedCarrierId();
    if (id == null) {
      const byCarrier = new Map<number, number>();
      for (const q of this.filteredQuotes()) {
        byCarrier.set(q.carrier, (byCarrier.get(q.carrier) ?? 0) + (Number.isFinite(q.weight) ? q.weight : 0));
      }
      const keys = Array.from(byCarrier.keys()).sort((a, b) => a - b);
      return keys.map(k => [k, Math.round(byCarrier.get(k)!)]) as (number | string)[][];
    } else {
      const rows = this.filteredQuotes();
      const byDay = new Map<string, number>();
      for (const r of rows) {
        const day = this.dayKey(r.quoteDate);
        byDay.set(day, (byDay.get(day) ?? 0) + (Number.isFinite(r.weight) ? r.weight : 0));
      }
      const keys = Array.from(byDay.keys()).sort();
      return keys.map(k => [new Date(k), Math.round(byDay.get(k)!)]) as (Date | number)[][];
    }
  });

  constructor(private csv: CsvService, private svc: ScorecardService) {}

  // Load all CSVs at once and compute scorecard metrics
  // exposes raw arraus and computed metrics via signals

  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      carriers: this.csv.getCarriers(),
      quotes: this.csv.getQuotesActual(),
      deliveries: this.csv.getDeliveries()
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ carriers, quotes, deliveries }) => {
          this.carriers.set(carriers);
          this.quotes.set(quotes);
          this.deliveries.set(deliveries);
          const metrics = this.svc.computeScorecard(carriers, quotes, deliveries);
          this.scorecard.set(metrics);
        },
        error: (err) => this.error.set(err?.message ?? 'Failed to load CSVs')
      });
  }
 // UI actions to drive filters/selections
 selectCarrier(id: number) { this.selectedCarrierId.set(id); }
 clearSelection() { this.selectedCarrierId.set(null); }
 setType(type: 'ALL' | 'LTL' | 'TL') { this.selectedType.set(type); }

 // Helpers to compare inclusive UTC day ranges
 private utcDay(d: Date) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
 private addUtcDays(d: Date, n: number) { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return this.utcDay(x); }
 private inRange(d: Date, from: Date | null, to: Date | null) {
   if (!from && !to) return true;
   const day = this.utcDay(d).getTime();
   const lo = from ? this.utcDay(from).getTime() : -Infinity;
   const hi = to ? this.utcDay(to).getTime() : +Infinity;
   return day >= lo && day <= hi;
 }

 // Helpers to get day/week keys from Date objects
 private dayKey(d: Date) {
   // yyyy-mm-dd in UTC to create stable yyyy-mm-dd keys
   return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
 }
 private weekKey(d: Date) {
   // Monday-based ISO week start date as key
   const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
   const day = dt.getUTCDay() || 7; // 1..7 (Mon..Sun) Sunday as 7
   if (day !== 1) dt.setUTCDate(dt.getUTCDate() - (day - 1));
   return dt.toISOString().slice(0, 10);
 }
}
