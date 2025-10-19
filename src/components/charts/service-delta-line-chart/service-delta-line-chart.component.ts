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
    { type: 'date', label: 'Date' },
    { type: 'number', label: 'Avg Δ Days' }
  ];
  data = computed(() => this.store.serviceDeltaDailySeries());
  options = {
    legend: { position: 'bottom' },
    series: { 0: { color: '#2563eb' } },
    hAxis: { title: 'Date' },
    vAxis: { title: 'Avg Δ Days' },
    chartArea: { left: 60, right: 60, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
