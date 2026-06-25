import { all, first, run, getDb, makeId, bool, toInt, notifyChange } from '@/db';
import { nextMonth } from '@/utils/date';
import { rolloverCarry } from '@/calc/engine';
import type { Bucket } from '@/calc/types';

// All writes go through here so behavior (archiving, locking, month-copy,
// rollover) is consistent. Nothing hard-deletes user financial data. Every
// mutation calls notifyChange() so observing hooks refresh.

async function assertUnlocked(monthYear: string): Promise<void> {
  const row = await first<{ is_locked: number }>(
    'SELECT is_locked FROM months WHERE month_year = ?',
    [monthYear],
  );
  if (bool(row?.is_locked)) {
    throw new Error(`Month ${monthYear} is locked and cannot be edited.`);
  }
}

export async function ensureMonth(monthYear: string): Promise<void> {
  const existing = await first('SELECT month_year FROM months WHERE month_year = ?', [monthYear]);
  if (existing) return;
  await run('INSERT INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [
    monthYear,
    Date.now(),
  ]);
  notifyChange();
}

// ── Single-row getters (used by forms) ──────────────────────────────────────
export interface IncomeRowDto {
  id: string; label: string; category: string; amountCents: number; monthYear: string;
}
export async function getIncome(id: string): Promise<IncomeRowDto | null> {
  const r = await first<any>('SELECT * FROM income_items WHERE id = ?', [id]);
  return r ? { id: r.id, label: r.label, category: r.category, amountCents: r.amount_cents, monthYear: r.month_year } : null;
}

export interface CategoryRowDto {
  id: string; name: string; allocationCapPercent: number | null; bucket: Bucket | null; monthYear: string;
}
export async function getCategory(id: string): Promise<CategoryRowDto | null> {
  const r = await first<any>('SELECT * FROM expense_categories WHERE id = ?', [id]);
  return r ? { id: r.id, name: r.name, allocationCapPercent: r.allocation_cap_percent, bucket: r.bucket ?? null, monthYear: r.month_year } : null;
}

export interface ItemRowDto {
  id: string; categoryId: string; name: string; budgetCapCents: number; actualSpentCents: number;
  rolloverEnabled: boolean; rolloverCents: number; monthYear: string;
}
export async function getItem(id: string): Promise<ItemRowDto | null> {
  const r = await first<any>('SELECT * FROM expense_items WHERE id = ?', [id]);
  return r ? {
    id: r.id, categoryId: r.category_id, name: r.name, budgetCapCents: r.budget_cap_cents, actualSpentCents: r.actual_spent_cents,
    rolloverEnabled: bool(r.rollover_enabled), rolloverCents: r.rollover_cents, monthYear: r.month_year,
  } : null;
}

/** Move a sub-category (item) to a different main category. */
export async function moveItemToCategory(itemId: string, newCategoryId: string) {
  const row = await getItem(itemId);
  if (!row || row.categoryId === newCategoryId) return;
  await assertUnlocked(row.monthYear);
  const cnt = await first<{ n: number }>('SELECT COUNT(*) AS n FROM expense_items WHERE category_id = ?', [newCategoryId]);
  await run('UPDATE expense_items SET category_id = ?, sort_order = ? WHERE id = ?', [newCategoryId, cnt?.n ?? 0, itemId]);
  notifyChange();
}

// ── Income ──────────────────────────────────────────────────────────────────
export async function addIncome(
  monthYear: string,
  data: { label: string; category: string; amountCents: number },
) {
  await assertUnlocked(monthYear);
  await run(
    'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [makeId('INC'), monthYear, data.label, data.category, data.amountCents, Date.now()],
  );
  notifyChange();
}

export async function updateIncome(
  id: string,
  data: { label: string; category: string; amountCents: number },
) {
  const row = await getIncome(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE income_items SET label = ?, category = ?, amount_cents = ? WHERE id = ?', [
    data.label, data.category, data.amountCents, id,
  ]);
  notifyChange();
}

export async function archiveIncome(id: string) {
  const row = await getIncome(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE income_items SET is_archived = 1 WHERE id = ?', [id]);
  notifyChange();
}

// ── Categories ──────────────────────────────────────────────────────────────
export async function addCategory(
  monthYear: string,
  data: { name: string; allocationCapPercent: number | null; bucket?: Bucket | null },
) {
  await assertUnlocked(monthYear);
  const c = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM expense_categories WHERE month_year = ?',
    [monthYear],
  );
  await run(
    'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [makeId('CAT'), monthYear, data.name, data.allocationCapPercent, data.bucket ?? null, c?.n ?? 0, Date.now()],
  );
  notifyChange();
}

export async function updateCategory(
  id: string,
  data: { name: string; allocationCapPercent: number | null; bucket?: Bucket | null },
) {
  const row = await getCategory(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE expense_categories SET name = ?, allocation_cap_percent = ?, bucket = ? WHERE id = ?', [
    data.name, data.allocationCapPercent, data.bucket ?? null, id,
  ]);
  notifyChange();
}

/** Archive a category and all its items — history stays intact. */
export async function archiveCategory(id: string) {
  const row = await getCategory(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE expense_categories SET is_archived = 1 WHERE id = ?', [id]);
  await run('UPDATE expense_items SET is_archived = 1 WHERE category_id = ?', [id]);
  notifyChange();
}

// ── Items ─────────────────────────────────────────────────────────────────
export async function addItem(
  monthYear: string,
  categoryId: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean },
) {
  await assertUnlocked(monthYear);
  const c = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM expense_items WHERE category_id = ?',
    [categoryId],
  );
  await run(
    'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)',
    [makeId('E'), categoryId, monthYear, data.name, data.budgetCapCents, data.actualSpentCents, toInt(!!data.rolloverEnabled), c?.n ?? 0, Date.now()],
  );
  notifyChange();
}

