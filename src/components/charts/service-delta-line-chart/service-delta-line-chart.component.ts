import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule } from 'angular-google-charts';
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
  data = computed(() => this.store.serviceDeltaDailySeries());
  options = {
    legend: { position: 'none' },
    colors: ['#f59e0b'],
    hAxis: { title: 'Date' },
    vAxis: { title: 'Avg Δ Days' },
    chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
  };
}
