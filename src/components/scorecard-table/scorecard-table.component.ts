import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarrierScoreMetrics } from '../../models/scorecard';

@Component({
  selector: 'scorecard-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scorecard-table.component.html',
  styleUrl: './scorecard-table.component.css'
})
export class ScorecardTableComponent {
  @Input() data: CarrierScoreMetrics[] = [];
}
