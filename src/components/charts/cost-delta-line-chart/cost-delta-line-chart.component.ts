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
  // Explicit column definitions (no header row in data)
  columns = [
    { type: 'date', label: 'Date' },
    { type: 'number', label: 'Avg Δ $' },
    { type: 'number', label: 'Avg Δ %' }
  ];
  data = computed(() => this.store.costDeltaDailySeries());
  options = {
    legend: { position: 'bottom' },
    series: { 0: { targetAxisIndex: 0, color: '#2563eb' }, 1: { targetAxisIndex: 1, color: '#16a34a' } },
    vAxes: { 0: { title: 'Δ $' }, 1: { title: 'Δ %', format: 'percent' } },
    hAxis: { title: 'Date' },
    chartArea: { left: 60, right: 60, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
