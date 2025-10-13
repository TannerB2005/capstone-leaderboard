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
    // Map carrierId -> CarrierRow for quick lookup of name/type
    const byId = new Map<number, CarrierRow>(carriers.map(c => [c.TrnspCode, c]));
    // Accumulator map carrierId -> metrics we are building
    const agg = new Map<number, CarrierScoreMetrics>();

    // Helper that returns the accumulator for a carrier, creating it with defaults if missing
    const get = (id: number) => {
      if (!agg.has(id)) {
        const c = byId.get(id);
        agg.set(id, {
          carrierId: id,
          carrierName: c?.CarrierName ?? `Carrier ${id}`,
          truckType: c?.TruckType ?? 'LTL',
          // Cost metrics accumulator (all (currently) derived from QUOTESvsACTUAL.csv)
          cost: {
            //counts
            quoteCount: 0,
            overCount: 0, //number of shipments where amount > quote
            underCount: 0, //number of shipments where amount < quote
            // sums
            extraChargesTotal: 0, // sum of (amount - quote) where amount > quote
            underQuotedTotal: 0, // sum of (quote - amount) where amount < quote
            // averages(Delta)
            avgDelta: 0, // average of (amount - quote)
            avgDeltaPct: 0,  // average of (amount - quote)/quote
            //straightforward averages/rates
            avgQuote: 0, // average of quote
            avgAmount: 0, // average of amount
            avgWeight: 0, // average of weight
            //conditional averages
            avgOverCharge: 0,   // average of (amount-quote) among over quotes only
            avgUnderCredit: 0,  // average of (quote-amount) among under quotes only
            // simple rates
            overRate: 0, // overCount / quoteCount
            underRate: 0 // underCount / quoteCount
          },
          // Service metrics accumulator (all (currently) derived from deliveries.csv)
          service: {
            shipments: 0, // number of delivery records
            //deltas
            avgDeltaDays: 0, // average of (actualDays - expectedDays)
            //counts
            lateCount: 0, // number of shipments where actualDays > expectedDays
            earlyCount: 0,  // number of shipments where actualDays < expectedDays
            // straightforward averages (running mean)
            avgActualDays: 0,   // average of actualDays
            avgExpectedDays: 0,
            // simple rates
            lateRate: 0, // lateCount / shipments
            earlyRate: 0  // earlyCount / shipments
          }
        });
      }
      return agg.get(id)!;
    };

    // Cost aggregates (Quote vs Amount)
    // For each quote/actual row, update the carrier's metrics (cost counters, sums, and averages)
    for (const q of quotes) {
      const m = get(q.carrier);
      // Delta in dollars: postive means charged > quoted (over); negative means under
      const delta = q.amount - q.quote;
      // Delta percent of quote (for normalization); handle zero quote case
      const pct = q.quote > 0 ? delta / q.quote : 0;



      // Total quote count used for averages/rates
      m.cost.quoteCount++;

      // Straightforward averages (running mean) for quote, amount, weight
      const nQ = m.cost.quoteCount;
      m.cost.avgQuote  = m.cost.avgQuote  + (q.quote  - m.cost.avgQuote)  / nQ;
      m.cost.avgAmount = m.cost.avgAmount + (q.amount - m.cost.avgAmount) / nQ;
      m.cost.avgWeight = m.cost.avgWeight + (q.weight - m.cost.avgWeight) / nQ;


      // Over and under counts, sums, and conditional sums/averages
      if (delta > 0) {
        // Over-quoted: charged more than quoted
        m.cost.overCount++;
        m.cost.extraChargesTotal += delta;
        // Update mean of over-charges only (running mean)
        const kOver = m.cost.overCount;
        m.cost.avgOverCharge = m.cost.avgOverCharge + (delta - m.cost.avgOverCharge) / kOver;
      } else if (delta < 0) {
        // Under-quoted: charged less than quoted
        m.cost.underCount++;
        m.cost.underQuotedTotal += -delta; // add positive amount
        // Update mean of under-credits only (running mean)
        const kUnder = m.cost.underCount;
        m.cost.avgUnderCredit = m.cost.avgUnderCredit + ((-delta) - m.cost.avgUnderCredit) / kUnder;
      }

      // running averages for deltas
      m.cost.avgDelta     = m.cost.avgDelta     + (delta - m.cost.avgDelta) / nQ;
      m.cost.avgDeltaPct  = m.cost.avgDeltaPct  + (pct   - m.cost.avgDeltaPct) / nQ;

      // simple over/under rates based on current totals
      m.cost.overRate  = nQ ? m.cost.overCount  / nQ : 0;
      m.cost.underRate = nQ ? m.cost.underCount / nQ : 0;
    }

    // Service aggregates (Actual vs Expected days) -- deliveries.csv
    // For each delivery row, update the carrier's metrics (service counters, sums, and averages)
    const msPerDay = 86_400_000;
    for (const d of deliveries) {
      const m = get(d.carrier);

      // Actual transit days: delivery - pickup
      const actualDays   = (d.delivery.getTime()- d.pickup.getTime()) / msPerDay;
      // Expected transit days: expected_delivery - pickup
      const expectedDays = (d.expected_delivery.getTime() - d.pickup.getTime()) / msPerDay;
      // Skip invalid dates (zero or negative days)
      if (!Number.isFinite(actualDays) || !Number.isFinite(expectedDays)) continue;

      // Positive means late, negative means early
      const deltaDays = actualDays - expectedDays;

      // Total shipment count used for averages/rates
      m.service.shipments++;

      // Straightforward averages (running mean)
      const nS = m.service.shipments;
      m.service.avgActualDays   = m.service.avgActualDays   + (actualDays   - m.service.avgActualDays)   / nS;
      m.service.avgExpectedDays = m.service.avgExpectedDays + (expectedDays - m.service.avgExpectedDays) / nS;

      // Late and early counts
      if (deltaDays > 0) m.service.lateCount++;
      else if (deltaDays < 0) m.service.earlyCount++;

      // days delta average
      m.service.avgDeltaDays = m.service.avgDeltaDays + (deltaDays - m.service.avgDeltaDays) / nS;

      // derived rates
      m.service.lateRate  = nS ? m.service.lateCount  / nS : 0;
      m.service.earlyRate = nS ? m.service.earlyCount / nS : 0;
    }

    // Return sorted array of metrics (by carrierId)
    return Array.from(agg.values()).sort((a, b) => a.carrierId - b.carrierId);
  }





  private businesses: BusinessLeaderboardEntry[] = [
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

  cycleSortField() {
    const fields: (keyof BusinessLeaderboardEntry)[] = ['score','trend','name','category','location'];
    const idx = fields.indexOf(this.sortField);
    const next = fields[(idx + 1) % fields.length];
    this.sortField = next;
    // default direction heuristic
    this.sortDir = (next === 'score' || next === 'trend') ? 'desc' : 'asc';
  }
  toggleSortDirectionOnly() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
  }
  handleSortInfoClick(event: MouseEvent) {
    if (event.shiftKey) {
      this.toggleSortDirectionOnly();
    } else {
      this.cycleSortField();
    }
  }
  clearFilter() { this.filterText = ''; }
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
    extraChargesTotal: number;
    underQuotedTotal: number;
    avgDelta: number;
    avgDeltaPct: number;
    // NEW straightforward averages/rates
    avgQuote: number;
    avgAmount: number;
    avgWeight: number;
    avgOverCharge: number;
    avgUnderCredit: number;
    overRate: number;
    underRate: number;
  };
  service: {
    shipments: number;
    avgDeltaDays: number;
    lateCount: number;
    earlyCount: number;
    // NEW straightforward averages/rates
    avgActualDays: number;
    avgExpectedDays: number;
    lateRate: number;
    earlyRate: number;
  };
}
