export interface CarrierScoreMetrics {
  carrierId: number;
  carrierName: string;
  truckType: 'LTL' | 'TL';
  cost: {
    quoteCount: number;
    overCount: number;
    underCount: number;
    extraChargesTotal: number;
    underQuotedTotal: number;
    avgDelta: number;        // mean(amount - quote)
    avgDeltaPct: number;     // mean((amount - quote)/quote)
    avgQuote: number;        // mean(quote)
    avgAmount: number;       // mean(amount)
    avgWeight: number;       // mean(weight)
    avgOverCharge: number;   // mean(amount - quote) among overs
    avgUnderCredit: number;  // mean(quote - amount) among unders
    overRate: number;        // overCount / quoteCount
    underRate: number;       // underCount / quoteCount
  };
  service: {
    shipments: number;
    avgDeltaDays: number;    // mean(actualDays - expectedDays)
    lateCount: number;
    earlyCount: number;
    avgActualDays: number;   // mean(actual transit days)
    avgExpectedDays: number; // mean(expected transit days)
    lateRate: number;        // lateCount / shipments
    earlyRate: number;       // earlyCount / shipments
  };
}
