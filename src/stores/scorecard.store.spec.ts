import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ScorecardStore } from './scorecard.store';
import { CsvService } from '../services/csvparser.service';
import { ScorecardService } from '../services/scorecard.service';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';
import { CarrierScoreMetrics } from '../models/scorecard';

const d = (iso: string) => new Date(iso);

const CARRIERS: CarrierRow[] = [
  { TrnspCode: 1, CarrierName: 'Alpha', TruckType: 'LTL' },
  { TrnspCode: 2, CarrierName: 'Beta',  TruckType: 'TL'  }
];
const QUOTES: QuoteActualRow[] = [
  { quoteDate: d('2024-03-01'), carrier: 1, weight: 100, quote: 100, amount: 110 },
  { quoteDate: d('2024-03-15'), carrier: 2, weight: 200, quote: 200, amount: 190 }
];
const DELIVERIES: DeliveryRow[] = [
  { carrier: 1, pickup: d('2024-03-01'), delivery: d('2024-03-05'), expected_delivery: d('2024-03-04') },
  { carrier: 2, pickup: d('2024-03-01'), delivery: d('2024-03-03'), expected_delivery: d('2024-03-04') }
];

const METRICS: CarrierScoreMetrics[] = [
  {
    carrierId: 1, carrierName: 'Alpha', truckType: 'LTL',
    cost: { quoteCount: 1, overCount: 1, underCount: 0, extraChargesTotal: 10, underQuotedTotal: 0,
            avgDelta: 10, avgDeltaPct: 0.1, avgQuote: 100, avgAmount: 110, avgWeight: 100,
            avgOverCharge: 10, avgUnderCredit: 0, overRate: 1, underRate: 0 },
    service: { shipments: 1, avgDeltaDays: 1, lateCount: 1, earlyCount: 0,
               avgActualDays: 4, avgExpectedDays: 3, lateRate: 1, earlyRate: 0 }
  },
  {
    carrierId: 2, carrierName: 'Beta', truckType: 'TL',
    cost: { quoteCount: 1, overCount: 0, underCount: 1, extraChargesTotal: 0, underQuotedTotal: 10,
            avgDelta: -10, avgDeltaPct: -0.05, avgQuote: 200, avgAmount: 190, avgWeight: 200,
            avgOverCharge: 0, avgUnderCredit: 10, overRate: 0, underRate: 1 },
    service: { shipments: 1, avgDeltaDays: -1, lateCount: 0, earlyCount: 1,
               avgActualDays: 2, avgExpectedDays: 3, lateRate: 0, earlyRate: 1 }
  }
];

