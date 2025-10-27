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
   // Scale weight values for display (thousands of pounds)
   private readonly weightScale = 1000;

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
    return isWeight ? `Weight and week shipped for ${this.selectedCarrierName()}` : `Shipments by week for ${this.selectedCarrierName()}`;
  });

    // Column defs (keeps tooltip role for custom HTML)
  columns = computed<Column[]>(() => {
    const sel = this.selectedCarrierId();
    const isWeight = this.mode() === 'weight';
    const domain: Column = sel == null
      ? { type: 'string', label: 'Carrier' }
      : { type: 'date', label: isWeight ? 'Date' : 'Week' };
    const value: Column = { type: 'number', label: isWeight ? 'Weight (000 lb)' : 'Shipments' };
    const tooltip: Column = { type: 'string', role: 'tooltip', p: { html: true } } as Column & { p: { html: boolean } };
    return [domain, value, tooltip];
  });

  // Data: plot scaled weight, but tooltip shows full precision + date when selected
  data = computed(() => {
    const isWeight = this.mode() === 'weight';
    const raw = isWeight ? this.store.weightSeries() : this.store.shipmentsSeries();
    if (!Array.isArray(raw)) return [];

    const sel = this.selectedCarrierId();

    if (!isWeight) {
      // Shipments tooltips: include date when a carrier is selected
      return raw.map(row => {
        const x = row[0] as any;
        const y = Number(row[1] ?? 0);
        const title = sel == null ? String(x) : this.fmtDate(x as Date);
        const html = this.tt(title, 'Shipments', this.format(y));
        return [x, y, html];
      });
    }

    // Weight tooltips: axis uses thousands; tooltip shows unscaled pounds with label
    return raw.map(row => {
      const x = row[0] as any;               // string (carrier) or Date (selected)
      const totalLb = Number(row[1] ?? 0);   // unscaled
      const scaled = Math.round(totalLb / this.weightScale); // thousands
      const title = sel == null ? String(x) : this.fmtDate(x as Date);
      const html = this.tt(title, 'Weight (lb)', this.format(totalLb));
      return [x, scaled, html];
    });
  });

  // Options: enable HTML tooltips and label axis to indicate thousands
  options = computed(() => {
    const sel = this.selectedCarrierId();
    const isWeight = this.mode() === 'weight';
    return {
      fontName: 'Harabara Mais',
      legend: { position: 'none', textStyle: { fontName: 'Harabara Mais' } },
      tooltip: { isHtml: true, textStyle: { fontName: 'Harabara Mais' } },
      colors: ['#005596'],
      hAxis: {
        title: sel == null ? 'Carrier' : (isWeight ? 'Date' : 'Week'),
        textStyle: { fontName: 'Harabara Mais' },
        titleTextStyle: { fontName: 'Harabara Mais', bold: true }
      },
      vAxis: {
        title: isWeight ? 'Weight (in thousands lb)' : 'Shipments',
        format: '#,###',
        textStyle: { fontName: 'Harabara Mais' },
        titleTextStyle: { fontName: 'Harabara Mais', bold: true }
      },
      chartArea: { left: 60, right: 20, top: 24, bottom: 48, width: '100%', height: '70%' }
    };
  });

  // Helpers: date + tooltip HTML
  private fmtDate(d: Date) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(d);
  }
  private format(n: number) {
    return new Intl.NumberFormat('en-US').format(Math.round(n));
  }
  private tt(title: string, label: string, value: string) {
    // ...existing code...
    return `
      <div style="font:12px/1.4 'Harabara Mais', -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial;">
        <div style="font-weight:600;margin-bottom:4px;">${title}</div>
        <div><span style="color:#475569;">${label}</span>: <strong>${value}</strong></div>
      </div>
    `;
  }
  }
