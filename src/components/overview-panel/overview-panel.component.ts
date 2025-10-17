import { Component, Signal, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScorecardStore } from '../../stores/scorecard.store';

@Component({
  selector: 'overview-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview-panel.component.html',
  styleUrl: './overview-panel.component.css'
})
export class OverviewPanelComponent {
  constructor(public store: ScorecardStore) {}
  // Simple ranking: lower avg cost delta % and lower avg service delta days are better
  ranked: Signal<ReturnType<ScorecardStore['filteredScorecard']>> = computed(() => {
    const list = this.store.filteredScorecard();
    return [...list].sort((a, b) => {
      const aScore = (a.cost.avgDeltaPct ?? 0) + (a.service.avgDeltaDays ?? 0);
      const bScore = (b.cost.avgDeltaPct ?? 0) + (b.service.avgDeltaDays ?? 0);
      return aScore - bScore;
    });
  });
}
