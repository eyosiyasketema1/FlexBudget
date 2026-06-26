import { all, first, run, getDb, makeId, bool, toInt, notifyChange } from '@/db';
import { nextMonth, currentPeriodKey } from '@/utils/date';
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

/**
 * Zero-based balancing: keep the budget total equal to income by adjusting the
 * Savings remainder. The "Savings" item in the savings bucket is auto-set to
 * income − (every other item's budget), so the plan always sums to income.
 * Does nothing if there's no such remainder item. Caller handles notifyChange.
 */
export async function rebalanceSavings(monthYear: string): Promise<void> {
  const remainderItem = await first<{ id: string }>(
    `SELECT ei.id FROM expense_items ei
       JOIN expense_categories ec ON ec.id = ei.category_id
      WHERE ei.month_year = ? AND ei.is_archived = 0 AND ei.name = 'Savings' AND ec.bucket = 'savings'
      ORDER BY ei.sort_order LIMIT 1`,
    [monthYear],
  );
  if (!remainderItem) return;

  const inc = await first<{ s: number }>(
    'SELECT COALESCE(SUM(amount_cents),0) AS s FROM income_items WHERE month_year = ? AND is_archived = 0',
    [monthYear],
  );
  const others = await first<{ s: number }>(
    'SELECT COALESCE(SUM(budget_cap_cents),0) AS s FROM expense_items WHERE month_year = ? AND is_archived = 0 AND id != ?',
    [monthYear, remainderItem.id],
  );
  const remainder = Math.max(0, (inc?.s ?? 0) - (others?.s ?? 0));
  await run('UPDATE expense_items SET budget_cap_cents = ? WHERE id = ?', [remainder, remainderItem.id]);
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
  rolloverEnabled: boolean; rolloverCents: number; isRecurring: boolean; monthYear: string;
}
export async function getItem(id: string): Promise<ItemRowDto | null> {
  const r = await first<any>('SELECT * FROM expense_items WHERE id = ?', [id]);
  return r ? {
    id: r.id, categoryId: r.category_id, name: r.name, budgetCapCents: r.budget_cap_cents, actualSpentCents: r.actual_spent_cents,
    rolloverEnabled: bool(r.rollover_enabled), rolloverCents: r.rollover_cents, isRecurring: bool(r.is_recurring), monthYear: r.month_year,
  } : null;
}

/** Recurring (fixed-bill) sub-categories in a period that haven't been paid yet. */
export interface UnpaidRecurringDto {
  id: string; name: string; categoryName: string; budgetCapCents: number;
}
export async function listUnpaidRecurring(monthYear: string): Promise<UnpaidRecurringDto[]> {
  const rows = await all<any>(
    `SELECT i.id, i.name, i.budget_cap_cents, c.name AS category_name
       FROM expense_items i
       JOIN expense_categories c ON c.id = i.category_id
      WHERE i.month_year = ? AND i.is_recurring = 1 AND i.is_archived = 0
        AND i.actual_spent_cents = 0
      ORDER BY i.sort_order`,
    [monthYear],
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, categoryName: r.category_name, budgetCapCents: r.budget_cap_cents,
  }));
}

/** Move a sub-category (item) to a different main category. */
export async function moveItemToCategory(itemId: string, newCategoryId: string) {
  const row = await getItem(itemId);
  if (!row || row.categoryId === newCategoryId) return;
  await assertUnlocked(row.monthYear);
  const cnt = await first<{ n: number }>('SELECT COUNT(*) AS n FROM expense_items WHERE category_id = ?', [newCategoryId]);
  await run('UPDATE expense_items SET category_id = ?, sort_order = ? WHERE id = ?', [newCategoryId, cnt?.n ?? 0, itemId]);
  await rebalanceSavings(row.monthYear);
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
  await rebalanceSavings(monthYear);
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
  await rebalanceSavings(row.monthYear);
  notifyChange();
}

export async function archiveIncome(id: string) {
  const row = await getIncome(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE income_items SET is_archived = 1 WHERE id = ?', [id]);
  await rebalanceSavings(row.monthYear);
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
  await rebalanceSavings(row.monthYear);
  notifyChange();
}

// ── Items ─────────────────────────────────────────────────────────────────
export async function addItem(
  monthYear: string,
  categoryId: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean; isRecurring?: boolean },
) {
  await assertUnlocked(monthYear);
  const c = await first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM expense_items WHERE category_id = ?',
    [categoryId],
  );
  await run(
    'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_recurring, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)',
    [makeId('E'), categoryId, monthYear, data.name, data.budgetCapCents, data.actualSpentCents, toInt(!!data.rolloverEnabled), toInt(!!data.isRecurring), c?.n ?? 0, Date.now()],
  );
  await rebalanceSavings(monthYear);
  notifyChange();
}

