import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule, ChartType } from 'angular-google-charts';
import { ScorecardStore } from '../../../stores/scorecard.store';

@Component({
  selector: 'shipments-bar-chart',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './shipments-bar-chart.component.html',
  styleUrl: './shipments-bar-chart.component.css'
})
export class ShipmentsBarChartComponent {
  constructor(private store: ScorecardStore) {}
  chartType = ChartType.ColumnChart;
  data = computed(() => this.store.shipmentsSeries());
  options = computed(() => ({
    legend: { position: 'none' },
    hAxis: { title: this.store.selectedCarrierId() == null ? 'Carrier' : 'Week' },
    vAxis: { title: 'Shipments' },
    chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
  }));
}
