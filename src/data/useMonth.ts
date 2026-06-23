import { useEffect, useState, useCallback } from 'react';
import { onDataChange } from '@/db';
import { loadMonthSnapshot, isMonthLocked } from './snapshot';
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
 * Loads a month and recomputes the calc matrix. Subscribes to data-change
 * events so any insert/update/archive re-runs the pure engine — the same
 * "real-time matrix" behavior, now driven by an event bus instead of
 * WatermelonDB observables.
 */
export function useMonth(monthYear: string): MonthView {
  const [view, setView] = useState<MonthView>(EMPTY);

  const reload = useCallback(async () => {
    const [snapshot, locked] = await Promise.all([
      loadMonthSnapshot(monthYear),
      isMonthLocked(monthYear),
    ]);
    setView({
      loading: false,
      isLocked: locked,
      snapshot,
      totals: computeTotals(snapshot),
      rollups: rollupMonth(snapshot),
    });
  }, [monthYear]);

  useEffect(() => {
    setView((v) => ({ ...v, loading: true }));
    reload();
    return onDataChange(reload);
  }, [reload]);

  return view;
}
