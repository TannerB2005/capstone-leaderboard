import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule, ChartType } from 'angular-google-charts';
import { ScorecardStore } from '../../../stores/scorecard.store';

@Component({
  selector: 'service-delta-line-chart',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './service-delta-line-chart.component.html',
  styleUrl: './service-delta-line-chart.component.css'
})
export class ServiceDeltaLineChartComponent {
  constructor(private store: ScorecardStore) {}
  chartType = ChartType.LineChart;
  columns = [
    { type: 'date',   label: 'Date' },
    { type: 'number', label: 'Expected' },
    { type: 'number', label: 'Actual' },
    { type: 'number', label: 'Delta' }
  ];
  // rows only; columns define the schema
  data = computed(() => this.store.serviceDeltaDailySeries());
  options = {
    legend: { position: 'bottom' },
    series: {
      0: { color: '#64748b' }, // Expected
      1: { color: '#2563eb' }, // Actual
      2: { color: '#f97316' }  // Delta
    },
    hAxis: { title: 'Date' },
    vAxis: { title: 'Days' },
    chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