export async function updateItem(
  id: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean },
) {
  const row = await getItem(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  if (data.rolloverEnabled !== undefined) {
    await run(
      'UPDATE expense_items SET name = ?, budget_cap_cents = ?, actual_spent_cents = ?, rollover_enabled = ? WHERE id = ?',
      [data.name, data.budgetCapCents, data.actualSpentCents, toInt(data.rolloverEnabled), id],
    );
  } else {
    await run('UPDATE expense_items SET name = ?, budget_cap_cents = ?, actual_spent_cents = ? WHERE id = ?', [
      data.name, data.budgetCapCents, data.actualSpentCents, id,
    ]);
  }
  notifyChange();
}

/** Quick inline edit of just the actual-spent figure. */
export async function setActualSpent(id: string, actualSpentCents: number) {
  const row = await getItem(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE expense_items SET actual_spent_cents = ? WHERE id = ?', [actualSpentCents, id]);
  notifyChange();
}

export async function archiveItem(id: string) {
  const row = await getItem(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE expense_items SET is_archived = 1 WHERE id = ?', [id]);
  notifyChange();
}

// ── Archived management (Settings) ─────────────────────────────────────────
export async function listArchived(monthYear: string): Promise<{
  items: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}> {
  const [items, categories] = await Promise.all([
    all<{ id: string; name: string }>(
      'SELECT id, name FROM expense_items WHERE month_year = ? AND is_archived = 1',
      [monthYear],
    ),
    all<{ id: string; name: string }>(
      'SELECT id, name FROM expense_categories WHERE month_year = ? AND is_archived = 1',
      [monthYear],
    ),
  ]);
  return { items, categories };
}

export async function restoreItem(id: string) {
  await run('UPDATE expense_items SET is_archived = 0 WHERE id = ?', [id]);
  notifyChange();
}

export async function restoreCategory(id: string) {
  await run('UPDATE expense_categories SET is_archived = 0 WHERE id = ?', [id]);
  notifyChange();
}

// ── Settings (key/value) ────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const row = await first<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  notifyChange();
}

const SAVINGS_TARGET_KEY = 'savings_target_cents';

export async function getSavingsTargetCents(): Promise<number> {
  const v = await getSetting(SAVINGS_TARGET_KEY);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function setSavingsTargetCents(cents: number): Promise<void> {
  await setSetting(SAVINGS_TARGET_KEY, String(Math.max(0, Math.round(cents))));
}

/** Non-archived categories for a month (for the expense-add picker). */
export async function listActiveCategories(monthYear: string): Promise<{ id: string; name: string }[]> {
  return all<{ id: string; name: string }>(
    'SELECT id, name FROM expense_categories WHERE month_year = ? AND is_archived = 0 ORDER BY sort_order ASC',
    [monthYear],
  );
}

// ── Month lifecycle ─────────────────────────────────────────────────────────
export async function lockMonth(monthYear: string) {
  await run('UPDATE months SET is_locked = 1 WHERE month_year = ?', [monthYear]);
  notifyChange();
}

export async function unlockMonth(monthYear: string) {
  await run('UPDATE months SET is_locked = 0 WHERE month_year = ?', [monthYear]);
  notifyChange();
}

/**
 * Copy the baseline of `fromMonth` into `toMonth` (defaults to next month):
 * duplicates non-archived categories + items, keeps budget caps, RESETS actuals
 * to 0, and carries smart-rollover credits/debts forward. Income is copied as a
 * starting point. Returns the created target month_year.
 */
export async function copyBaselineToNewMonth(
  fromMonth: string,
  toMonth: string = nextMonth(fromMonth),
): Promise<string> {
  const exists = await first('SELECT month_year FROM months WHERE month_year = ?', [toMonth]);
  if (exists) throw new Error(`Month ${toMonth} already exists.`);

  const income = await all<any>(
    'SELECT * FROM income_items WHERE month_year = ? AND is_archived = 0',
    [fromMonth],
  );
  const categories = await all<any>(
    'SELECT * FROM expense_categories WHERE month_year = ? AND is_archived = 0 ORDER BY sort_order ASC',
    [fromMonth],
  );

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [
      toMonth, Date.now(),
    ]);

    for (const inc of income) {
      await db.runAsync(
        'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [makeId('INC'), toMonth, inc.label, inc.category, inc.amount_cents, Date.now()],
      );
    }

    for (const cat of categories) {
      const newCatId = makeId('CAT');
      await db.runAsync(
        'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [newCatId, toMonth, cat.name, cat.allocation_cap_percent, cat.bucket ?? null, cat.sort_order, Date.now()],
      );
      const items = await db.getAllAsync<any>(
        'SELECT * FROM expense_items WHERE category_id = ? AND is_archived = 0 ORDER BY sort_order ASC',
        [cat.id],
      );
      for (const it of items) {
        const carry = rolloverCarry({
          id: it.id, name: it.name,
          budgetCapCents: it.budget_cap_cents, actualSpentCents: it.actual_spent_cents,
          rolloverEnabled: bool(it.rollover_enabled), rolloverCents: it.rollover_cents,
        });
        await db.runAsync(
          'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)',
          [makeId('E'), newCatId, toMonth, it.name, it.budget_cap_cents, toInt(bool(it.rollover_enabled)), carry, it.sort_order, Date.now()],
        );
      }
    }
  });

  notifyChange();
  return toMonth;
}
