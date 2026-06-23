// month_year helpers. Format is always "YYYY-MM".

export function currentMonthYear(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Add (or subtract) whole months to a "YYYY-MM" key. */
export function shiftMonth(monthYear: string, delta: number): string {
  const [y, m] = monthYear.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return currentMonthYear(date);
}

export function nextMonth(monthYear: string): string {
  return shiftMonth(monthYear, 1);
}

export function prevMonth(monthYear: string): string {
  return shiftMonth(monthYear, -1);
}

/** "2026-06" -> "Jun 2026" for display. */
export function formatMonthLabel(monthYear: string): string {
  const [y, m] = monthYear.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Short form "Jun" for the timeline banner. */
export function formatMonthShort(monthYear: string): string {
  const [y, m] = monthYear.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}
