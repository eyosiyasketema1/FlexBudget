import { rebalanceSavingsSnapshot } from './analytics';
import { computeTotals } from './engine';
import type { MonthSnapshot } from './types';

// Build the real default plan (cents). Income 35,000.
function plan(extra?: { name: string; bucket: 'needs' | 'wants' | 'savings' | 'church'; cents: number }): MonthSnapshot {
  const cats: MonthSnapshot['categories'] = [
    {
      id: 'needs', name: 'Needs', allocationCapPercent: 50, bucket: 'needs',
      items: [
        { id: 'rent', name: 'Rent', budgetCapCents: 1_400_000, actualSpentCents: 0 },
        { id: 'elec', name: 'Electric', budgetCapCents: 80_000, actualSpentCents: 0 },
        { id: 'net', name: 'Internet', budgetCapCents: 130_000, actualSpentCents: 0 },
        { id: 'water', name: 'Water', budgetCapCents: 33_000, actualSpentCents: 0 },
        { id: 'home', name: 'Home expense', budgetCapCents: 300_000, actualSpentCents: 0 },
        { id: 'trans', name: 'Transport', budgetCapCents: 150_000, actualSpentCents: 0 },
        { id: 'util', name: 'Utilities personal', budgetCapCents: 100_000, actualSpentCents: 0 },
      ],
    },
    {
      id: 'wants', name: 'Wants', allocationCapPercent: 20, bucket: 'wants',
      items: [
        { id: 'date', name: 'Date', budgetCapCents: 300_000, actualSpentCents: 0 },
        { id: 'coffee', name: 'Coffee', budgetCapCents: 100_000, actualSpentCents: 0 },
        { id: 'gym', name: 'Gym', budgetCapCents: 150_000, actualSpentCents: 0 },
      ],
    },
    {
      id: 'church', name: 'Church', allocationCapPercent: 10, bucket: 'church',
      items: [{ id: 'tithe', name: 'Tithe and gift', budgetCapCents: 330_000, actualSpentCents: 0 }],
    },
    {
      id: 'savings', name: 'Savings', allocationCapPercent: 20, bucket: 'savings',
      items: [{ id: 'sav', name: 'Savings', budgetCapCents: 427_000, actualSpentCents: 0 }],
    },
  ];
  if (extra) {
    const cat = cats.find((c) => c.bucket === extra.bucket)!;
    cat.items.push({ id: extra.name, name: extra.name, budgetCapCents: extra.cents, actualSpentCents: 0 });
  }
  return {
    monthYear: '2026-06',
    income: [{ id: 'i', label: 'Salary Account', category: 'Primary Job', amountCents: 3_500_000 }],
    categories: cats,
  };
}

describe('zero-based Savings rebalance', () => {
  it('default plan already totals income (35,000)', () => {
    expect(computeTotals(plan()).totalBudgetedCents).toBe(3_500_000);
  });

  it('adding a 300 Sacco saving is taken OUT of Savings — total stays 35,000', () => {
    // Add a 300 (30,000c) "Sacco" line in the savings bucket → raw total 35,300.
    const before = plan({ name: 'Sacco', bucket: 'savings', cents: 30_000 });
    expect(computeTotals(before).totalBudgetedCents).toBe(3_530_000); // 35,300 before balancing

    const after = rebalanceSavingsSnapshot(before);
    expect(computeTotals(after).totalBudgetedCents).toBe(3_500_000); // back to 35,000

    // Savings remainder dropped by exactly 300 (427,000 → 397,000)
    const sav = after.categories.find((c) => c.bucket === 'savings')!.items.find((i) => i.id === 'sav')!;
    expect(sav.budgetCapCents).toBe(397_000);
  });

  it('over-spending a Needs item by 300 also pulls from Savings', () => {
    const before = plan();
    before.categories[0].items[0].budgetCapCents += 30_000; // Rent +300 → 35,300
    expect(computeTotals(before).totalBudgetedCents).toBe(3_530_000);

    const after = rebalanceSavingsSnapshot(before);
    expect(computeTotals(after).totalBudgetedCents).toBe(3_500_000);
    const sav = after.categories.find((c) => c.bucket === 'savings')!.items[0];
    expect(sav.budgetCapCents).toBe(397_000);
  });

  it('clamps Savings at 0 when other budgets exceed income', () => {
    const before = plan({ name: 'Big', bucket: 'needs', cents: 1_000_000 }); // +10,000
    const after = rebalanceSavingsSnapshot(before);
    const sav = after.categories.find((c) => c.bucket === 'savings')!.items.find((i) => i.id === 'sav')!;
    expect(sav.budgetCapCents).toBe(0);
  });
});
