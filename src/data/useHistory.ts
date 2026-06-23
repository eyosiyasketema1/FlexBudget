import { useEffect, useState } from 'react';
import { collections } from '@/db';
import { loadMonthSnapshot } from './snapshot';
import type { MonthSnapshot } from '@/calc/types';

// Loads snapshots for every month in the DB (for runway analysis). Re-runs
// when the months collection changes.
export function useAllMonthSnapshots(): { loading: boolean; snapshots: MonthSnapshot[] } {
  const [state, setState] = useState<{ loading: boolean; snapshots: MonthSnapshot[] }>({
    loading: true,
    snapshots: [],
  });

  useEffect(() => {
    const sub = collections.months.query().observe().subscribe(async (months) => {
      const keys = months.map((m) => m.monthYear).sort();
      const snaps = await Promise.all(keys.map(loadMonthSnapshot));
      setState({ loading: false, snapshots: snaps });
    });
    return () => sub.unsubscribe();
  }, []);

  return state;
}
