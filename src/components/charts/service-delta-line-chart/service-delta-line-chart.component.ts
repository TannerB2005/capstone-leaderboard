import { Component, computed, signal } from '@angular/core';
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
  // Add selection helpers for the template
  readonly selectedCarrierId = computed(() => this.store.selectedCarrierId());
  readonly selectedCarrierName = computed(() => {
    const id = this.store.selectedCarrierId();
    if (id == null) return '';
    const c = this.store.carriers().find(c => c.TrnspCode === id);
    return c?.CarrierName ?? `Carrier-${id}`;
  });
  // rows only; columns define the schema
  data = computed(() => this.store.serviceDeltaDailySeries());
 // Series toggles (Expected, Actual, Delta)
 readonly showExpected = signal(true);
 readonly showActual = signal(true);
 readonly showDeltaDays = signal(true);

 readonly viewData = computed(() => {
   const raw = this.data();
   if (!Array.isArray(raw)) return [];
   const s0 = this.showExpected();
   const s1 = this.showActual();
   const s2 = this.showDeltaDays();
   // Expect: [Date, Expected, Actual, Delta]
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
   colors: ['#005596', '#1BA3DD', '#9A4C1E' ], // Expected, Actual, Delta
   hAxis: { title: 'Date', textStyle: { fontName: 'Harabara Mais' }, titleTextStyle: { fontName: 'Harabara Mais', bold: true } },
   vAxis: { title: 'Days', textStyle: { fontName: 'Harabara Mais' }, titleTextStyle: { fontName: 'Harabara Mais', bold: true } },
   chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
 };
}
