import { all, first, bool } from '@/db';
import type { MonthSnapshot, CategoryInput } from '@/calc/types';

// Row shapes as returned by SQLite (snake_case, booleans as 0/1).
interface IncomeRow {
  id: string; month_year: string; label: string; category: string;
  amount_cents: number; is_archived: number;
}
interface CategoryRow {
  id: string; month_year: string; name: string;
  allocation_cap_percent: number | null; bucket: string | null;
  is_archived: number; sort_order: number;
}
interface ItemRow {
  id: string; category_id: string; month_year: string; name: string;
  budget_cap_cents: number; actual_spent_cents: number;
  rollover_enabled: number; rollover_cents: number;
  is_archived: number; sort_order: number;
}

// Reads a month and assembles the plain MonthSnapshot the calc engine consumes.
// Includes archived rows so history renders faithfully; the engine filters
// them from totals.
export async function loadMonthSnapshot(monthYear: string): Promise<MonthSnapshot> {
  const [incomeRows, categoryRows, itemRows] = await Promise.all([
    all<IncomeRow>('SELECT * FROM income_items WHERE month_year = ?', [monthYear]),
    all<CategoryRow>(
      'SELECT * FROM expense_categories WHERE month_year = ? ORDER BY sort_order ASC',
      [monthYear],
    ),
    all<ItemRow>('SELECT * FROM expense_items WHERE month_year = ? ORDER BY sort_order ASC', [
      monthYear,
    ]),
  ]);

  const itemsByCategory = new Map<string, ItemRow[]>();
  for (const it of itemRows) {
    const arr = itemsByCategory.get(it.category_id) ?? [];
    arr.push(it);
    itemsByCategory.set(it.category_id, arr);
  }

  const categories: CategoryInput[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    allocationCapPercent: c.allocation_cap_percent,
    bucket: (c.bucket as CategoryInput['bucket']) ?? null,
    isArchived: bool(c.is_archived),
    items: (itemsByCategory.get(c.id) ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      budgetCapCents: it.budget_cap_cents,
      actualSpentCents: it.actual_spent_cents,
      rolloverEnabled: bool(it.rollover_enabled),
      rolloverCents: it.rollover_cents,
      isArchived: bool(it.is_archived),
    })),
  }));

  return {
    monthYear,
    income: incomeRows.map((i) => ({
      id: i.id,
      label: i.label,
      category: i.category,
      amountCents: i.amount_cents,
      isArchived: bool(i.is_archived),
    })),
    categories,
  };
}

export async function isMonthLocked(monthYear: string): Promise<boolean> {
  const row = await first<{ is_locked: number }>(
    'SELECT is_locked FROM months WHERE month_year = ?',
    [monthYear],
  );
  return bool(row?.is_locked);
}

export async function listMonths(): Promise<{ monthYear: string; isLocked: boolean }[]> {
  const rows = await all<{ month_year: string; is_locked: number }>(
    'SELECT month_year, is_locked FROM months ORDER BY month_year ASC',
  );
  return rows.map((r) => ({ monthYear: r.month_year, isLocked: bool(r.is_locked) }));
}