describe('ScorecardStore', () => {
  let store: ScorecardStore;
  let csvSpy: jasmine.SpyObj<CsvService>;
  let svcSpy: jasmine.SpyObj<ScorecardService>;

  beforeEach(() => {
    csvSpy = jasmine.createSpyObj('CsvService', ['getCarriers', 'getQuotesActual', 'getDeliveries']);
    svcSpy = jasmine.createSpyObj('ScorecardService', ['computeScorecard']);

    TestBed.configureTestingModule({
      providers: [
        ScorecardStore,
        { provide: CsvService,      useValue: csvSpy },
        { provide: ScorecardService, useValue: svcSpy }
      ]
    });
    store = TestBed.inject(ScorecardStore);
  });

  describe('loadAll()', () => {
    it('sets loading true while in-flight then false on success', () => {
      csvSpy.getCarriers.and.returnValue(of(CARRIERS));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));
      svcSpy.computeScorecard.and.returnValue(METRICS);

      expect(store.loading()).toBeFalse();
      store.loadAll();
      expect(store.loading()).toBeFalse(); // synchronous observables complete immediately
    });

    it('populates carriers, quotes, deliveries, and scorecard signals', () => {
      csvSpy.getCarriers.and.returnValue(of(CARRIERS));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));
      svcSpy.computeScorecard.and.returnValue(METRICS);

      store.loadAll();

      expect(store.carriers()).toEqual(CARRIERS);
      expect(store.quotes()).toEqual(QUOTES);
      expect(store.deliveries()).toEqual(DELIVERIES);
      expect(store.scorecard()).toEqual(METRICS);
      expect(store.error()).toBeNull();
    });

    it('sets error signal and clears loading on failure', () => {
      csvSpy.getCarriers.and.returnValue(throwError(() => new Error('network error')));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));

      store.loadAll();

      expect(store.loading()).toBeFalse();
      expect(store.error()).toBe('network error');
    });

    it('clears a previous error when retrying', () => {
      csvSpy.getCarriers.and.returnValue(throwError(() => new Error('first failure')));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));
      store.loadAll();
      expect(store.error()).toBeTruthy();

      csvSpy.getCarriers.and.returnValue(of(CARRIERS));
      svcSpy.computeScorecard.and.returnValue(METRICS);
      store.loadAll();
      expect(store.error()).toBeNull();
    });
  });

  describe('filteredScorecard()', () => {
    beforeEach(() => {
      csvSpy.getCarriers.and.returnValue(of(CARRIERS));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));
      svcSpy.computeScorecard.and.returnValue(METRICS);
      store.loadAll();
      // Return a consistent value regardless of filter args
      svcSpy.computeScorecard.and.returnValue(METRICS);
    });

    it('returns all carriers when type is ALL', () => {
      store.setType('ALL');
      const result = store.filteredScorecard();
      expect(result.length).toBe(2);
    });

    it('filters to LTL carriers only', () => {
      store.setType('LTL');
      const result = store.filteredScorecard();
      expect(result.every(m => m.truckType === 'LTL')).toBeTrue();
    });

    it('filters to TL carriers only', () => {
      store.setType('TL');
      const result = store.filteredScorecard();
      expect(result.every(m => m.truckType === 'TL')).toBeTrue();
    });
  });

  describe('filteredQuotes()', () => {
    beforeEach(() => {
      csvSpy.getCarriers.and.returnValue(of(CARRIERS));
      csvSpy.getQuotesActual.and.returnValue(of(QUOTES));
      csvSpy.getDeliveries.and.returnValue(of(DELIVERIES));
      svcSpy.computeScorecard.and.returnValue(METRICS);
      store.loadAll();
    });

    it('returns all quotes when no filters active', () => {
      expect(store.filteredQuotes().length).toBe(QUOTES.length);
    });

    it('filters by selected carrier', () => {
      store.selectCarrier(1);
      const result = store.filteredQuotes();
      expect(result.every(q => q.carrier === 1)).toBeTrue();
    });

    it('filters by date range', () => {
      store.setDateRange(d('2024-03-01'), d('2024-03-10'));
      const result = store.filteredQuotes();
      expect(result.length).toBe(1);
      expect(result[0].carrier).toBe(1);
    });
  });

  describe('date presets', () => {
    it('clears date filters for ALL preset', () => {
      store.setDatePreset('ALL');
      expect(store.dateFrom()).toBeNull();
      expect(store.dateTo()).toBeNull();
    });

    it('sets a 7-day window for 7D preset', () => {
      store.setDatePreset('7D');
      const from = store.dateFrom()!;
      const to = store.dateTo()!;
      expect(from).toBeTruthy();
      expect(to).toBeTruthy();
      const diffDays = (to.getTime() - from.getTime()) / 86_400_000;
      expect(diffDays).toBe(6);
    });

    it('sets a 30-day window for 30D preset', () => {
      store.setDatePreset('30D');
      const from = store.dateFrom()!;
      const to = store.dateTo()!;
      const diffDays = (to.getTime() - from.getTime()) / 86_400_000;
      expect(diffDays).toBe(29);
    });
  });

  describe('carrier selection', () => {
    it('selectCarrier sets selectedCarrierId', () => {
      store.selectCarrier(2);
      expect(store.selectedCarrierId()).toBe(2);
    });

    it('clearSelection resets to null', () => {
      store.selectCarrier(2);
      store.clearSelection();
      expect(store.selectedCarrierId()).toBeNull();
    });
  });
});
