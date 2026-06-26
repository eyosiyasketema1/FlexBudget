import { useCallback, useEffect, useState } from 'react';
import { onDataChange } from '@/db';
import { useActiveMonth } from '@/state/ActiveMonthContext';
import { listPendingSms, listUnpaidRecurring, endedUnconfirmedPeriods } from '@/data/repository';

export interface PendingConfirmations {
  sms: number;
  recurring: number;
  savings: number;
  total: number;
}

const EMPTY: PendingConfirmations = { sms: 0, recurring: 0, savings: 0, total: 0 };

/**
 * Live count of everything awaiting the user's confirmation: SMS-captured
 * transactions, unpaid recurring bills this period, and ended budget periods
 * whose savings haven't been confirmed. Re-reads on any data change.
 */
export function usePendingConfirmations(): PendingConfirmations {
  const { activeMonth } = useActiveMonth();
  const [counts, setCounts] = useState<PendingConfirmations>(EMPTY);

  const load = useCallback(async () => {
    const [sms, recurring, savings] = await Promise.all([
      listPendingSms(),
      listUnpaidRecurring(activeMonth),
      endedUnconfirmedPeriods(),
    ]);
    setCounts({
      sms: sms.length,
      recurring: recurring.length,
      savings: savings.length,
      total: sms.length + recurring.length + savings.length,
    });
  }, [activeMonth]);

  useEffect(() => {
    load();
    return onDataChange(load);
  }, [load]);

  return counts;
}
