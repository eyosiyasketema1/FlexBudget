import {
  computeSafeToSpend,
  computeComposition,
  topSpendItems,
  overspentItems,
  computeSavingsGoal,
  buildTrends,
  computeBudgetAllocation,
} from './analytics';
import type { MonthSnapshot } from './types';

// Income 1,000,000 (10k). Needs item 600k (spent 300k), Wants item 200k (spent 250k = over).
const month = (my: string, needsActual = 300_000, wantsActual = 250_000): MonthSnapshot => ({
  monthYear: my,
  income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 1_000_000 }],
  categories: [
    { id: 'n', name: 'Needs', allocationCapPercent: null, bucket: 'needs', items: [{ id: 'rent', name: 'Rent', budgetCapCents: 600_000, actualSpentCents: needsActual }] },
    { id: 'w', name: 'Wants', allocationCapPercent: null, bucket: 'wants', items: [{ id: 'fun', name: 'Fun', budgetCapCents: 200_000, actualSpentCents: wantsActual }] },
  ],
});

describe('safe to spend (Phase: analytics)', () => {
  it('computes remaining and daily allowance mid-month', () => {
    // 15th of a 30-day month → 15 days elapsed, 15 left
    const s = computeSafeToSpend(month('2026-06'), new Date(2026, 5, 15, 12));
    expect(s.daysInMonth).toBe(30);
    expect(s.daysElapsed).toBe(15);
    expect(s.daysLeft).toBe(15);
    expect(s.budgetedCents).toBe(800_000);
    expect(s.spentCents).toBe(550_000);
    expect(s.remainingCents).toBe(250_000);
    expect(s.dailyAllowanceCents).toBe(Math.round(250_000 / 15));
    // pace: spent 550k over 15 days → projected 1,100,000 > 800k budget → off pace
    expect(s.projectedSpendCents).toBe(1_100_000);
    expect(s.onPace).toBe(false);
  });

  it('past month counts as fully elapsed (no days left)', () => {
    const s = computeSafeToSpend(month('2026-05'), new Date(2026, 5, 15));
    expect(s.daysLeft).toBe(0);
    expect(s.dailyAllowanceCents).toBe(0);
  });

  it('breaks remaining down per bucket', () => {
    const s = computeSafeToSpend(month('2026-06'), new Date(2026, 5, 10));
    const needs = s.perBucket.find((b) => b.bucket === 'needs')!;
    expect(needs.remainingCents).toBe(300_000); // 600k - 300k
  });
});

describe('composition', () => {
  it('splits spending across buckets', () => {
    const c = computeComposition(month('2026-06'));
    expect(c.totalSpentCents).toBe(550_000);
    const needs = c.slices.find((s) => s.bucket === 'needs')!;
    expect(needs.percent).toBeCloseTo((300_000 / 550_000) * 100, 1);
  });

  it('lists top spend items and overspends', () => {
    const top = topSpendItems(month('2026-06'));
    expect(top[0].name).toBe('Rent'); // 300k > 250k
    const over = overspentItems(month('2026-06'));
    expect(over).toHaveLength(1);
    expect(over[0].name).toBe('Fun'); // 250k of 200k
    expect(over[0].varianceCents).toBe(-50_000);
  });
});

describe('savings goal', () => {
  it('tracks progress to a target', () => {
    // net saved = income 1,000,000 - spent 550,000 = 450,000
    const g = computeSavingsGoal(month('2026-06'), 400_000);
    expect(g.savedCents).toBe(450_000);
    expect(g.met).toBe(true);
    expect(g.percent).toBeCloseTo(112.5, 1);
    expect(g.shortfallCents).toBe(0);
  });

  it('reports shortfall when under target', () => {
    const g = computeSavingsGoal(month('2026-06'), 600_000);
    expect(g.met).toBe(false);
    expect(g.shortfallCents).toBe(150_000);
  });
});

describe('budget allocation appraisal (50/30/20 on the plan)', () => {
  it('rates each bucket budget against its target', () => {
    // income 1,000,000. Needs budget 600k = 60% (>50 target → over). Wants 200k = 20% (<30 ok). No savings.
    const a = computeBudgetAllocation(month('2026-06'));
    expect(a.incomeCents).toBe(1_000_000);
    expect(a.totalBudgetedCents).toBe(800_000);
    expect(a.unallocatedCents).toBe(200_000);
    const needs = a.buckets.find((b) => b.bucket === 'needs')!;
    expect(needs.percentOfIncome).toBe(60);
    expect(needs.targetPercent).toBe(50);
    expect(needs.withinTarget).toBe(false); // 60% > 50%
    const wants = a.buckets.find((b) => b.bucket === 'wants')!;
    expect(wants.withinTarget).toBe(true); // 20% <= 30%
  });
});

describe('trends', () => {
  it('builds an ordered per-month series', () => {
    const series = buildTrends([month('2026-06', 300_000, 250_000), month('2026-05', 200_000, 100_000)]);
    expect(series.map((p) => p.monthYear)).toEqual(['2026-05', '2026-06']);
    // May spent 300k → saved 700k; June spent 550k → saved 450k
    expect(series[0].netSavedCents).toBe(700_000);
    expect(series[1].netSavedCents).toBe(450_000);
    expect(series[0].savingsRatePercent).toBeCloseTo(70, 1);
  });
});
