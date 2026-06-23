import {
  computeTotals,
  totalIncome,
  totalBudgeted,
  totalActual,
  itemVariance,
  categoryRollup,
  classifyVariance,
  monthDelta,
  rolloverCarry,
  computeRunway,
  computeBenchmark,
} from './engine';
import type { MonthSnapshot } from './types';

// Sample month built directly from the uploaded spec (Section 2), in cents.
const june: MonthSnapshot = {
  monthYear: '2026-06',
  income: [
    { id: 'INC-001', label: 'Monthly Salary', category: 'Primary Job', amountCents: 3_500_000 },
    { id: 'INC-002', label: 'Side Freelance', category: 'Side Hustle', amountCents: 250_000 },
  ],
  categories: [
    {
      id: 'CAT-ESS',
      name: 'Essentials',
      allocationCapPercent: 60,
      items: [
        { id: 'E-001', name: 'Rent', budgetCapCents: 1_400_000, actualSpentCents: 1_400_000 },
        { id: 'E-002', name: 'Electric', budgetCapCents: 80_000, actualSpentCents: 82_000 },
        { id: 'E-003', name: 'Internet', budgetCapCents: 130_000, actualSpentCents: 130_000 },
      ],
    },
    {
      id: 'CAT-LIF',
      name: 'Lifestyle',
      allocationCapPercent: 20,
      items: [
        { id: 'L-001', name: 'Date', budgetCapCents: 300_000, actualSpentCents: 120_000 },
        { id: 'L-002', name: 'Coffee', budgetCapCents: 100_000, actualSpentCents: 115_000 },
      ],
    },
  ],
};

describe('headline totals (Section 3 matrix)', () => {
  it('totals income across sources', () => {
    expect(totalIncome(june.income)).toBe(3_750_000);
  });

  it('sums all budget caps', () => {
    // 1,400,000 + 80,000 + 130,000 + 300,000 + 100,000
    expect(totalBudgeted(june.categories)).toBe(2_010_000);
  });

  it('sums all actual spend', () => {
    // 1,400,000 + 82,000 + 130,000 + 120,000 + 115,000
    expect(totalActual(june.categories)).toBe(1_847_000);
  });

  it('computes expected and actual savings', () => {
    const t = computeTotals(june);
    expect(t.expectedSavingsCents).toBe(3_750_000 - 2_010_000); // 1,740,000
    expect(t.actualNetSavedCents).toBe(3_750_000 - 1_847_000); // 1,903,000
  });
});

describe('archiving never corrupts totals', () => {
  it('excludes archived income and items', () => {
    const withArchived: MonthSnapshot = {
      ...june,
      income: [...june.income, { id: 'X', label: 'Ghost', category: 'Old', amountCents: 999_999, isArchived: true }],
      categories: [
        {
          ...june.categories[0],
          items: [
            ...june.categories[0].items,
            { id: 'Z', name: 'Removed', budgetCapCents: 50_000, actualSpentCents: 50_000, isArchived: true },
          ],
        },
        june.categories[1],
      ],
    };
    expect(totalIncome(withArchived.income)).toBe(3_750_000);
    expect(totalBudgeted(withArchived.categories)).toBe(2_010_000);
  });
});

describe('item variance & color state', () => {
  it('flags an over-budget item (Electric)', () => {
    const v = itemVariance(june.categories[0].items[1]);
    expect(v.state).toBe('over');
    expect(v.varianceCents).toBe(-2_000); // 80,000 - 82,000
  });

  it('flags an under-budget item (Date)', () => {
    const v = itemVariance(june.categories[1].items[0]);
    expect(v.state).toBe('under');
    expect(v.varianceCents).toBe(180_000);
    expect(v.percentUsed).toBeCloseTo(40);
  });

  it('handles zero-budget item without dividing by zero', () => {
    const v = itemVariance({ id: 'q', name: 'NoBudget', budgetCapCents: 0, actualSpentCents: 5_000 });
    expect(v.percentUsed).toBe(0);
    expect(v.state).toBe('over');
  });

  it('classifies on_track when equal', () => {
    expect(classifyVariance(100, 100)).toBe('on_track');
  });
});

