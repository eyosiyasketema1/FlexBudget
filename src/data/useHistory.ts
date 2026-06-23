import { useEffect, useState, useCallback } from 'react';
import { onDataChange } from '@/db';
import { loadMonthSnapshot, listMonths } from './snapshot';
import type { MonthSnapshot } from '@/calc/types';

// Loads snapshots for every month in the DB (for runway analysis). Re-runs on
// any data change.
export function useAllMonthSnapshots(): { loading: boolean; snapshots: MonthSnapshot[] } {
  const [state, setState] = useState<{ loading: boolean; snapshots: MonthSnapshot[] }>({
    loading: true,
    snapshots: [],
  });

  const reload = useCallback(async () => {
    const months = await listMonths();
    const snaps = await Promise.all(months.map((m) => loadMonthSnapshot(m.monthYear)));
    setState({ loading: false, snapshots: snaps });
  }, []);

  useEffect(() => {
    reload();
    return onDataChange(reload);
  }, [reload]);

  return state;
}
