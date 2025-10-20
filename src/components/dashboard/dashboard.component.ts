import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { OverviewPanelComponent } from '../overview-panel/overview-panel.component';
import { CostDeltaLineChartComponent } from '../charts/cost-delta-line-chart/cost-delta-line-chart.component';
import { ShipmentsBarChartComponent } from '../charts/shipments-bar-chart/shipments-bar-chart.component';
import { ServiceDeltaLineChartComponent } from '../charts/service-delta-line-chart/service-delta-line-chart.component';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule, OverviewPanelComponent, CostDeltaLineChartComponent, ShipmentsBarChartComponent, ServiceDeltaLineChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {}
