import {
  computeTotals,
  rollupMonth,
  computeBenchmark,
  computeRunway,
  itemVariance,
  monthDelta,
} from './engine';
import type { MonthSnapshot } from './types';

const emptyMonth = (my = '2026-06'): MonthSnapshot => ({
  monthYear: my,
  income: [],
  categories: [],
});

describe('edge cases (Phase 5)', () => {
  it('an entirely empty month yields all-zero totals, not NaN', () => {
    const t = computeTotals(emptyMonth());
    expect(t).toEqual({
      totalIncomeCents: 0,
      totalBudgetedCents: 0,
      totalActualCents: 0,
      expectedSavingsCents: 0,
      actualNetSavedCents: 0,
    });
    expect(rollupMonth(emptyMonth())).toEqual([]);
  });

  it('benchmark on an empty month never divides by zero', () => {
    const b = computeBenchmark(emptyMonth());
    expect(b.totalIncomeCents).toBe(0);
    expect(b.savingsRatePercent).toBe(0);
    b.buckets.forEach((x) => {
      expect(Number.isNaN(x.actualPercent)).toBe(false);
      expect(x.actualPercent).toBe(0);
    });
  });

  it('runway with one month and no spend reports infinite (savings) or zero', () => {
    const noSpend: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 100_000 }],
      categories: [],
    };
    expect(computeRunway([noSpend]).runwayMonths).toBe(Infinity);
    expect(computeRunway([emptyMonth()]).runwayMonths).toBe(0); // no savings, no spend
  });

  it('negative savings when overspending income', () => {
    const broke: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 500_000 }],
      categories: [{
        id: 'c', name: 'All', allocationCapPercent: null,
        items: [{ id: 'a', name: 'Splurge', budgetCapCents: 400_000, actualSpentCents: 800_000 }],
      }],
    };
    const t = computeTotals(broke);
    expect(t.actualNetSavedCents).toBe(-300_000);
    expect(t.expectedSavingsCents).toBe(100_000); // budget was within income
  });

  it('handles very large numbers within safe integer range', () => {
    const big = 9_000_000_000; // 90 million in cents
    const month: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: big }],
      categories: [{
        id: 'c', name: 'All', allocationCapPercent: null,
        items: [{ id: 'a', name: 'X', budgetCapCents: big, actualSpentCents: big }],
      }],
    };
    const t = computeTotals(month);
    expect(t.actualNetSavedCents).toBe(0);
    expect(Number.isSafeInteger(t.totalIncomeCents)).toBe(true);
  });

  it('deleting the last item (empty category) rolls up cleanly', () => {
    const month: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 100_000 }],
      categories: [{ id: 'c', name: 'Empty', allocationCapPercent: 20, items: [] }],
    };
    const rolls = rollupMonth(month);
    expect(rolls).toHaveLength(1);
    expect(rolls[0].budgetedCents).toBe(0);
    expect(rolls[0].actualCents).toBe(0);
    expect(rolls[0].state).toBe('on_track');
    expect(rolls[0].items).toEqual([]);
  });

  it('a fully archived category contributes nothing', () => {
    const month: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 100_000 }],
      categories: [{
        id: 'c', name: 'Gone', allocationCapPercent: null, isArchived: true,
        items: [{ id: 'a', name: 'Old', budgetCapCents: 50_000, actualSpentCents: 50_000 }],
      }],
    };
    expect(computeTotals(month).totalActualCents).toBe(0);
    expect(rollupMonth(month)).toEqual([]); // archived category filtered out
  });

  it('delta against an empty prior month equals current totals', () => {
    const cur: MonthSnapshot = {
      monthYear: '2026-06',
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 100_000 }],
      categories: [{
        id: 'c', name: 'All', allocationCapPercent: null,
        items: [{ id: 'a', name: 'X', budgetCapCents: 60_000, actualSpentCents: 40_000 }],
      }],
    };
    const d = monthDelta(cur, emptyMonth('2026-05'));
    expect(d.totalIncomeDelta).toBe(100_000);
    expect(d.actualNetSavedDelta).toBe(60_000);
  });

  it('rollover debt can push effective budget negative without NaN', () => {
    const v = itemVariance({
      id: 'x', name: 'Coffee', budgetCapCents: 0, actualSpentCents: 10_000,
      rolloverCents: -5_000,
    });
    expect(v.effectiveBudgetCents).toBe(-5_000);
    expect(v.state).toBe('over');
    expect(v.percentUsed).toBe(0); // guarded: no positive budget
  });
});
