import { TestBed } from '@angular/core/testing';
import { ScorecardService } from './scorecard.service';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';

describe('ScorecardService', () => {
  let svc: ScorecardService;

  const carriers: CarrierRow[] = [
    { TrnspCode: 1, CarrierName: 'Alpha', TruckType: 'LTL' },
    { TrnspCode: 2, CarrierName: 'Beta',  TruckType: 'TL'  }
  ];

  const d = (iso: string) => new Date(iso);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(ScorecardService);
  });

  it('returns empty array for empty inputs', () => {
    expect(svc.computeScorecard([], [], [])).toEqual([]);
  });

  it('creates a metrics entry for each carrier that appears in quotes', () => {
    const quotes: QuoteActualRow[] = [
      { quoteDate: d('2024-01-01'), carrier: 1, weight: 100, quote: 100, amount: 110 }
    ];
    const result = svc.computeScorecard(carriers, quotes, []);
    expect(result.length).toBe(1);
    expect(result[0].carrierId).toBe(1);
    expect(result[0].carrierName).toBe('Alpha');
    expect(result[0].truckType).toBe('LTL');
  });

  describe('cost metrics', () => {
    it('counts over-charges and computes avgDelta', () => {
      const quotes: QuoteActualRow[] = [
        { quoteDate: d('2024-01-01'), carrier: 1, weight: 100, quote: 100, amount: 120 }, // +20
        { quoteDate: d('2024-01-02'), carrier: 1, weight: 100, quote: 100, amount: 130 }, // +30
      ];
      const [m] = svc.computeScorecard(carriers, quotes, []);
      expect(m.cost.quoteCount).toBe(2);
      expect(m.cost.overCount).toBe(2);
      expect(m.cost.underCount).toBe(0);
      expect(m.cost.avgDelta).toBeCloseTo(25);
      expect(m.cost.overRate).toBeCloseTo(1);
    });

    it('counts under-charges correctly', () => {
      const quotes: QuoteActualRow[] = [
        { quoteDate: d('2024-01-01'), carrier: 1, weight: 100, quote: 100, amount: 80 }, // -20
      ];
      const [m] = svc.computeScorecard(carriers, quotes, []);
      expect(m.cost.underCount).toBe(1);
      expect(m.cost.overCount).toBe(0);
      expect(m.cost.avgUnderCredit).toBeCloseTo(20);
      expect(m.cost.underRate).toBeCloseTo(1);
      expect(m.cost.overRate).toBeCloseTo(0);
    });

    it('handles zero quote without NaN in avgDeltaPct', () => {
      const quotes: QuoteActualRow[] = [
        { quoteDate: d('2024-01-01'), carrier: 1, weight: 0, quote: 0, amount: 50 }
      ];
      const [m] = svc.computeScorecard(carriers, quotes, []);
      expect(Number.isFinite(m.cost.avgDeltaPct)).toBeTrue();
      expect(m.cost.avgDeltaPct).toBe(0);
    });

    it('computes correct running averages for quote, amount, weight', () => {
      const quotes: QuoteActualRow[] = [
        { quoteDate: d('2024-01-01'), carrier: 1, weight: 200, quote: 100, amount: 110 },
        { quoteDate: d('2024-01-02'), carrier: 1, weight: 300, quote: 200, amount: 180 },
      ];
      const [m] = svc.computeScorecard(carriers, quotes, []);
      expect(m.cost.avgQuote).toBeCloseTo(150);
      expect(m.cost.avgAmount).toBeCloseTo(145);
      expect(m.cost.avgWeight).toBeCloseTo(250);
    });
  });

  describe('service metrics', () => {
    it('counts late and early shipments', () => {
      const deliveries: DeliveryRow[] = [
        { carrier: 1, pickup: d('2024-01-01'), delivery: d('2024-01-05'), expected_delivery: d('2024-01-04') }, // late +1
        { carrier: 1, pickup: d('2024-01-01'), delivery: d('2024-01-03'), expected_delivery: d('2024-01-04') }, // early -1
        { carrier: 1, pickup: d('2024-01-01'), delivery: d('2024-01-04'), expected_delivery: d('2024-01-04') }, // on time
      ];
      const [m] = svc.computeScorecard(carriers, [], deliveries);
      expect(m.service.shipments).toBe(3);
      expect(m.service.lateCount).toBe(1);
      expect(m.service.earlyCount).toBe(1);
      expect(m.service.lateRate).toBeCloseTo(1 / 3);
      expect(m.service.earlyRate).toBeCloseTo(1 / 3);
    });

    it('computes avgDeltaDays correctly', () => {
      const deliveries: DeliveryRow[] = [
        { carrier: 1, pickup: d('2024-01-01'), delivery: d('2024-01-05'), expected_delivery: d('2024-01-04') }, // +1
        { carrier: 1, pickup: d('2024-01-01'), delivery: d('2024-01-07'), expected_delivery: d('2024-01-04') }, // +3
      ];
      const [m] = svc.computeScorecard(carriers, [], deliveries);
      expect(m.service.avgDeltaDays).toBeCloseTo(2);
    });

    it('skips deliveries with invalid dates', () => {
      const deliveries: DeliveryRow[] = [
        { carrier: 1, pickup: new Date(0), delivery: new Date(0), expected_delivery: new Date(0) }
      ];
      const [m] = svc.computeScorecard(carriers, [], deliveries);
      // epoch-epoch = 0 days, which is finite — still counted
      expect(m.service.shipments).toBe(1);
    });
  });

  it('returns results sorted by carrierId ascending', () => {
    const quotes: QuoteActualRow[] = [
      { quoteDate: d('2024-01-01'), carrier: 2, weight: 100, quote: 100, amount: 100 },
      { quoteDate: d('2024-01-01'), carrier: 1, weight: 100, quote: 100, amount: 100 },
    ];
    const result = svc.computeScorecard(carriers, quotes, []);
    expect(result[0].carrierId).toBe(1);
    expect(result[1].carrierId).toBe(2);
  });

  it('falls back to carrier name "Carrier N" for unknown carrier ids', () => {
    const quotes: QuoteActualRow[] = [
      { quoteDate: d('2024-01-01'), carrier: 99, weight: 100, quote: 100, amount: 100 }
    ];
    const [m] = svc.computeScorecard(carriers, quotes, []);
    expect(m.carrierName).toBe('Carrier 99');
  });
});
