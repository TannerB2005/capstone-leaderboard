import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule } from 'angular-google-charts';
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
  chartType = computed(() => this.store.selectedCarrierId() == null ? 'ColumnChart' : 'ColumnChart');
  data = computed(() => this.store.shipmentsSeries());
  options = computed(() => {
    const selected = this.store.selectedCarrierId() != null;
    return {
      legend: { position: 'none' },
      hAxis: { title: selected ? 'Week' : 'Carrier' },
      vAxis: { title: 'Shipments' },
      colors: ['#7c3aed'],
      chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
    };
  });
}
