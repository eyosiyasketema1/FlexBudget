import { Q } from '@nozbe/watermelondb';
import { database, collections } from '@/db';
import { nextMonth } from '@/utils/date';
import { rolloverCarry } from '@/calc/engine';
import type { Bucket } from '@/calc/types';

// All writes go through here so behavior (archiving, locking, month-copy) is
// consistent and transactional. Nothing hard-deletes user financial data.

async function assertUnlocked(monthYear: string): Promise<void> {
  const month = await collections.months
    .query(Q.where('month_year', monthYear))
    .fetch();
  if (month[0]?.isLocked) {
    throw new Error(`Month ${monthYear} is locked and cannot be edited.`);
  }
}

export async function ensureMonth(monthYear: string): Promise<void> {
  const count = await collections.months
    .query(Q.where('month_year', monthYear))
    .fetchCount();
  if (count > 0) return;
  await database.write(async () => {
    await collections.months.create((m) => {
      m.monthYear = monthYear;
      m.isLocked = false;
    });
  });
}

// ── Income ────────────────────────────────────────────────────────────────
export async function addIncome(
  monthYear: string,
  data: { label: string; category: string; amountCents: number },
) {
  await assertUnlocked(monthYear);
  await database.write(async () => {
    await collections.income.create((i) => {
      i.monthYear = monthYear;
      i.label = data.label;
      i.category = data.category;
      i.amountCents = data.amountCents;
      i.isArchived = false;
    });
  });
}

export async function updateIncome(
  id: string,
  data: { label: string; category: string; amountCents: number },
) {
  const row = await collections.income.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((i) => {
      i.label = data.label;
      i.category = data.category;
      i.amountCents = data.amountCents;
    });
  });
}

export async function archiveIncome(id: string) {
  const row = await collections.income.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((i) => {
      i.isArchived = true;
    });
  });
}

// ── Categories ──────────────────────────────────────────────────────────
export async function addCategory(
  monthYear: string,
  data: { name: string; allocationCapPercent: number | null; bucket?: Bucket | null },
) {
  await assertUnlocked(monthYear);
  const count = await collections.categories
    .query(Q.where('month_year', monthYear))
    .fetchCount();
  await database.write(async () => {
    await collections.categories.create((c) => {
      c.monthYear = monthYear;
      c.name = data.name;
      c.allocationCapPercent = data.allocationCapPercent;
      c.bucket = data.bucket ?? null;
      c.isArchived = false;
      c.sortOrder = count;
    });
  });
}

export async function updateCategory(
  id: string,
  data: { name: string; allocationCapPercent: number | null; bucket?: Bucket | null },
) {
  const row = await collections.categories.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((c) => {
      c.name = data.name;
      c.allocationCapPercent = data.allocationCapPercent;
      c.bucket = data.bucket ?? null;
    });
  });
}

/** Archive a category and all its items — history stays intact. */
export async function archiveCategory(id: string) {
  const cat = await collections.categories.find(id);
  await assertUnlocked(cat.monthYear);
  const items = await collections.items
    .query(Q.where('category_id', id))
    .fetch();
  await database.write(async () => {
    const batch = [
      cat.prepareUpdate((c) => {
        c.isArchived = true;
      }),
      ...items.map((it) =>
        it.prepareUpdate((i) => {
          i.isArchived = true;
        }),
      ),
    ];
    await database.batch(...batch);
  });
}

// ── Items ─────────────────────────────────────────────────────────────────
export async function addItem(
  monthYear: string,
  categoryId: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean },
) {
  await assertUnlocked(monthYear);
  const count = await collections.items
    .query(Q.where('category_id', categoryId))
    .fetchCount();
  await database.write(async () => {
    await collections.items.create((it) => {
      it.categoryId = categoryId;
      it.monthYear = monthYear;
      it.name = data.name;
      it.budgetCapCents = data.budgetCapCents;
      it.actualSpentCents = data.actualSpentCents;
      it.rolloverEnabled = data.rolloverEnabled ?? false;
      it.rolloverCents = 0;
      it.isArchived = false;
      it.sortOrder = count;
    });
  });
}