describe('category rollup & allocation cap', () => {
  it('rolls up essentials actuals and share of income', () => {
    const r = categoryRollup(june.categories[0], totalIncome(june.income));
    expect(r.actualCents).toBe(1_612_000);
    // 1,612,000 / 3,750,000 ≈ 42.99%  → under the 60% cap
    expect(r.actualSharePercent).toBeCloseTo(42.99, 1);
    expect(r.capExceeded).toBe(false);
  });
});

describe('smart rollover (Phase 4)', () => {
  it('raises the effective budget by the carried-in credit', () => {
    const v = itemVariance({
      id: 'r', name: 'Coffee', budgetCapCents: 100_000, actualSpentCents: 115_000,
      rolloverCents: 30_000, // carried 300.00 from last month
    });
    expect(v.effectiveBudgetCents).toBe(130_000);
    expect(v.varianceCents).toBe(15_000); // now under, not over
    expect(v.state).toBe('under');
  });

  it('carries unspent forward only when enabled', () => {
    const base = { id: 'x', name: 'Date', budgetCapCents: 300_000, actualSpentCents: 120_000 };
    expect(rolloverCarry({ ...base, rolloverEnabled: false })).toBe(0);
    expect(rolloverCarry({ ...base, rolloverEnabled: true })).toBe(180_000);
  });

  it('carries overspend as a negative debt', () => {
    const carry = rolloverCarry({
      id: 'y', name: 'Coffee', budgetCapCents: 100_000, actualSpentCents: 115_000,
      rolloverEnabled: true,
    });
    expect(carry).toBe(-15_000);
  });
});

describe('predictive runway (Phase 4)', () => {
  it('estimates months of runway from history', () => {
    // Two months: income 1,000,000 each; spend 800,000 each → save 200,000 each.
    const mk = (my: string): MonthSnapshot => ({
      monthYear: my,
      income: [{ id: 'i', label: 'Pay', category: 'Job', amountCents: 1_000_000 }],
      categories: [{
        id: 'c', name: 'All', allocationCapPercent: null,
        items: [{ id: 'a', name: 'Stuff', budgetCapCents: 800_000, actualSpentCents: 800_000 }],
      }],
    });
    const r = computeRunway([mk('2026-04'), mk('2026-05')]);
    expect(r.monthsAnalyzed).toBe(2);
    expect(r.avgMonthlySpendCents).toBe(800_000);
    expect(r.savingsCents).toBe(400_000); // 200k + 200k
    expect(r.runwayMonths).toBeCloseTo(0.5); // 400k / 800k
  });

  it('handles empty history', () => {
    const r = computeRunway([]);
    expect(r.runwayMonths).toBe(0);
  });
});

describe('50/30/20 benchmark (Phase 4)', () => {
  it('buckets actuals and flags within/over target', () => {
    const tagged: MonthSnapshot = {
      ...june,
      categories: [
        { ...june.categories[0], bucket: 'needs' }, // Essentials actual 1,612,000
        { ...june.categories[1], bucket: 'wants' }, // Lifestyle actual 235,000
      ],
    };
    const b = computeBenchmark(tagged);
    expect(b.totalIncomeCents).toBe(3_750_000);
    const needs = b.buckets.find((x) => x.bucket === 'needs')!;
    expect(needs.targetCents).toBe(1_875_000); // 50% of income
    expect(needs.actualCents).toBe(1_612_000);
    expect(needs.withinTarget).toBe(true); // under 50%
    const savings = b.buckets.find((x) => x.bucket === 'savings')!;
    // net saved = 3,750,000 - 1,847,000 = 1,903,000 → well above 20% target
    expect(savings.actualCents).toBe(1_903_000);
    expect(savings.withinTarget).toBe(true);
  });
});

describe('month-vs-month delta', () => {
  it('reports positive delta when current saves more', () => {
    const may: MonthSnapshot = {
      ...june,
      monthYear: '2026-05',
      categories: [
        {
          ...june.categories[0],
          items: june.categories[0].items.map((i) => ({ ...i, actualSpentCents: i.actualSpentCents + 50_000 })),
        },
        june.categories[1],
      ],
    };
    const d = monthDelta(june, may);
    // June spent less, so net saved is higher in June.
    expect(d.actualNetSavedDelta).toBe(150_000);
  });
});