export async function updateItem(
  id: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean; isRecurring?: boolean },
) {
  const row = await getItem(id);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run('UPDATE expense_items SET name = ?, budget_cap_cents = ?, actual_spent_cents = ? WHERE id = ?', [
    data.name, data.budgetCapCents, data.actualSpentCents, id,
  ]);
  if (data.rolloverEnabled !== undefined) {
    await run('UPDATE expense_items SET rollover_enabled = ? WHERE id = ?', [toInt(data.rolloverEnabled), id]);
  }
  if (data.isRecurring !== undefined) {
    await run('UPDATE expense_items SET is_recurring = ? WHERE id = ?', [toInt(data.isRecurring), id]);
  }
  await rebalanceSavings(row.monthYear);
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
  await rebalanceSavings(row.monthYear);
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

// ── Confirmed savings (per period) ────────────────────────────────────────
/** Total confirmed savings across all periods. */
export async function getTotalSaved(): Promise<number> {
  const r = await first<{ s: number }>('SELECT COALESCE(SUM(saved_cents),0) AS s FROM months WHERE saved_cents IS NOT NULL');
  return r?.s ?? 0;
}

/** Record the amount actually saved for a period (confirms it). */
export async function setMonthSaved(monthYear: string, cents: number): Promise<void> {
  await run('UPDATE months SET saved_cents = ? WHERE month_year = ?', [Math.max(0, Math.round(cents)), monthYear]);
  notifyChange();
}

export interface EndedPeriod { monthYear: string; plannedCents: number }

/** Past periods (already ended) that haven't had their savings confirmed yet. */
export async function endedUnconfirmedPeriods(today: Date = new Date()): Promise<EndedPeriod[]> {
  const cur = currentPeriodKey(today);
  const rows = await all<{ month_year: string }>(
    'SELECT month_year FROM months WHERE saved_cents IS NULL ORDER BY month_year ASC',
  );
  const result: EndedPeriod[] = [];
  for (const r of rows) {
    if (r.month_year >= cur) continue; // current or future period — not ended yet
    const planned = await first<{ s: number }>(
      `SELECT COALESCE(SUM(ei.budget_cap_cents),0) AS s FROM expense_items ei
         JOIN expense_categories ec ON ec.id = ei.category_id
        WHERE ei.month_year = ? AND ei.is_archived = 0 AND ec.bucket = 'savings'`,
      [r.month_year],
    );
    result.push({ monthYear: r.month_year, plannedCents: planned?.s ?? 0 });
  }
  return result;
}

const CYCLE_KEY = 'cycle_start_day';
export async function getCycleStartDayStored(): Promise<number> {
  const v = await getSetting(CYCLE_KEY);
  const n = v ? parseInt(v, 10) : 1;
  return Number.isFinite(n) && n >= 1 && n <= 28 ? n : 1;
}
export async function setCycleStartDayStored(day: number): Promise<void> {
  await setSetting(CYCLE_KEY, String(Math.min(28, Math.max(1, Math.floor(day) || 1))));
}

const REMINDERS_KEY = 'reminders_enabled';
export async function getRemindersEnabled(): Promise<boolean> {
  return (await getSetting(REMINDERS_KEY)) === '1';
}
export async function setRemindersEnabled(on: boolean): Promise<void> {
  await setSetting(REMINDERS_KEY, on ? '1' : '0');
}

const SMS_KEY = 'sms_capture_enabled';
export async function getSmsCaptureEnabled(): Promise<boolean> {
  return (await getSetting(SMS_KEY)) === '1';
}
export async function setSmsCaptureEnabled(on: boolean): Promise<void> {
  await setSetting(SMS_KEY, on ? '1' : '0');
}

const CALENDAR_KEY = 'calendar_system';
export async function getCalendarSystem(): Promise<'gregorian' | 'ethiopian'> {
  return (await getSetting(CALENDAR_KEY)) === 'ethiopian' ? 'ethiopian' : 'gregorian';
}
export async function setCalendarSystem(c: 'gregorian' | 'ethiopian'): Promise<void> {
  await setSetting(CALENDAR_KEY, c);
}

const SMS_LAST_SCAN_KEY = 'sms_last_scan';
export async function getSmsLastScan(): Promise<number> {
  const v = await getSetting(SMS_LAST_SCAN_KEY);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
export async function setSmsLastScan(ms: number): Promise<void> {
  await setSetting(SMS_LAST_SCAN_KEY, String(Math.floor(ms)));
}

// ── Pending SMS-captured transactions (await user confirmation) ───────────────
export interface PendingSms { id: string; body: string; amountCents: number; kind: string; createdAt: number; }

export async function addPendingSms(body: string, amountCents: number, kind: string): Promise<void> {
  // Skip duplicates (same message captured twice by a re-scan).
  const dup = await first<{ id: string }>(
    'SELECT id FROM pending_sms WHERE body = ? AND amount_cents = ?',
    [body, amountCents],
  );
  if (dup) return;
  await run(
    'INSERT INTO pending_sms (id, body, amount_cents, kind, created_at) VALUES (?, ?, ?, ?, ?)',
    [makeId('SMS'), body, amountCents, kind, Date.now()],
  );
  notifyChange();
}

export async function listPendingSms(): Promise<PendingSms[]> {
  const rows = await all<any>('SELECT * FROM pending_sms ORDER BY created_at DESC');
  return rows.map((r) => ({ id: r.id, body: r.body, amountCents: r.amount_cents, kind: r.kind, createdAt: r.created_at }));
}

export async function dismissPendingSms(id: string): Promise<void> {
  await run('DELETE FROM pending_sms WHERE id = ?', [id]);
  notifyChange();
}

/** Confirm a captured SMS: log it against a sub-category, then clear it. */
export async function confirmPendingSms(smsId: string, itemId: string, amountCents: number): Promise<void> {
  await recordExpense(itemId, amountCents, 'Captured from SMS');
  await run('DELETE FROM pending_sms WHERE id = ?', [smsId]);
  notifyChange();
}

/** Non-archived categories for a month (for the expense-add picker). */
export async function listActiveCategories(monthYear: string): Promise<{ id: string; name: string }[]> {
  return all<{ id: string; name: string }>(
    'SELECT id, name FROM expense_categories WHERE month_year = ? AND is_archived = 0 ORDER BY sort_order ASC',
    [monthYear],
  );
}

// ── Recording payments (expense entries / ledger) ─────────────────────────
export interface SubcategoryRow {
  id: string; name: string; categoryId: string; categoryName: string; bucket: string | null;
}

/** All sub-categories for a month, with their main category (for the picker). */
export async function listSubcategories(monthYear: string): Promise<SubcategoryRow[]> {
  const rows = await all<any>(
    `SELECT ei.id, ei.name, ei.category_id AS categoryId, ec.name AS categoryName, ec.bucket AS bucket
       FROM expense_items ei JOIN expense_categories ec ON ec.id = ei.category_id
      WHERE ei.month_year = ? AND ei.is_archived = 0 AND ec.is_archived = 0
      ORDER BY ec.sort_order, ei.sort_order`,
    [monthYear],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, categoryId: r.categoryId, categoryName: r.categoryName, bucket: r.bucket ?? null }));
}

