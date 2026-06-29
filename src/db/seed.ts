import { getDb, all, first, run, makeId, notifyChange } from '@/db';
import { currentPeriodKey } from '@/utils/date';
import { SALARY_INCOME, BUDGET_TEMPLATE } from './template';
import { copyBaselineToNewMonth, rebalanceSavings } from '@/data/repository';

/**
 * Wipe ALL data to a blank start: no income, no categories, no expenses, no
 * history. Leaves a single EMPTY current month so the app doesn't auto-reseed
 * the template (ensureCurrentMonth only seeds when there are zero months).
 */
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  const my = currentPeriodKey();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM expense_entries; DELETE FROM expense_items; DELETE FROM expense_categories; DELETE FROM income_items; DELETE FROM months; DELETE FROM settings;',
    );
    await db.runAsync('INSERT INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [my, Date.now()]);
  });
  notifyChange();
}

// Seed a month from the budget template. When `salaryCents` is given (from
// onboarding), each category's sub-budgets are SCALED to the 50/20/10/20 rule
// applied to the user's salary — so a 20,000 salary gets a 20,000-sized plan,
// not the fixed 35,000 amounts. Savings is the rebalanced remainder.
export async function seedTemplate(monthYear: string, salaryCents?: number): Promise<void> {
  const now = Date.now();
  const useSalary = salaryCents && salaryCents > 0;
  const amount = useSalary ? salaryCents! : SALARY_INCOME.amountCents;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR IGNORE INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [monthYear, now]);

    await db.runAsync(
      'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [makeId('INC'), monthYear, SALARY_INCOME.label, SALARY_INCOME.category, amount, now],
    );

    let order = 0;
    for (const cat of BUDGET_TEMPLATE) {
      const catId = makeId('CAT');
      await db.runAsync(
        'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [catId, monthYear, cat.name, cat.capPercent, cat.bucket, order++, now],
      );

      // Scale this category's sub-budgets to (cap% × salary), keeping each
      // sub-item's relative share. Savings is left to rebalanceSavings.
      const itemsTotal = cat.items.reduce((s, it) => s + it.budgetCents, 0) || 1;
      const target = useSalary ? Math.round((cat.capPercent / 100) * amount) : null;

      let itemOrder = 0;
      for (const it of cat.items) {
        const budget = target != null ? Math.round(target * (it.budgetCents / itemsTotal)) : it.budgetCents;
        await db.runAsync(
          'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)',
          [makeId('E'), catId, monthYear, it.name, budget, itemOrder++, now],
        );
      }
    }
  });
  // Savings absorbs any rounding remainder so the plan totals the salary exactly.
  if (useSalary) await rebalanceSavings(monthYear);
}

/**
 * Ensures the current calendar month exists. Months are never created by hand:
 * - first ever launch → seed from the template
 * - otherwise → carry the most recent month's structure forward (budgets kept,
 *   actuals reset, salary income copied), so each new month "arrives" ready.
 * Called on every launch, so reopening the app in a new month creates it.
 */
/**
 * Returns the period to show as "current", creating it only when it's a genuine
 * forward rollover. Guarantees against the old data-clearing bug:
 *  - first ever launch (no data) → seed the template
 *  - current period already exists → use it
 *  - current period is strictly AFTER all existing periods → carry the latest
 *    forward (real budgets, actuals reset) — never the dummy template
 *  - current period is at/ before existing data (e.g. the tail of a pay cycle)
 *    → DON'T create anything; stay on the latest existing period
 */
export async function ensureCurrentMonth(): Promise<string> {
  const my = currentPeriodKey();
  const exists = await first('SELECT month_year FROM months WHERE month_year = ?', [my]);
  if (exists) return my;

  const latest = await first<{ month_year: string }>(
    'SELECT month_year FROM months ORDER BY month_year DESC LIMIT 1',
  );
  if (!latest) {
    await seedTemplate(my);
    return my;
  }
  if (my > latest.month_year) {
    await copyBaselineToNewMonth(latest.month_year, my);
    return my;
  }
  // Don't create a backwards/duplicate period — keep the user on real data.
  return latest.month_year;
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
