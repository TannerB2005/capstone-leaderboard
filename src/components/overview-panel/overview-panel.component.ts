import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScorecardStore } from '../../stores/scorecard.store';

type SortField =
  | 'rankScore'
  | 'carrier'
  | 'type'
  | 'quotes'
  | 'overRate'
  | 'avgDelta'
  | 'avgDeltaPct'
  | 'shipments'
  | 'avgDeltaDays';

@Component({
  selector: 'overview-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview-panel.component.html',
  styleUrl: './overview-panel.component.css'
})
export class OverviewPanelComponent {
  constructor(public store: ScorecardStore) {}

  // Search/sort state (BusinessLeaderboard behavior)
  filterText = '';
  // Default ranking = lower (avgDeltaPct + avgDeltaDays) is better
  sortField: SortField = 'rankScore';
  sortDir: 'asc' | 'desc' = 'asc';

  // Pagination
  pageIndex = 0;
  pageSize = 5;
  readonly pageSizes = [5, 10];

  // Derived: overview rows filtered and sorted
  get rows() {
    const list = this.store.filteredScorecard();
    const ft = this.filterText.trim().toLowerCase();

    let filtered = list;
    if (ft) {
      filtered = filtered.filter(m =>
        m.carrierName.toLowerCase().includes(ft) ||
        m.truckType.toLowerCase().includes(ft)
      );
    }

    const dir = this.sortDir === 'asc' ? 1 : -1;
    const score = (m: typeof list[number]) =>
      (m.cost.avgDeltaPct ?? 0) + (m.service.avgDeltaDays ?? 0);

    const val = (m: typeof list[number]) => {
      switch (this.sortField) {
        case 'rankScore':   return score(m);
        case 'carrier':     return m.carrierName;
        case 'type':        return m.truckType;
        case 'quotes':      return m.cost.quoteCount;
        case 'overRate':    return m.cost.overRate ?? 0;
        case 'avgDelta':    return m.cost.avgDelta ?? 0;
        case 'avgDeltaPct': return m.cost.avgDeltaPct ?? 0;
        case 'shipments':   return m.service.shipments ?? 0;
        case 'avgDeltaDays':return m.service.avgDeltaDays ?? 0;
      }
    };

    return [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // Paged slice for readability in the dashboard grid
  get pagedRows() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.rows.slice(start, end);
  }
  get totalPages() { return Math.max(1, Math.ceil(this.rows.length / this.pageSize)); }
  get pageDisplayStart() { return this.rows.length ? this.pageIndex * this.pageSize + 1 : 0; }
  get pageDisplayEnd() { return Math.min((this.pageIndex + 1) * this.pageSize, this.rows.length); }

  // Rank number display (1-based)
  rank(index: number) { return index + 1; }

  // Sorting controls (mirrors BusinessLeaderboard)
  toggleSort(field: SortField) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      // default direction heuristic: numeric KPIs DESC except rankScore (ASC best-first)
      this.sortDir =
        field === 'rankScore' ? 'asc'
        : (field === 'carrier' || field === 'type') ? 'asc'
        : 'desc';
    }
    this.pageIndex = 0;
  }
  ariaSort(field: SortField) {
    return this.sortField === field ? this.sortDir : 'none';
  }
  cycleSortField() {
    const fields: SortField[] = [
      'rankScore','quotes','overRate','avgDelta','avgDeltaPct','shipments','avgDeltaDays','carrier','type'
    ];
    const idx = fields.indexOf(this.sortField);
    const next = fields[(idx + 1) % fields.length];
    this.sortField = next;
    this.sortDir =
      next === 'rankScore' ? 'asc'
      : (next === 'carrier' || next === 'type') ? 'asc'
      : 'desc';
    this.pageIndex = 0;
  }
  toggleSortDirectionOnly() {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
  }
  handleSortInfoClick(event: MouseEvent) {
    if (event.shiftKey) this.toggleSortDirectionOnly();
    else this.cycleSortField();
  }

  // Filter/pager helpers
  clearFilter() { this.filterText = ''; this.pageIndex = 0; }
  setPageSize(sz: number) { this.pageSize = sz; this.pageIndex = 0; }
  firstPage() { this.pageIndex = 0; }
  prevPage() { this.pageIndex = Math.max(0, this.pageIndex - 1); }
  nextPage() { this.pageIndex = Math.min(this.totalPages - 1, this.pageIndex + 1); }
  lastPage() { this.pageIndex = Math.max(0, this.totalPages - 1); }

  trackByCarrier(_: number, m: ReturnType<ScorecardStore['filteredScorecard']>[number]) { return m.carrierId; }
}
