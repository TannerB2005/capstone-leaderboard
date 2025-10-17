import { Injectable, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CsvService } from '../services/csvparser.service';
import { ScorecardService } from '../services/scorecard.service';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';
import { CarrierScoreMetrics } from '../models/scorecard';

@Injectable({ providedIn: 'root' })
export class ScorecardStore {
  // raw
  readonly carriers = signal<CarrierRow[]>([]);
  readonly quotes = signal<QuoteActualRow[]>([]);
  readonly deliveries = signal<DeliveryRow[]>([]);

  // ui
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // derived
  readonly scorecard = signal<CarrierScoreMetrics[]>([]);
  readonly ltl = computed(() => this.scorecard().filter(x => x.truckType === 'LTL'));
  readonly tl = computed(() => this.scorecard().filter(x => x.truckType === 'TL'));

  constructor(private csv: CsvService, private svc: ScorecardService) {}

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
          console.log('Scorecard ready:', metrics.length, metrics.slice(0, 5));
        },
        error: (err) => this.error.set(err?.message ?? 'Failed to load CSVs')
      });
  }
}
