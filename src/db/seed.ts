import { getDb, all, first, run, makeId } from '@/db';
import { currentMonthYear } from '@/utils/date';
import { SALARY_INCOME, BUDGET_TEMPLATE } from './template';
import { copyBaselineToNewMonth } from '@/data/repository';

// Seed a month from the fixed budget template (salary + Needs/Wants/Savings).
export async function seedTemplate(monthYear: string): Promise<void> {
  const now = Date.now();
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR IGNORE INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [monthYear, now]);

    await db.runAsync(
      'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [makeId('INC'), monthYear, SALARY_INCOME.label, SALARY_INCOME.category, SALARY_INCOME.amountCents, now],
    );

    let order = 0;
    for (const cat of BUDGET_TEMPLATE) {
      const catId = makeId('CAT');
      await db.runAsync(
        'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [catId, monthYear, cat.name, cat.capPercent, cat.bucket, order++, now],
      );
      let itemOrder = 0;
      for (const it of cat.items) {
        await db.runAsync(
          'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)',
          [makeId('E'), catId, monthYear, it.name, it.budgetCents, itemOrder++, now],
        );
      }
    }
  });
}

/**
 * Ensures the current calendar month exists. Months are never created by hand:
 * - first ever launch → seed from the template
 * - otherwise → carry the most recent month's structure forward (budgets kept,
 *   actuals reset, salary income copied), so each new month "arrives" ready.
 * Called on every launch, so reopening the app in a new month creates it.
 */
export async function ensureCurrentMonth(): Promise<string> {
  const my = currentMonthYear();
  const exists = await first('SELECT month_year FROM months WHERE month_year = ?', [my]);
  if (exists) return my;

  const latest = await first<{ month_year: string }>(
    'SELECT month_year FROM months ORDER BY month_year DESC LIMIT 1',
  );
  if (latest && latest.month_year < my) {
    await copyBaselineToNewMonth(latest.month_year, my);
  } else {
    await seedTemplate(my);
  }
  return my;
}

/**
 * Zero-based budgeting: ensure each month's budget allocates the whole income.
 * One-time, non-destructive — for any month whose Savings bucket has no
 * "Savings" line, add one for the unallocated remainder (income − budgeted).
 * Skips months already fully allocated, so it never rebalances on later edits.
 */
export async function fullyAllocateSavings(): Promise<void> {
  const months = await all<{ month_year: string }>('SELECT month_year FROM months');
  for (const { month_year: my } of months) {
    const cat = await first<{ id: string }>(
      "SELECT id FROM expense_categories WHERE month_year = ? AND bucket = 'savings' AND is_archived = 0 ORDER BY sort_order LIMIT 1",
      [my],
    );
    if (!cat) continue;
    const existing = await first(
      "SELECT id FROM expense_items WHERE category_id = ? AND name = 'Savings' AND is_archived = 0",
      [cat.id],
    );
    if (existing) continue;

    const inc = await first<{ s: number }>(
      'SELECT COALESCE(SUM(amount_cents),0) AS s FROM income_items WHERE month_year = ? AND is_archived = 0',
      [my],
    );
    const bud = await first<{ s: number }>(
      'SELECT COALESCE(SUM(budget_cap_cents),0) AS s FROM expense_items WHERE month_year = ? AND is_archived = 0',
      [my],
    );
    const remainder = (inc?.s ?? 0) - (bud?.s ?? 0);
    if (remainder <= 0) continue;

    const cnt = await first<{ n: number }>('SELECT COUNT(*) AS n FROM expense_items WHERE category_id = ?', [cat.id]);
    await run(
      'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)',
      [makeId('E'), cat.id, my, 'Savings', remainder, cnt?.n ?? 0, Date.now()],
    );
  }
}
