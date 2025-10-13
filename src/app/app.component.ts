import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CsvService, CarrierRow, QuoteActualRow, DeliveryRow } from '../services/csvparser.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'alanwire-capstone';

  // Baseplate interface for leaderboard entries
  // In real app, replace with model fetched from an API service
  carriers: CarrierRow[] = [];
  quotesActual: QuoteActualRow[] = [];
  deliveries: DeliveryRow[] = [];

  scorecard = signal<CarrierScoreMetrics[]>([])

  constructor(private csvService: CsvService) {}

  ngOnInit() {
    // Load all CSVs once, then compute metrics
    forkJoin({
      carriers: this.csvService.getCarriers(),
      quotes: this.csvService.getQuotesActual(),
      deliveries: this.csvService.getDeliveries()
    }).subscribe({
      next: ({ carriers, quotes, deliveries }) => {
        this.carriers = carriers;
        this.quotesActual = quotes;
        this.deliveries = deliveries;

        const metrics = this.buildScorecard(carriers, quotes, deliveries);
        this.scorecard.set(metrics);

        console.log('Scorecard metrics (first 5):', metrics.slice(0, 5));
      },
      error: (err) => console.error('Failed to load CSVs', err)
    });
  }

  private buildScorecard(
    carriers: CarrierRow[],
    quotes: QuoteActualRow[],
    deliveries: DeliveryRow[]
  ): CarrierScoreMetrics[] {
    const byId = new Map<number, CarrierRow>(carriers.map(c => [c.TrnspCode, c]));
    const agg = new Map<number, CarrierScoreMetrics>();

    const get = (id: number) => {
      if (!agg.has(id)) {
        const c = byId.get(id);
        agg.set(id, {
          carrierId: id,
          carrierName: c?.CarrierName ?? `Carrier ${id}`,
          truckType: c?.TruckType ?? 'LTL',
          cost: {
            quoteCount: 0,
            overCount: 0,
            underCount: 0,
            extraChargesTotal: 0,
            underQuotedTotal: 0,
            avgDelta: 0,
            avgDeltaPct: 0
          },
          service: {
            shipments: 0,
            avgDeltaDays: 0,
            lateCount: 0,
            earlyCount: 0
          }
        });
      }
      return agg.get(id)!;
    };

    // Cost aggregates (Quote vs Amount)
    for (const q of quotes) {
      const m = get(q.carrier);
      const delta = q.amount - q.quote; // + over, - under
      const pct = q.quote > 0 ? delta / q.quote : 0;

      m.cost.quoteCount++;
      if (delta > 0) { m.cost.overCount++; m.cost.extraChargesTotal += delta; }
      else if (delta < 0) { m.cost.underCount++; m.cost.underQuotedTotal += -delta; }

      // running average (numerically stable)
      const n = m.cost.quoteCount;
      m.cost.avgDelta = m.cost.avgDelta + (delta - m.cost.avgDelta) / n;
      m.cost.avgDeltaPct = m.cost.avgDeltaPct + (pct - m.cost.avgDeltaPct) / n;
    }

    // Service aggregates (Actual vs Expected days)
    const msPerDay = 86_400_000;
    for (const d of deliveries) {
      const m = get(d.carrier);
      const actualDays = (d.delivery.getTime() - d.pickup.getTime()) / msPerDay;
      const expectedDays = (d.expected_delivery.getTime() - d.pickup.getTime()) / msPerDay;
      const deltaDays = actualDays - expectedDays; // + late, - early

      if (!Number.isFinite(deltaDays)) continue;

      m.service.shipments++;
      if (deltaDays > 0) m.service.lateCount++;
      else if (deltaDays < 0) m.service.earlyCount++;

      const n = m.service.shipments;
      m.service.avgDeltaDays = m.service.avgDeltaDays + (deltaDays - m.service.avgDeltaDays) / n;
    }

    return Array.from(agg.values()).sort((a, b) => a.carrierId - b.carrierId);
  }




  businesses: BusinessLeaderboardEntry[] = [
    {
      id: 'b1',
      name: 'Acme Manufacturing',
      score: 9520,
      category: 'Manufacturing',
      location: 'St. Louis, MO',
      trend: 4.2,
      updatedAt: new Date('2025-09-20T14:20:00Z')
    },
    {
      id: 'b2',
      name: 'GreenLeaf Foods',
      score: 9105,
      category: 'Food & Beverage',
      location: 'Chicago, IL',
      trend: 1.1,
      updatedAt: new Date('2025-09-21T09:42:00Z')
    },
    {
      id: 'b3',
      name: 'Skyline Logistics',
      score: 8870,
      category: 'Logistics',
      location: 'Memphis, TN',
      trend: -0.6,
      updatedAt: new Date('2025-09-22T11:05:00Z')
    },
    {
      id: 'b4',
      name: 'SolarEdge Retail',
      score: 8744,
      category: 'Retail',
      location: 'Austin, TX',
      trend: 2.9,
      updatedAt: new Date('2025-09-23T16:18:00Z')
    }
  ];

  sortField: keyof BusinessLeaderboardEntry = 'score';
  sortDir: 'asc' | 'desc' = 'desc';
  filterText = '';

  get filteredAndSorted() {
    const ft = this.filterText.trim().toLowerCase();
    let list = this.businesses;
    if (ft) {
      list = list.filter(b => [b.name, b.category, b.location].some(v => v.toLowerCase().includes(ft)));
    }
    return [...list].sort((a,b)=>{
      const dir = this.sortDir === 'asc' ? 1 : -1;
      const av = a[this.sortField];
      const bv = b[this.sortField];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  toggleSort(field: keyof BusinessLeaderboardEntry) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = field === 'score' ? 'desc' : 'asc';
    }
  }

  ariaSort(field: keyof BusinessLeaderboardEntry) {
    return this.sortField === field ? this.sortDir : 'none';
  }

  trackById(_: number, item: BusinessLeaderboardEntry) { return item.id; }
  rank(index: number) { return index + 1; }
  trendClass(val: number) { return val > 0 ? 'up' : val < 0 ? 'down' : 'flat'; }
  formatTrend(val: number) { return (val>0?'+':'') + val.toFixed(1) + '%'; }
}

// Interface (could move to its own file later)
interface BusinessLeaderboardEntry {
  id: string;
  name: string;
  score: number; // composite KPI score
  category: string;
  location: string;
  trend: number; // percent change over prior period
  updatedAt: Date;
}

interface CarrierScoreMetrics {
  carrierId: number;
  carrierName: string;
  truckType: 'LTL' | 'TL';
  cost: {
    quoteCount: number;
    overCount: number;
    underCount: number;
    extraChargesTotal: number;   // sum(amount - quote) where over
    underQuotedTotal: number;    // sum(quote - amount) where under
    avgDelta: number;            // average (amount - quote)
    avgDeltaPct: number;         // average (amount - quote)/quote
  };
  service: {
    shipments: number;
    avgDeltaDays: number;        // average (actualDays - expectedDays)
    lateCount: number;
    earlyCount: number;
  };
}
