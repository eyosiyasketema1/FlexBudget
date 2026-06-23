import { database, collections } from './index';
import { currentMonthYear } from '@/utils/date';

// Ensures the app always opens onto a real month. On very first launch we
// seed the current month with the spec's sample data so the UI isn't empty.
export async function ensureSeeded(): Promise<void> {
  const existing = await collections.months.query().fetchCount();
  if (existing > 0) return;

  const my = currentMonthYear();

  await database.write(async () => {
    await collections.months.create((m) => {
      m.monthYear = my;
      m.isLocked = false;
    });

    await collections.income.create((i) => {
      i.monthYear = my;
      i.label = 'Monthly Salary';
      i.category = 'Primary Job';
      i.amountCents = 3_500_000;
      i.isArchived = false;
    });
    await collections.income.create((i) => {
      i.monthYear = my;
      i.label = 'Side Freelance';
      i.category = 'Side Hustle';
      i.amountCents = 250_000;
      i.isArchived = false;
    });

    const essentials = await collections.categories.create((c) => {
      c.monthYear = my;
      c.name = 'Essentials';
      c.allocationCapPercent = 60;
      c.bucket = 'needs';
      c.isArchived = false;
      c.sortOrder = 0;
    });
    const lifestyle = await collections.categories.create((c) => {
      c.monthYear = my;
      c.name = 'Lifestyle';
      c.allocationCapPercent = 20;
      c.bucket = 'wants';
      c.isArchived = false;
      c.sortOrder = 1;
    });

    const items: Array<[string, number, number, number]> = [
      // categoryId, budgetCap, actualSpent, sortOrder
    ];
    const make = (
      categoryId: string,
      name: string,
      cap: number,
      actual: number,
      order: number,
    ) =>
      collections.items.create((it) => {
        it.categoryId = categoryId;
        it.monthYear = my;
        it.name = name;
        it.budgetCapCents = cap;
        it.actualSpentCents = actual;
        it.rolloverEnabled = false;
        it.rolloverCents = 0;
        it.isArchived = false;
        it.sortOrder = order;
      });

    await make(essentials.id, 'Rent', 1_400_000, 1_400_000, 0);
    await make(essentials.id, 'Electric', 80_000, 82_000, 1);
    await make(essentials.id, 'Internet', 130_000, 130_000, 2);
    await make(lifestyle.id, 'Date', 300_000, 120_000, 0);
    await make(lifestyle.id, 'Coffee', 100_000, 115_000, 1);

    void items;
  });
}
