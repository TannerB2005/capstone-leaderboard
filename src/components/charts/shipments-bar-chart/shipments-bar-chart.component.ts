import { Component, computed, signal } from '@angular/core';
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

  // Toggle between shipments and weight
  readonly mode = signal<'shipments' | 'weight'>('shipments');
  toggleMode() {
    this.mode.set(this.mode() === 'shipments' ? 'weight' : 'shipments');
  }

  // Expose selection for template
  readonly selectedCarrierId = computed(() => this.store.selectedCarrierId());
  readonly selectedCarrierName = computed(() => {
    const id = this.store.selectedCarrierId();
    if (id == null) return '';
    const c = this.store.carriers().find(c => c.TrnspCode === id);
    return c?.CarrierName ?? `Carrier-${id}`;
  });

  // Title based on mode + selection
  readonly title = computed(() => {
    const isWeight = this.mode() === 'weight';
    const sel = this.selectedCarrierId();
    if (sel == null) return isWeight ? 'Total weight shipped by carrier' : 'Total number of shipments by carrier';
    return isWeight ? `Weight and date shipped for ${this.selectedCarrierName()}` : `Shipments by date for ${this.selectedCarrierName()}`;
  });

  // Columns depend on mode and selection
  columns = computed<Column[]>(() => {
    const sel = this.selectedCarrierId();
    const isWeight = this.mode() === 'weight';
    if (sel == null) {
      return [{ type: 'string', label: 'Carrier' }, { type: 'number', label: isWeight ? 'Weight (lb)' : 'Shipments' }];
    } else {
      return [{ type: 'date', label: isWeight ? 'Date' : 'Week' }, { type: 'number', label: isWeight ? 'Weight (lb)' : 'Shipments' }];
    }
  });

  // Data switches between existing shipmentsSeries and new weightSeries
  data = computed(() => (this.mode() === 'shipments' ? this.store.shipmentsSeries() : this.store.weightSeries()));

  // Chart options match current styling; axis titles adapt to mode/selection
  options = computed(() => {
    const sel = this.selectedCarrierId();
    const isWeight = this.mode() === 'weight';
    return {
      legend: { position: 'none' },
      hAxis: { title: sel == null ? 'Carrier' : (isWeight ? 'Date' : 'Week') },
      vAxis: { title: isWeight ? 'Weight (lb)' : 'Shipments' },
      chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
    };
  });
}