export async function updateItem(
  id: string,
  data: { name: string; budgetCapCents: number; actualSpentCents: number; rolloverEnabled?: boolean },
) {
  const row = await collections.items.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((it) => {
      it.name = data.name;
      it.budgetCapCents = data.budgetCapCents;
      it.actualSpentCents = data.actualSpentCents;
      if (data.rolloverEnabled !== undefined) it.rolloverEnabled = data.rolloverEnabled;
    });
  });
}

/** Quick inline edit of just the actual-spent figure (the common case). */
export async function setActualSpent(id: string, actualSpentCents: number) {
  const row = await collections.items.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((it) => {
      it.actualSpentCents = actualSpentCents;
    });
  });
}

export async function archiveItem(id: string) {
  const row = await collections.items.find(id);
  await assertUnlocked(row.monthYear);
  await database.write(async () => {
    await row.update((it) => {
      it.isArchived = true;
    });
  });
}

// ── Month lifecycle (Phase 2) ──────────────────────────────────────────────

/** Lock a month read-only ("close out"). */
export async function lockMonth(monthYear: string) {
  const month = await collections.months
    .query(Q.where('month_year', monthYear))
    .fetch();
  if (!month[0]) return;
  await database.write(async () => {
    await month[0].update((m) => {
      m.isLocked = true;
    });
  });
}

export async function unlockMonth(monthYear: string) {
  const month = await collections.months
    .query(Q.where('month_year', monthYear))
    .fetch();
  if (!month[0]) return;
  await database.write(async () => {
    await month[0].update((m) => {
      m.isLocked = false;
    });
  });
}

/**
 * Copy the baseline of `fromMonth` into `toMonth` (defaults to the next month):
 * duplicates non-archived categories + items, keeps budget caps, RESETS actuals
 * to 0. Income labels/categories/amounts are copied as a starting point.
 * Returns the created target month_year.
 */
export async function copyBaselineToNewMonth(
  fromMonth: string,
  toMonth: string = nextMonth(fromMonth),
): Promise<string> {
  const exists = await collections.months
    .query(Q.where('month_year', toMonth))
    .fetchCount();
  if (exists > 0) {
    throw new Error(`Month ${toMonth} already exists.`);
  }

  const [income, categories] = await Promise.all([
    collections.income
      .query(Q.where('month_year', fromMonth), Q.where('is_archived', false))
      .fetch(),
    collections.categories
      .query(Q.where('month_year', fromMonth), Q.where('is_archived', false))
      .fetch(),
  ]);

  await database.write(async () => {
    await collections.months.create((m) => {
      m.monthYear = toMonth;
      m.isLocked = false;
    });

    for (const inc of income) {
      await collections.income.create((i) => {
        i.monthYear = toMonth;
        i.label = inc.label;
        i.category = inc.category;
        i.amountCents = inc.amountCents;
        i.isArchived = false;
      });
    }

    for (const cat of categories) {
      const newCat = await collections.categories.create((c) => {
        c.monthYear = toMonth;
        c.name = cat.name;
        c.allocationCapPercent = cat.allocationCapPercent;
        c.isArchived = false;
        c.sortOrder = cat.sortOrder;
      });
      const items = await collections.items
        .query(Q.where('category_id', cat.id), Q.where('is_archived', false))
        .fetch();
      for (const it of items) {
        // Smart rollover: opt-in items carry their unspent (or overspend)
        // into the new month as a starting credit/debt.
        const carry = rolloverCarry({
          id: it.id,
          name: it.name,
          budgetCapCents: it.budgetCapCents,
          actualSpentCents: it.actualSpentCents,
          rolloverEnabled: it.rolloverEnabled,
          rolloverCents: it.rolloverCents,
        });
        await collections.items.create((ni) => {
          ni.categoryId = newCat.id;
          ni.monthYear = toMonth;
          ni.name = it.name;
          ni.budgetCapCents = it.budgetCapCents;
          ni.actualSpentCents = 0; // reset actuals for the fresh month
          ni.rolloverEnabled = it.rolloverEnabled;
          ni.rolloverCents = carry;
          ni.isArchived = false;
          ni.sortOrder = it.sortOrder;
        });
      }
    }
  });

  return toMonth;
}
