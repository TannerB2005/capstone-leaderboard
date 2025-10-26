import { Component, computed } from '@angular/core';
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

  options = {
    legend: { position: 'bottom' },
    series: {
      0: { color: '#2563eb' }, // Quote
      1: { color: '#16a34a' }, // Actual
      2: { color: '#f97316' }  // Delta
    },
    vAxis: { title: 'Amount ($)' },
    hAxis: { title: 'Date' },
    chartArea: { left: 60, right: 24, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
