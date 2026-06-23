import { getDb, first, makeId } from '@/db';
import { currentMonthYear } from '@/utils/date';

// Ensures the app always opens onto a real month. On first launch we seed the
// current month with the spec's sample data so the UI isn't empty.
export async function ensureSeeded(): Promise<void> {
  const existing = await first<{ n: number }>('SELECT COUNT(*) AS n FROM months');
  if ((existing?.n ?? 0) > 0) return;

  const my = currentMonthYear();
  const now = Date.now();
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO months (month_year, is_locked, created_at) VALUES (?, 0, ?)', [my, now]);

    const income: [string, string, number][] = [
      ['Monthly Salary', 'Primary Job', 3_500_000],
      ['Side Freelance', 'Side Hustle', 250_000],
    ];
    for (const [label, category, amt] of income) {
      await db.runAsync(
        'INSERT INTO income_items (id, month_year, label, category, amount_cents, is_archived, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [makeId('INC'), my, label, category, amt, now],
      );
    }

    const cats: [string, number, string, number][] = [
      // name, cap, bucket, sortOrder
      ['Essentials', 60, 'needs', 0],
      ['Lifestyle', 20, 'wants', 1],
    ];
    const catIds: Record<string, string> = {};
    for (const [name, cap, bucket, order] of cats) {
      const id = makeId('CAT');
      catIds[name] = id;
      await db.runAsync(
        'INSERT INTO expense_categories (id, month_year, name, allocation_cap_percent, bucket, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
        [id, my, name, cap, bucket, order, now],
      );
    }

    const items: [string, string, number, number, number, number][] = [
      // catName, name, budget, actual, rolloverEnabled, sortOrder
      ['Essentials', 'Rent', 1_400_000, 1_400_000, 0, 0],
      ['Essentials', 'Electric', 80_000, 82_000, 0, 1],
      ['Essentials', 'Internet', 130_000, 130_000, 0, 2],
      ['Lifestyle', 'Date', 300_000, 120_000, 0, 0],
      ['Lifestyle', 'Coffee', 100_000, 115_000, 1, 1],
    ];
    for (const [catName, name, budget, actual, roll, order] of items) {
      await db.runAsync(
        'INSERT INTO expense_items (id, category_id, month_year, name, budget_cap_cents, actual_spent_cents, rollover_enabled, rollover_cents, is_archived, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)',
        [makeId('E'), catIds[catName], my, name, budget, actual, roll, order, now],
      );
    }
  });
}
