import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { currentMonthYear } from '@/utils/date';

interface ActiveMonthValue {
  activeMonth: string; // "YYYY-MM"
  setActiveMonth: (monthYear: string) => void;
}

const Ctx = createContext<ActiveMonthValue | undefined>(undefined);

export function ActiveMonthProvider({ children }: { children: React.ReactNode }) {
  const [activeMonth, setActiveMonth] = useState(currentMonthYear());
  const set = useCallback((m: string) => setActiveMonth(m), []);
  const value = useMemo(() => ({ activeMonth, setActiveMonth: set }), [activeMonth, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveMonth(): ActiveMonthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveMonth must be used within ActiveMonthProvider');
  return v;
}
