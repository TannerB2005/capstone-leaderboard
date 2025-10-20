import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleChartsModule, ChartType, Column } from 'angular-google-charts';
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

  // Expose selection for template
  readonly selectedCarrierId = computed(() => this.store.selectedCarrierId());
  readonly selectedCarrierName = computed(() => {
    const id = this.store.selectedCarrierId();
    if (id == null) return '';
    const c = this.store.carriers().find(c => c.TrnspCode === id);
    return c?.CarrierName ?? `Carrier-${id}`;
  });

  // Columns depend on selection: overview uses string domain; zoom uses date domain
  columns = computed<Column[]>(() =>
    this.store.selectedCarrierId() == null
      ? [{ type: 'string', label: 'Carrier' }, { type: 'number', label: 'Shipments' }]
      : [{ type: 'date', label: 'Week' }, { type: 'number', label: 'Shipments' }]
  );

  data = computed(() => this.store.shipmentsSeries());

  options = computed(() => ({
    legend: { position: 'none' },
    hAxis: { title: this.store.selectedCarrierId() == null ? 'Carrier' : 'Week' },
    vAxis: { title: 'Shipments' },
    chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
  }));
}
