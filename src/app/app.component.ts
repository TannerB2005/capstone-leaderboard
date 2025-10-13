import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CsvService, CarrierRow, QuoteActualRow, DeliveryRow } from '../services/csvparser.service';

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

  constructor(private csvService: CsvService) {}

  ngOnInit() {
    this.csvService.getCarriers().subscribe(data => {
      this.carriers = data;
      console.log('Carriers loaded:', this.carriers.length, this.carriers[0]);
    });
    this.csvService.getQuotesActual().subscribe(data => {
      this.quotesActual = data;
      console.log('Quotes vs Actual loaded:', this.quotesActual.length, this.quotesActual[0]);
    });
    this.csvService.getDeliveries().subscribe(data => {
      this.deliveries = data;
      console.log('Deliveries loaded:', this.deliveries.length, this.deliveries[0]);
    });
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
