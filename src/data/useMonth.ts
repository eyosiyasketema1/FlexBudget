import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { combineLatest } from 'rxjs';
import { collections } from '@/db';
import { loadMonthSnapshot } from './snapshot';
import { computeTotals, rollupMonth } from '@/calc/engine';
import type { MonthSnapshot, MonthTotals, CategoryRollup } from '@/calc/types';

export interface MonthView {
  loading: boolean;
  isLocked: boolean;
  snapshot: MonthSnapshot | null;
  totals: MonthTotals | null;
  rollups: CategoryRollup[];
}

const EMPTY: MonthView = {
  loading: true,
  isLocked: false,
  snapshot: null,
  totals: null,
  rollups: [],
};

/**
 * Observes every table relevant to `monthYear`. Any insert/update/archive
 * re-emits, we rebuild the snapshot and re-run the pure engine — that's the
 * "real-time calculation matrix" with no manual recompute.
 */
export function useMonth(monthYear: string): MonthView {
  const [view, setView] = useState<MonthView>(EMPTY);

  useEffect(() => {
    setView((v) => ({ ...v, loading: true }));

    const income$ = collections.income
      .query(Q.where('month_year', monthYear))
      .observeWithColumns(['amount_cents', 'is_archived', 'label', 'category']);
    const cats$ = collections.categories
      .query(Q.where('month_year', monthYear))
      .observeWithColumns(['name', 'allocation_cap_percent', 'is_archived', 'sort_order']);
    const items$ = collections.items
      .query(Q.where('month_year', monthYear))
      .observeWithColumns(['budget_cap_cents', 'actual_spent_cents', 'is_archived', 'sort_order', 'name']);
    const month$ = collections.months
      .query(Q.where('month_year', monthYear))
      .observeWithColumns(['is_locked']);

    const sub = combineLatest([income$, cats$, items$, month$]).subscribe(
      async ([, , , months]) => {
        const snapshot = await loadMonthSnapshot(monthYear);
        setView({
          loading: false,
          isLocked: months[0]?.isLocked ?? false,
          snapshot,
          totals: computeTotals(snapshot),
          rollups: rollupMonth(snapshot),
        });
      },
    );

    return () => sub.unsubscribe();
  }, [monthYear]);

  return view;
}
