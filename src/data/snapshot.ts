import { Q } from '@nozbe/watermelondb';
import { collections } from '@/db';
import type { MonthSnapshot, CategoryInput } from '@/calc/types';

// Reads a month out of the local DB and assembles the plain MonthSnapshot
// shape the pure calc engine consumes. Includes archived rows by default so
// history renders faithfully; the engine itself filters them from totals.
export async function loadMonthSnapshot(monthYear: string): Promise<MonthSnapshot> {
  const [incomeRows, categoryRows, itemRows] = await Promise.all([
    collections.income.query(Q.where('month_year', monthYear)).fetch(),
    collections.categories
      .query(Q.where('month_year', monthYear), Q.sortBy('sort_order', Q.asc))
      .fetch(),
    collections.items.query(Q.where('month_year', monthYear)).fetch(),
  ]);

  const itemsByCategory = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const arr = itemsByCategory.get(it.categoryId) ?? [];
    arr.push(it);
    itemsByCategory.set(it.categoryId, arr);
  }

  const categories: CategoryInput[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    allocationCapPercent: c.allocationCapPercent,
    bucket: c.bucket,
    isArchived: c.isArchived,
    items: (itemsByCategory.get(c.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((it) => ({
        id: it.id,
        name: it.name,
        budgetCapCents: it.budgetCapCents,
        actualSpentCents: it.actualSpentCents,
        rolloverEnabled: it.rolloverEnabled,
        rolloverCents: it.rolloverCents,
        isArchived: it.isArchived,
      })),
  }));

  return {
    monthYear,
    income: incomeRows.map((i) => ({
      id: i.id,
      label: i.label,
      category: i.category,
      amountCents: i.amountCents,
      isArchived: i.isArchived,
    })),
    categories,
  };
}