/** Record a payment against a sub-category: logs it and adds to actual spent. */
export async function recordExpense(itemId: string, amountCents: number, reason?: string) {
  const row = await getItem(itemId);
  if (!row) return;
  await assertUnlocked(row.monthYear);
  await run(
    'INSERT INTO expense_entries (id, item_id, month_year, amount_cents, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [makeId('TX'), itemId, row.monthYear, amountCents, reason?.trim() || null, Date.now()],
  );
  await run('UPDATE expense_items SET actual_spent_cents = actual_spent_cents + ? WHERE id = ?', [amountCents, itemId]);
  notifyChange();
}

export interface ExpenseEntry { id: string; amountCents: number; reason: string | null; createdAt: number; }
export async function listExpenseEntries(itemId: string): Promise<ExpenseEntry[]> {
  const rows = await all<any>('SELECT * FROM expense_entries WHERE item_id = ? ORDER BY created_at DESC', [itemId]);
  return rows.map((r) => ({ id: r.id, amountCents: r.amount_cents, reason: r.reason, createdAt: r.created_at }));
}

/** Delete a recorded payment and subtract it back out of the item's spend. */
export async function deleteExpenseEntry(entryId: string) {
  const e = await first<{ item_id: string; amount_cents: number; month_year: string }>(
    'SELECT item_id, amount_cents, month_year FROM expense_entries WHERE id = ?',
    [entryId],
  );
  if (!e) return;
  await assertUnlocked(e.month_year);
  await run('UPDATE expense_items SET actual_spent_cents = max(0, actual_spent_cents - ?) WHERE id = ?', [e.amount_cents, e.item_id]);
  await run('DELETE FROM expense_entries WHERE id = ?', [entryId]);
  notifyChange();
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
          'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_recurring, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?)',
          [makeId('E'), newCatId, toMonth, it.name, it.budget_cap_cents, toInt(bool(it.rollover_enabled)), carry, toInt(bool(it.is_recurring)), it.sort_order, Date.now()],
        );
      }
    }
  });

  await rebalanceSavings(toMonth);
  notifyChange();
  return toMonth;
}
