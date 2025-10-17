import { Injectable } from '@angular/core';
import { CarrierRow, QuoteActualRow, DeliveryRow } from '../models/csv';
import { CarrierScoreMetrics } from '../models/scorecard';

@Injectable({ providedIn: 'root' })
export class ScorecardService {
  // Compute per-carrier cost and service metrics from CSV rows
  computeScorecard(
    carriers: CarrierRow[],
    quotes: QuoteActualRow[],
    deliveries: DeliveryRow[]
  ): CarrierScoreMetrics[] {
    // Map carrierId -> carrier for name/type lookup
    const byId = new Map<number, CarrierRow>(carriers.map(c => [c.TrnspCode, c]));
    // Accumulator map carrierId -> metrics object we build up
    const agg = new Map<number, CarrierScoreMetrics>();

    // Get-or-create metrics accumulator with documented fields
    const get = (id: number) => {
      if (!agg.has(id)) {
        const c = byId.get(id);
        agg.set(id, {
          carrierId: id,
          carrierName: c?.CarrierName ?? `Carrier ${id}`,
          truckType: c?.TruckType ?? 'LTL',
          // Cost metrics accumulator (from QUOTESvsACTUAL.csv)
          cost: {
            // counts
            quoteCount: 0,
            overCount: 0,            // number of shipments where amount > quote
            underCount: 0,           // number of shipments where amount < quote
            // sums
            extraChargesTotal: 0,    // sum(amount - quote) where amount > quotes (overs)
            underQuotedTotal: 0,     // sum(quote - amount) where amount < quotes (unders)
            // running average Deltas
            avgDelta: 0,             // average of (amount - quote)
            avgDeltaPct: 0,          // average of (amount - quote)/quote), quote > 0 only
            // straightforward averages/rates
            avgQuote: 0,             // average quote
            avgAmount: 0,            // average amount charged
            avgWeight: 0,            // mean(weight)
            // conditional means among subsets
            avgOverCharge: 0,        // average over charge (amount - quote) among overs
            avgUnderCredit: 0,       // average under charge (quote - amount) among unders
            // simple rates
            overRate: 0,             // over charge Count / total quote Count
            underRate: 0             // under charge Count / total quote Count
          },
          // Service metrics accumulator (from deliveries.csv)
          service: {
            shipments: 0,            // number of delivery records
            // delta mean
            avgDeltaDays: 0,         // average (actualDays - expectedDays)
            // counts and rates
            lateCount: 0,            // number of shipments where actualDays > expectedDays
            earlyCount: 0,           // number of shipments where actualDays < expectedDays
            lateRate: 0,             // lateCount / shipments
            earlyRate: 0,            // earlyCount / shipments
            // straightforward averages
            avgActualDays: 0,        // average actual transit days)
            avgExpectedDays: 0       // average expected transit days)
          }
        });
      }
      return agg.get(id)!;
    };

    // Cost aggregates (Quote vs Amount)
    // For each quote/actual row, update the carrier's metrics
    // (cost counters, sums, and averages)
    for (const q of quotes) {
      const m = get(q.carrier);

      // Delta in dollars: postive means
      //  charged > quoted (over);
      //  negative means under
      const delta = q.amount - q.quote;
      // Delta percent of quote (for normalization); handle zero quote case
      const pct = q.quote > 0 ? delta / q.quote : 0;

      // Total quotes for averages and rates
      m.cost.quoteCount++;
      const nQ = m.cost.quoteCount;

      // Straightforward averages for quote, amount(charged), and weight
      m.cost.avgQuote  += (q.quote  - m.cost.avgQuote)  / nQ;
      m.cost.avgAmount += (q.amount - m.cost.avgAmount) / nQ;
      m.cost.avgWeight += (q.weight - m.cost.avgWeight) / nQ;

      // Over/under tallies, sums, and conditional averages
      if (delta > 0) {
        // Over charge case
        m.cost.overCount++;
        m.cost.extraChargesTotal += delta;
        //Update average for over charges
        const kOver = m.cost.overCount;
        m.cost.avgOverCharge += (delta - m.cost.avgOverCharge) / kOver;
      } else if (delta < 0) {
        // Under charge case
        m.cost.underCount++;
        m.cost.underQuotedTotal += -delta; // add positive amount
        // Update average for under credits (money saved(less charged))
        const kUnder = m.cost.underCount;
        m.cost.avgUnderCredit += ((-delta) - m.cost.avgUnderCredit) / kUnder;
      }

      // Running averages for deltas
      m.cost.avgDelta    += (delta - m.cost.avgDelta)    / nQ;
      m.cost.avgDeltaPct += (pct   - m.cost.avgDeltaPct) / nQ;

      // Rates based on current totals
      m.cost.overRate  = m.cost.overCount  / nQ;
      m.cost.underRate = m.cost.underCount / nQ;
    }

    // Service aggregates (Actual vs Expected days) -- deliveries.csv
    // For each delivery row, update the carrier's metrics (service counters, sums, and averages)
    const msPerDay = 86_400_000;
    for (const d of deliveries) {
      const m = get(d.carrier);

      // Actual transit days: delivery - pickup
      const actualDays   = (d.delivery.getTime()          - d.pickup.getTime())          / msPerDay;
      // Expected transit days: expected_delivery - pickup
      const expectedDays = (d.expected_delivery.getTime() - d.pickup.getTime())          / msPerDay;
      if (!Number.isFinite(actualDays) || !Number.isFinite(expectedDays)) continue;

      // Positive = late, negative = early
      const deltaDays = actualDays - expectedDays;

      // Shipments count (used by running averages and rates)
      m.service.shipments++;
      const nS = m.service.shipments;

      // Straightforward running averages
      m.service.avgActualDays   += (actualDays   - m.service.avgActualDays)   / nS;
      m.service.avgExpectedDays += (expectedDays - m.service.avgExpectedDays) / nS;

      // Late/Early counters
      if (deltaDays > 0) m.service.lateCount++;
      else if (deltaDays < 0) m.service.earlyCount++;

      // Days Delta average
      m.service.avgDeltaDays += (deltaDays - m.service.avgDeltaDays) / nS;

      // Derived Rates
      m.service.lateRate  = m.service.lateCount  / nS;
      m.service.earlyRate = m.service.earlyCount / nS;
    }

    // Return Sorted array of metrics (by carrierId)
    return Array.from(agg.values()).sort((a, b) => a.carrierId - b.carrierId);
  }
}
