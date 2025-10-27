import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule, ChartType } from 'angular-google-charts';
import { ScorecardStore } from '../../../stores/scorecard.store';

@Component({
  selector: 'cost-delta-line-chart',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './cost-delta-line-chart.component.html',
  styleUrl: './cost-delta-line-chart.component.css'
})
export class CostDeltaLineChartComponent {
  constructor(private store: ScorecardStore) {}
  chartType = ChartType.LineChart;

  // Columns define types so charts work even when there are no data rows.
  columns = [
    { type: 'date',   label: 'Date' },
    { type: 'number', label: 'Quote' },
    { type: 'number', label: 'Actual' },
    { type: 'number', label: 'Delta' }
  ];

   // Add selection helpers for the template
   readonly selectedCarrierId = computed(() => this.store.selectedCarrierId());
   readonly selectedCarrierName = computed(() => {
     const id = this.store.selectedCarrierId();
     if (id == null) return '';
     const c = this.store.carriers().find(c => c.TrnspCode === id);
     return c?.CarrierName ?? `Carrier-${id}`;
   });

  // Store returns a header row + data rows; pass rows only to the chart.
  data = computed(() => this.store.costDeltaDailySeries().slice(1));

  // Series toggles (Quote, Actual, Delta)
  readonly showQuote = signal(true);
  readonly showActual = signal(true);
  readonly showDelta = signal(true);

  // Wrap existing data with hidden-series as nulls
  readonly viewData = computed(() => {
    const raw = this.data();
    if (!Array.isArray(raw)) return [];
    const s0 = this.showQuote();
    const s1 = this.showActual();
    const s2 = this.showDelta();
    // Expect: [Date, Quote, Actual, Delta]
    return raw.map((row: any[]) => {
      const out = row.slice();
      if (!s0) out[1] = null;
      if (!s1) out[2] = null;
      if (!s2) out[3] = null;
      return out;
    });
  });

  options = {
    fontName: 'Harabara Mais',
    legend: { position: 'bottom', textStyle: { fontName: 'Harabara Mais' } },
    colors: ['#9A4C1E', '#005596', '#1BA3DD'], // Quote, Actual, Delta
    vAxis: { title: 'Amount ($)', textStyle: { fontName: 'Harabara Mais' }, titleTextStyle: { fontName: 'Harabara Mais', bold: true } },
    hAxis: { title: 'Date', textStyle: { fontName: 'Harabara Mais' }, titleTextStyle: { fontName: 'Harabara Mais', bold: true } },
    chartArea: { left: 60, right: 24, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
